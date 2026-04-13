import type {
  DragonHeadMarket,
  DragonHeadProviderStatus,
  DragonHeadSettings,
} from '@/lib/contracts/dragon-head';
import type { LimitUpStock, TdxScanRequest } from '@/lib/contracts/strategy';
import { filterLimitUpStocks } from '@/lib/services/limit-up';
import { scanTdxSignals } from '@/lib/services/tdx-scan';

type QuoteFactorInput = {
  latestPrice: number;
  latestChangePct: number | null;
  volumeRatio: number | null;
  speed10m: number | null;
  sealRatio: number | null;
  breakoutFreq: number | null;
};

export type DragonHeadCandidateInput = {
  stockCode: string;
  stockName: string;
  market: DragonHeadMarket;
  sector?: string | null;
  latestPrice: number;
  latestChangePct: number | null;
  boardChangePct: number | null;
  volumeRatio: number | null;
  speed10m: number | null;
  sealRatio: number | null;
  breakoutFreq: number | null;
  limitUpCount?: number;
  signalTags: string[];
  reviewFlags: string[];
};

export type DragonHeadProviderSnapshot = {
  asOf: string;
  candidates: DragonHeadCandidateInput[];
  sourceStatus: DragonHeadProviderStatus[];
};

export interface IntradayQuoteProvider {
  getQuotes(): Promise<{
    candidates: Map<string, QuoteFactorInput & {
      stockCode: string;
      stockName: string;
      market: DragonHeadMarket;
      signalTags: string[];
    }>;
    status: DragonHeadProviderStatus;
  }>;
}

export interface OrderBookProvider {
  getOrderBook(): Promise<{
    sealRatios: Map<string, number>;
    status: DragonHeadProviderStatus;
  }>;
}

export interface SectorBreadthProvider {
  getBreadth(): Promise<{
    sectors: Map<string, { sector?: string; limitUpCount?: number; latestPrice: number }>;
    limitUps: LimitUpStock[];
    status: DragonHeadProviderStatus;
  }>;
}

export interface ThemeFlowProvider {
  getThemeFlow(): Promise<{
    turnoverGrowthPctBySector: Map<string, number>;
    status: DragonHeadProviderStatus;
  }>;
}

export interface DragonHeadMarketProvider {
  getSnapshot(config: DragonHeadSettings): Promise<DragonHeadProviderSnapshot>;
}

function createUnavailableStatus(
  provider: DragonHeadProviderStatus['provider'],
  asOf: string,
  degradedReason: string,
): DragonHeadProviderStatus {
  return {
    provider,
    asOf,
    source: 'unavailable',
    available: false,
    degradedReason,
  };
}

function groupAverage(values: DragonHeadCandidateInput[]) {
  const grouped = new Map<string, { total: number; count: number }>();

  values.forEach((item) => {
    if (!item.sector || item.latestChangePct === null) {
      return;
    }

    const current = grouped.get(item.sector) ?? { total: 0, count: 0 };
    grouped.set(item.sector, {
      total: current.total + item.latestChangePct,
      count: current.count + 1,
    });
  });

  const average = new Map<string, number>();
  grouped.forEach((value, key) => {
    average.set(key, value.count === 0 ? 0 : value.total / value.count);
  });

  return average;
}

function createLiveIntradayQuoteProvider(): IntradayQuoteProvider {
  return {
    async getQuotes() {
      const asOf = new Date().toISOString();
      const request: TdxScanRequest = {
        signalType: 'both',
        page: 1,
        pageSize: 8,
        minSignalStrength: 0,
      };
      const payload = await scanTdxSignals(request);
      const candidates = new Map(
        payload.items.map((item) => [
          item.stockCode,
          {
            stockCode: item.stockCode,
            stockName: item.stockName,
            market: item.market,
            latestPrice: item.closePrice,
            latestChangePct: item.trueCGain,
            volumeRatio: item.volumeRatio,
            speed10m: null,
            sealRatio: null,
            breakoutFreq: null,
            signalTags: [
              item.meiYangYang ? '美阳阳共振' : '通达信信号',
              item.meiZhu ? '美柱' : '趋势延续',
            ],
          },
        ]),
      );

      return {
        candidates,
        status: {
          provider: 'intradayQuote',
          asOf,
          source: 'tdx_daily_proxy',
          available: true,
          degradedReason: '量比与涨幅来自日线代理，10分钟涨速尚未接入实时分时。',
        },
      };
    },
  };
}

function createUnavailableOrderBookProvider(): OrderBookProvider {
  return {
    async getOrderBook() {
      const asOf = new Date().toISOString();

      return {
        sealRatios: new Map(),
        status: createUnavailableStatus('orderBook', asOf, '盘口买一金额数据尚未接入。'),
      };
    },
  };
}

function createLiveSectorBreadthProvider(): SectorBreadthProvider {
  return {
    async getBreadth() {
      const asOf = new Date().toISOString();
      const payload = await filterLimitUpStocks({
        lookbackDays: 30,
        minLimitUpCount: 1,
        excludeST: true,
        excludeKechuang: false,
        excludeNewStock: true,
        page: 1,
        pageSize: 8,
        sortBy: 'limitUpCount',
        sortOrder: 'desc',
      });

      return {
        sectors: new Map(
          payload.items.map((item) => [
            item.stockCode,
            {
              sector: item.sector,
              limitUpCount: item.limitUpCount,
              latestPrice: item.latestClose,
            },
          ]),
        ),
        limitUps: payload.items,
        status: {
          provider: 'sectorBreadth',
          asOf,
          source: 'limit_up_sector_proxy',
          available: true,
          degradedReason: '板块带动比使用涨停样本与日线代理数据估算。',
        },
      };
    },
  };
}

function createUnavailableThemeFlowProvider(): ThemeFlowProvider {
  return {
    async getThemeFlow() {
      const asOf = new Date().toISOString();

      return {
        turnoverGrowthPctBySector: new Map(),
        status: createUnavailableStatus(
          'themeFlow',
          asOf,
          '题材成交额增速尚未接入实时资金流数据源。',
        ),
      };
    },
  };
}

export function createDragonHeadMarketProvider(): DragonHeadMarketProvider {
  const quoteProvider = createLiveIntradayQuoteProvider();
  const orderBookProvider = createUnavailableOrderBookProvider();
  const sectorProvider = createLiveSectorBreadthProvider();
  const themeFlowProvider = createUnavailableThemeFlowProvider();

  return {
    async getSnapshot() {
      const asOf = new Date().toISOString();
      const [quoteResult, orderBookResult, sectorResult, themeFlowResult] =
        await Promise.allSettled([
          quoteProvider.getQuotes(),
          orderBookProvider.getOrderBook(),
          sectorProvider.getBreadth(),
          themeFlowProvider.getThemeFlow(),
        ]);

      const sourceStatus: DragonHeadProviderStatus[] = [];
      const quoteCandidates =
        quoteResult.status === 'fulfilled' ? quoteResult.value.candidates : new Map();
      const sealRatios =
        orderBookResult.status === 'fulfilled' ? orderBookResult.value.sealRatios : new Map();
      const sectorMap =
        sectorResult.status === 'fulfilled' ? sectorResult.value.sectors : new Map();
      const limitUps =
        sectorResult.status === 'fulfilled' ? sectorResult.value.limitUps : [];

      sourceStatus.push(
        quoteResult.status === 'fulfilled'
          ? quoteResult.value.status
          : createUnavailableStatus(
              'intradayQuote',
              asOf,
              'TDX 扫描数据暂不可用，无法生成日线代理因子。',
            ),
      );
      sourceStatus.push(
        orderBookResult.status === 'fulfilled'
          ? orderBookResult.value.status
          : createUnavailableStatus('orderBook', asOf, '盘口买一金额数据尚未接入。'),
      );
      sourceStatus.push(
        sectorResult.status === 'fulfilled'
          ? sectorResult.value.status
          : createUnavailableStatus('sectorBreadth', asOf, '涨停板题材样本暂不可用。'),
      );
      sourceStatus.push(
        themeFlowResult.status === 'fulfilled'
          ? themeFlowResult.value.status
          : createUnavailableStatus('themeFlow', asOf, '题材成交额增速暂不可用。'),
      );

      const rankedCodes = [
        ...quoteCandidates.keys(),
        ...limitUps.map((item) => item.stockCode),
      ].filter((code, index, array) => array.indexOf(code) === index);

      const candidates: DragonHeadCandidateInput[] = rankedCodes.map((stockCode) => {
        const quote = quoteCandidates.get(stockCode);
        const sectorInfo = sectorMap.get(stockCode);
        const limitUpItem = limitUps.find((item) => item.stockCode === stockCode);
        const signalTags = [...(quote?.signalTags ?? [])];

        if ((limitUpItem?.limitUpCount ?? 0) === 1) {
          signalTags.push('新题材首板');
        }

        if ((limitUpItem?.limitUpCount ?? 0) >= 2) {
          signalTags.push('空间板观察');
        }

        return {
          stockCode,
          stockName: quote?.stockName ?? limitUpItem?.stockName ?? stockCode,
          market: quote?.market ?? limitUpItem?.market ?? 'SZ',
          sector: sectorInfo?.sector ?? limitUpItem?.sector ?? null,
          latestPrice: quote?.latestPrice ?? sectorInfo?.latestPrice ?? limitUpItem?.latestClose ?? 0,
          latestChangePct: quote?.latestChangePct ?? null,
          boardChangePct: null,
          volumeRatio: quote?.volumeRatio ?? null,
          speed10m: quote?.speed10m ?? null,
          sealRatio: sealRatios.get(stockCode) ?? null,
          breakoutFreq: quote?.breakoutFreq ?? null,
          limitUpCount: limitUpItem?.limitUpCount,
          signalTags,
          reviewFlags: [],
        };
      });

      const sectorAverage = groupAverage(candidates);

      candidates.forEach((candidate) => {
        candidate.boardChangePct = candidate.sector ? sectorAverage.get(candidate.sector) ?? null : null;

        if (candidate.speed10m === null) {
          candidate.reviewFlags.push('10分钟涨速缺失，当前使用降级评分。');
        }

        if (candidate.sealRatio === null) {
          candidate.reviewFlags.push('封单金额比缺失，需人工复核盘口。');
        }
      });

      return {
        asOf,
        candidates,
        sourceStatus,
      };
    },
  };
}

import type { TdxScanRequest, TdxScanResponse } from '@/lib/contracts/strategy';
import { calculateTdxIndicators } from '@/lib/tdx/engine';
import type { ExtendedKLineBar } from '@/lib/tdx/types';
import { getMarketStockPool } from '@/lib/services/market-screen';
import { getStockDailyHistory } from '@/lib/services/stock-history';

const HISTORY_CACHE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const SCAN_CONCURRENCY = 6;
const HISTORY_LOOKBACK_BARS = 180;

type HistoryCacheEntry = {
  expiresAt: number;
  value?: ExtendedKLineBar[];
  promise?: Promise<ExtendedKLineBar[]>;
};

let historyCache = new Map<string, HistoryCacheEntry>();

function formatEastMoneyDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

function normalizePage(value: number | undefined) {
  if (!Number.isFinite(value) || !value || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function normalizePageSize(value: number | undefined) {
  if (!Number.isFinite(value) || !value || value < 1) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(Math.floor(value), MAX_PAGE_SIZE);
}

function normalizeRequest(request: TdxScanRequest) {
  return {
    signalType: request.signalType ?? 'both',
    requireMaUp: request.requireMaUp === true,
    requireFiveLinesBull: request.requireFiveLinesBull === true,
    maxBiasRate:
      Number.isFinite(request.maxBiasRate) && request.maxBiasRate !== undefined
        ? Number(request.maxBiasRate)
        : Number.POSITIVE_INFINITY,
    minSignalStrength:
      Number.isFinite(request.minSignalStrength) && request.minSignalStrength !== undefined
        ? Number(request.minSignalStrength)
        : 0,
    page: normalizePage(request.page),
    pageSize: normalizePageSize(request.pageSize),
  };
}

async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  worker: (item: TInput) => Promise<TOutput>,
) {
  const results: TOutput[] = [];
  let cursor = 0;

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const current = items[cursor];
      cursor += 1;
      results.push(await worker(current));
    }
  });

  await Promise.all(runners);

  return results;
}

function buildHistoryRange() {
  const end = new Date();
  const begin = new Date(end.getTime() - 420 * 24 * 60 * 60 * 1000);

  return {
    beg: formatEastMoneyDate(begin),
    end: formatEastMoneyDate(end),
  };
}

async function loadHistory(stock: Awaited<ReturnType<typeof getMarketStockPool>>[number]['stock']) {
  const cacheKey = `${stock.market}:${stock.code}`;
  const cached = historyCache.get(cacheKey);

  if (cached && cached.value && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const promise = getStockDailyHistory(stock.code, stock.market, buildHistoryRange())
    .then((items) =>
      items.slice(-HISTORY_LOOKBACK_BARS).map((item) => ({
        date: item.tradeDate,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        amount: item.amount,
      })),
    )
    .then((items) => {
      historyCache.set(cacheKey, {
        expiresAt: Date.now() + HISTORY_CACHE_TTL_MS,
        value: items,
      });

      return items;
    })
    .finally(() => {
      const next = historyCache.get(cacheKey);

      if (next?.promise) {
        historyCache.set(cacheKey, {
          expiresAt: next.expiresAt,
          value: next.value,
        });
      }
    });

  historyCache.set(cacheKey, {
    expiresAt: Date.now() + HISTORY_CACHE_TTL_MS,
    promise,
  });

  return promise;
}

export function resetTdxScanCacheForTests() {
  historyCache = new Map();
}

export async function scanTdxSignals(
  request: TdxScanRequest,
): Promise<TdxScanResponse> {
  const normalized = normalizeRequest(request);
  const pool = await getMarketStockPool();
  const scanDate = new Date().toISOString().slice(0, 10);

  const settled = await mapWithConcurrency(pool, SCAN_CONCURRENCY, async (item) => {
    try {
      const bars = await loadHistory(item.stock);

      if (bars.length < 120) {
        return null;
      }

      const indicators = calculateTdxIndicators(bars, item.stock.name);
      const latest = indicators.at(-1);

      if (!latest) {
        return null;
      }

      const matchesSignal =
        normalized.signalType === 'meiZhu'
          ? latest.meiZhu > 0
          : normalized.signalType === 'meiYangYang'
            ? latest.meiYangYang
            : latest.meiZhu > 0 || latest.meiYangYang;

      if (!matchesSignal) {
        return null;
      }

      if (normalized.requireMaUp && !latest.maUp) {
        return null;
      }

      if (normalized.requireFiveLinesBull && !latest.fiveLinesBull) {
        return null;
      }

      if (latest.biasRate > normalized.maxBiasRate) {
        return null;
      }

      if (latest.X_74 < normalized.minSignalStrength) {
        return null;
      }

      const latestBar = bars.at(-1);
      const lastMeiZhuIndex = indicators.findLastIndex((entry) => entry.meiZhu > 0);

      if (!latestBar) {
        return null;
      }

      return {
        stockCode: item.stock.code,
        stockName: item.stock.name,
        market: item.stock.market,
        signalDate: latestBar.date,
        closePrice: latestBar.close,
        volume: latestBar.volume,
        meiZhu: latest.meiZhu > 0,
        meiYangYang: latest.meiYangYang,
        meiZhuDate: lastMeiZhuIndex >= 0 ? bars[lastMeiZhuIndex]?.date : undefined,
        signalStrength: latest.X_74,
        trueCGain: latest.trueCGain,
        maUp: latest.maUp,
        fiveLinesBull: latest.fiveLinesBull,
        biasRate: latest.biasRate,
        volumeRatio: latest.X_14,
      };
    } catch {
      return null;
    }
  });

  const items = settled
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => {
      if (right.signalStrength !== left.signalStrength) {
        return right.signalStrength - left.signalStrength;
      }

      if (Number(right.meiYangYang) !== Number(left.meiYangYang)) {
        return Number(right.meiYangYang) - Number(left.meiYangYang);
      }

      return left.stockCode.localeCompare(right.stockCode);
    });
  const startIndex = (normalized.page - 1) * normalized.pageSize;

  return {
    total: items.length,
    page: normalized.page,
    pageSize: normalized.pageSize,
    scanDate,
    items: items.slice(startIndex, startIndex + normalized.pageSize),
  };
}

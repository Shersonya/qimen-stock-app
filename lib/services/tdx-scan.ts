import type {
  TdxScanRequest,
  TdxScanResponse,
  TdxScanUniverseSource,
} from '@/lib/contracts/strategy';
import { ERROR_CODES, type Market } from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';
import { filterLimitUpStocks } from '@/lib/services/limit-up';
import { calculateTdxIndicators } from '@/lib/tdx/engine';
import type { ExtendedKLineBar } from '@/lib/tdx/types';
import {
  getMarketStockPool,
  getMarketStockPoolCacheMeta,
} from '@/lib/services/market-screen';
import { getStockDailyHistory } from '@/lib/services/stock-history';
import { mapWithConcurrency } from '@/lib/utils/async';
import { getShanghaiDateString, shiftDateString } from '@/lib/utils/date';

const HISTORY_CACHE_TTL_MS = 30 * 60 * 1000;
const SCAN_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const SCAN_CONCURRENCY = 12;
const HISTORY_LOOKBACK_BARS = 180;
const FALLBACK_SCAN_LOOKBACK_DAYS = 5;
const FALLBACK_SCAN_UNIVERSE_SIZE = 200;

type HistoryCacheEntry = {
  expiresAt: number;
  value?: ExtendedKLineBar[];
  promise?: Promise<ExtendedKLineBar[]>;
};

type ScanCacheSnapshot = {
  scanDate: string;
  items: TdxScanResponse['items'];
  universeSource: TdxScanUniverseSource;
  universeSize: number;
};

type ScanCacheEntry = {
  expiresAt: number;
  value?: ScanCacheSnapshot;
  promise?: Promise<ScanCacheSnapshot>;
};

type ScanUniverseStock = {
  code: string;
  name: string;
  market: Market;
};

type ScanUniverse = {
  items: ScanUniverseStock[];
  source: TdxScanUniverseSource;
};

let historyCache = new Map<string, HistoryCacheEntry>();
let scanCache = new Map<string, ScanCacheEntry>();

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

function buildHistoryRange() {
  const end = getShanghaiDateString();
  const begin = shiftDateString(end, -420);
  return {
    beg: begin.replace(/-/g, ''),
    end: end.replace(/-/g, ''),
  };
}

async function getScanUniverse(): Promise<ScanUniverse> {
  try {
    const pool = await getMarketStockPool();
    const cacheMeta = getMarketStockPoolCacheMeta();

    return {
      source:
        cacheMeta?.source === 'bundled_limit_up_snapshot'
          ? 'bundled_market_fallback'
          : 'market_pool',
      items: pool.map((item) => ({
        code: item.stock.code,
        name: item.stock.name,
        market: item.stock.market,
      })),
    };
  } catch (error) {
    if (!(error instanceof AppError) || error.code !== ERROR_CODES.DATA_SOURCE_ERROR) {
      throw error;
    }

    console.warn('[TDX Scan] Falling back to recent limit-up universe because market pool is unavailable.');
    const fallback = await filterLimitUpStocks({
      lookbackDays: FALLBACK_SCAN_LOOKBACK_DAYS,
      minLimitUpCount: 1,
      excludeST: true,
      excludeKechuang: false,
      excludeNewStock: true,
      page: 1,
      pageSize: FALLBACK_SCAN_UNIVERSE_SIZE,
      sortBy: 'limitUpCount',
      sortOrder: 'desc',
    });

    return {
      source: 'limit_up_fallback',
      items: fallback.items.map((item) => ({
        code: item.stockCode,
        name: item.stockName,
        market: item.market,
      })),
    };
  }
}

function buildScanCacheKey(normalized: ReturnType<typeof normalizeRequest>, scanDate: string) {
  return JSON.stringify({
    signalType: normalized.signalType,
    requireMaUp: normalized.requireMaUp,
    requireFiveLinesBull: normalized.requireFiveLinesBull,
    maxBiasRate: Number.isFinite(normalized.maxBiasRate) ? normalized.maxBiasRate : 'all',
    minSignalStrength: normalized.minSignalStrength,
    scanDate,
  });
}

function buildResponseMeta(
  snapshot: ScanCacheSnapshot,
  cached: boolean,
): TdxScanResponse['meta'] {
  let notice: string | undefined;

  if (snapshot.universeSource === 'limit_up_fallback') {
    notice = cached
      ? '主市场池暂不可用，当前展示的是最近涨停活跃股降级结果，并命中了 10 分钟内缓存。'
      : '主市场池暂不可用，已自动切换到最近涨停活跃股宇宙继续扫描。';
  } else if (snapshot.universeSource === 'bundled_market_fallback') {
    notice = cached
      ? '实时主市场池暂不可用，当前展示的是内置活跃股样本，并命中了 10 分钟内缓存。'
      : '实时主市场池暂不可用，已切换到内置活跃股样本继续扫描。';
  } else if (cached) {
    notice = '当前展示的是 10 分钟内缓存结果，适合重复翻页和短时间复查。';
  }

  return {
    cached,
    universeSource: snapshot.universeSource,
    universeSize: snapshot.universeSize,
    notice,
  };
}

function buildPagedResponse(
  snapshot: ScanCacheSnapshot,
  page: number,
  pageSize: number,
  cached: boolean,
): TdxScanResponse {
  const startIndex = (page - 1) * pageSize;

  return {
    total: snapshot.items.length,
    page,
    pageSize,
    scanDate: snapshot.scanDate,
    items: snapshot.items.slice(startIndex, startIndex + pageSize),
    meta: buildResponseMeta(snapshot, cached),
  };
}

async function loadHistory(stock: ScanUniverseStock) {
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
  scanCache = new Map();
}

async function buildScanSnapshot(
  normalized: ReturnType<typeof normalizeRequest>,
  scanDate: string,
): Promise<ScanCacheSnapshot> {
  const universe = await getScanUniverse();

  const settled = await mapWithConcurrency(universe.items, SCAN_CONCURRENCY, async (item) => {
    try {
      const bars = await loadHistory(item);

      if (bars.length < 120) {
        return null;
      }

      const indicators = calculateTdxIndicators(bars, item.name);
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

      if (Number(latest.X_74) < normalized.minSignalStrength) {
        return null;
      }

      const latestBar = bars.at(-1);
      const lastMeiZhuIndex = indicators.findLastIndex((entry) => entry.meiZhu > 0);

      if (!latestBar) {
        return null;
      }

      return {
        stockCode: item.code,
        stockName: item.name,
        market: item.market,
        signalDate: latestBar.date,
        closePrice: latestBar.close,
        volume: latestBar.volume,
        meiZhu: latest.meiZhu > 0,
        meiYangYang: latest.meiYangYang,
        meiZhuDate: lastMeiZhuIndex >= 0 ? bars[lastMeiZhuIndex]?.date : undefined,
        signalStrength: Number(latest.X_74),
        trueCGain: latest.trueCGain,
        maUp: latest.maUp,
        fiveLinesBull: latest.fiveLinesBull,
        biasRate: latest.biasRate,
        volumeRatio: Number(latest.X_14),
      };
    } catch (error) {
      console.warn(`[TDX Scan] Failed to process ${item.code}:`, error);
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

  return {
    scanDate,
    items,
    universeSource: universe.source,
    universeSize: universe.items.length,
  };
}

async function getOrBuildScanSnapshot(
  normalized: ReturnType<typeof normalizeRequest>,
  scanDate: string,
): Promise<{ snapshot: ScanCacheSnapshot; cached: boolean }> {
  const cacheKey = buildScanCacheKey(normalized, scanDate);
  const cachedEntry = scanCache.get(cacheKey);

  if (cachedEntry?.value && Date.now() < cachedEntry.expiresAt) {
    return {
      snapshot: cachedEntry.value,
      cached: true,
    };
  }

  if (cachedEntry?.promise) {
    return {
      snapshot: await cachedEntry.promise,
      cached: false,
    };
  }

  const promise = buildScanSnapshot(normalized, scanDate)
    .then((snapshot) => {
      scanCache.set(cacheKey, {
        expiresAt: Date.now() + SCAN_CACHE_TTL_MS,
        value: snapshot,
      });

      return snapshot;
    })
    .catch((error) => {
      scanCache.delete(cacheKey);
      throw error;
    });

  scanCache.set(cacheKey, {
    expiresAt: Date.now() + SCAN_CACHE_TTL_MS,
    promise,
  });

  return {
    snapshot: await promise,
    cached: false,
  };
}

export async function scanTdxSignals(
  request: TdxScanRequest,
): Promise<TdxScanResponse> {
  const normalized = normalizeRequest(request);
  const scanDate = getShanghaiDateString();
  const { snapshot, cached } = await getOrBuildScanSnapshot(normalized, scanDate);

  return buildPagedResponse(snapshot, normalized.page, normalized.pageSize, cached);
}

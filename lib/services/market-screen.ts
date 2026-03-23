import {
  ERROR_CODES,
  type Market,
  type QimenPatternConfigOverride,
  type QimenRiskConfigOverride,
  type QimenStockRating,
  type MarketScreenPatternFilter,
  type MarketScreenFilters,
  type MarketScreenRequest,
  type MarketScreenResultItem,
  type MarketScreenSuccessResponse,
} from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';
import { evaluateQimenAuspiciousPatterns } from '@/lib/qimen/auspicious-patterns';
import {
  analyzeStockForMarketScreen,
  type MarketScreenAnalysisSnapshot,
} from '@/lib/qimen/analysis';
import {
  buildMarketPatternSummary,
  comparePatternLevelCount,
} from '@/lib/qimen/pattern-report';
import { getBundledMarketScreenSnapshot } from '@/lib/fallback-data/market-screen';
import { getMarketFromCurrentAStockCode } from '@/lib/markets';
import { isStStockName } from '@/lib/services/stock-data';
import { mapWithConcurrency } from '@/lib/utils/async';

const MARKET_CACHE_TTL_MS = 30 * 60 * 1000;
const MARKET_POOL_MAX_ATTEMPTS = 3;
const MARKET_POOL_RETRY_DELAY_MS = 250;
const MARKET_POOL_PAGE_SIZE = 100;
const MARKET_POOL_PAGE_CONCURRENCY = 8;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

type EastMoneyMarketPoolItem = {
  f12?: string;
  f14?: string;
  f26?: number | string;
  f100?: string;
};

type EastMoneyMarketPoolResponse = {
  data?: {
    total?: number;
    diff?: EastMoneyMarketPoolItem[];
  };
};

type EastMoneyMarketPoolPage = {
  total: number;
  items: EastMoneyMarketPoolItem[];
};

type ScreenableStock = MarketScreenResultItem['stock'];
type CachedMarketScreenSnapshot = Omit<MarketScreenAnalysisSnapshot, 'stock'> & {
  stock: MarketScreenAnalysisSnapshot['stock'] & {
    sector?: string | null;
  };
};
type ScoredMarketScreenResult = MarketScreenResultItem & {
  patternSummary: NonNullable<MarketScreenResultItem['patternSummary']>;
};
type MarketPoolSource = 'live_market_pool' | 'bundled_limit_up_snapshot';
type MarketPoolBuildResult = {
  items: CachedMarketScreenSnapshot[];
  source: MarketPoolSource;
  updatedAt: number;
  notice?: string;
};

let marketPoolCache: CachedMarketScreenSnapshot[] | null = null;
let marketPoolCacheExpiresAt = 0;
let marketPoolCacheUpdatedAt = 0;
let marketPoolCacheSource: MarketPoolSource = 'live_market_pool';
let marketPoolCacheNotice: string | null = null;
let marketPoolPromise: Promise<MarketPoolBuildResult> | null = null;

function normalizeFilterValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function normalizeFilters(
  filters?: Partial<MarketScreenFilters>,
): MarketScreenFilters {
  return {
    hour: {
      door: normalizeFilterValue(filters?.hour?.door),
      star: normalizeFilterValue(filters?.hour?.star),
      god: normalizeFilterValue(filters?.hour?.god),
    },
    day: {
      door: normalizeFilterValue(filters?.day?.door),
      star: normalizeFilterValue(filters?.day?.star),
      god: normalizeFilterValue(filters?.day?.god),
    },
    month: {
      door: normalizeFilterValue(filters?.month?.door),
      star: normalizeFilterValue(filters?.month?.star),
      god: normalizeFilterValue(filters?.month?.god),
    },
    pattern: normalizePatternFilter(filters?.pattern),
  };
}

function hasAnyFilters(filters: MarketScreenFilters): boolean {
  const hasWindowFilters = [filters.hour, filters.day, filters.month].some((windowFilter) => {
    return Object.values(windowFilter).some(Boolean);
  });

  return hasWindowFilters || hasPatternFilters(filters.pattern);
}

function normalizePatternFilter(
  filter: MarketScreenPatternFilter | undefined,
): MarketScreenPatternFilter | undefined {
  if (!filter) {
    return undefined;
  }

  const names = filter.names
    ?.map((name) => name.trim())
    .filter(Boolean);
  const minScore = Number.isFinite(filter.minScore) ? Number(filter.minScore) : undefined;
  const palacePositions = filter.palacePositions
    ?.map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 9);

  return {
    names: names && names.length > 0 ? Array.from(new Set(names)) : undefined,
    minScore: minScore && minScore > 0 ? minScore : undefined,
    bullishOnly: filter.bullishOnly === true ? true : undefined,
    hourOnly: filter.hourOnly === true ? true : undefined,
    palacePositions:
      palacePositions && palacePositions.length > 0
        ? Array.from(new Set(palacePositions))
        : undefined,
  };
}

function hasPatternFilters(filter: MarketScreenPatternFilter | undefined): boolean {
  return Boolean(
    filter &&
      ((filter.names && filter.names.length > 0) ||
        filter.minScore ||
        filter.bullishOnly ||
        filter.hourOnly ||
        (filter.palacePositions && filter.palacePositions.length > 0)),
  );
}

function normalizePage(value: number | undefined): number {
  if (!Number.isFinite(value) || !value || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function normalizePageSize(value: number | undefined): number {
  if (!Number.isFinite(value) || !value || value < 1) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(Math.floor(value), MAX_PAGE_SIZE);
}

function formatListingDate(raw: number | string | undefined): string | null {
  if (raw === undefined || raw === null || raw === '') {
    return null;
  }

  const normalized = String(raw).trim();

  if (!/^\d{8}$/.test(normalized)) {
    return null;
  }

  return `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
}

function parseMarketPoolItem(item: EastMoneyMarketPoolItem): ScreenableStock | null {
  const code = item.f12?.trim();
  const name = item.f14?.trim();
  const listingDate = formatListingDate(item.f26);
  const sector = item.f100?.trim() || null;
  const market = code ? getMarketFromCurrentAStockCode(code) : null;

  if (!code || !name || !listingDate || !market) {
    return null;
  }

  if (isStStockName(name)) {
    return null;
  }

  return {
    code,
    name,
    market,
    listingDate,
    sector,
  };
}

function wait(delayMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function createMarketPoolEndpoint(page: number) {
  const params = new URLSearchParams({
    pn: String(page),
    pz: String(MARKET_POOL_PAGE_SIZE),
    po: '1',
    np: '1',
    fltt: '2',
    invt: '2',
    fid: 'f12',
    fs: 'm:1+t:2,m:0+t:6,m:0+t:80',
    fields: 'f12,f14,f26,f100',
  });

  params.set('fs', 'm:1+t:2,m:1+t:23,m:0+t:6,m:0+t:80,m:0+t:81');

  return `https://push2delay.eastmoney.com/api/qt/clist/get?${params.toString()}`;
}

async function fetchMarketPoolPage(page: number): Promise<EastMoneyMarketPoolPage> {
  for (let attempt = 1; attempt <= MARKET_POOL_MAX_ATTEMPTS; attempt += 1) {
    let response: Response;

    try {
      response = await fetch(createMarketPoolEndpoint(page), {
        cache: 'no-store',
        headers: {
          accept: 'application/json,text/plain,*/*',
        },
      });
    } catch {
      if (attempt < MARKET_POOL_MAX_ATTEMPTS) {
        await wait(MARKET_POOL_RETRY_DELAY_MS * attempt);
        continue;
      }

      break;
    }

    if (!response.ok) {
      if (attempt < MARKET_POOL_MAX_ATTEMPTS) {
        await wait(MARKET_POOL_RETRY_DELAY_MS * attempt);
        continue;
      }

      break;
    }

    try {
      const payload = (await response.json()) as EastMoneyMarketPoolResponse;

      return {
        total: Number(payload.data?.total) || 0,
        items: payload.data?.diff ?? [],
      };
    } catch {
      if (attempt < MARKET_POOL_MAX_ATTEMPTS) {
        await wait(MARKET_POOL_RETRY_DELAY_MS * attempt);
        continue;
      }

      break;
    }
  }

  throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
}

async function fetchMarketPool(): Promise<EastMoneyMarketPoolItem[]> {
  const firstPage = await fetchMarketPoolPage(1);
  const totalPages = Math.max(
    1,
    Math.ceil(Math.max(firstPage.total, firstPage.items.length) / MARKET_POOL_PAGE_SIZE),
  );

  if (totalPages === 1) {
    return firstPage.items;
  }

  const remainingPages = Array.from(
    { length: totalPages - 1 },
    (_unused, index) => index + 2,
  );
  const remainingItems = await mapWithConcurrency(
    remainingPages,
    MARKET_POOL_PAGE_CONCURRENCY,
    async (page) => (await fetchMarketPoolPage(page)).items,
  );

  return [firstPage.items, ...remainingItems].flat();
}

function getRatingRank(rating: QimenStockRating) {
  switch (rating) {
    case 'S':
      return 4;
    case 'A':
      return 3;
    case 'B':
      return 2;
    case 'C':
    default:
      return 1;
  }
}

function matchesMinimumRating(
  rating: QimenStockRating,
  minRating: MarketScreenRequest['minRating'],
) {
  if (!minRating || minRating === 'ALL') {
    return true;
  }

  return getRatingRank(rating) >= getRatingRank(minRating);
}

function buildScoredMarketResult(
  snapshot: CachedMarketScreenSnapshot,
  patternConfigOverride?: QimenPatternConfigOverride,
  riskConfigOverride?: QimenRiskConfigOverride,
): ScoredMarketScreenResult {
  const patternEvaluation = evaluateQimenAuspiciousPatterns(
    snapshot.patternInput,
    patternConfigOverride,
  );

  return {
    stock: snapshot.stock,
    hourWindow: snapshot.hourWindow,
    dayWindow: snapshot.dayWindow,
    monthWindow: snapshot.monthWindow,
    patternSummary: buildMarketPatternSummary(
      snapshot,
      patternEvaluation,
      riskConfigOverride,
    ),
  };
}

function cloneSnapshots(items: CachedMarketScreenSnapshot[]) {
  return JSON.parse(JSON.stringify(items)) as CachedMarketScreenSnapshot[];
}

function getBundledMarketPool(): MarketPoolBuildResult {
  const bundled = getBundledMarketScreenSnapshot();
  const updatedAt = Date.parse(bundled.generatedAt);

  return {
    items: cloneSnapshots(bundled.items as CachedMarketScreenSnapshot[]),
    source: 'bundled_limit_up_snapshot',
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
    notice:
      `全市场主样本源暂不可用，已切换到内置涨停活跃股样本 ` +
      `(${bundled.items.length} 只，样本日期 ${bundled.sourceFilterDate})。`,
  };
}

async function buildMarketStockPool(): Promise<MarketPoolBuildResult> {
  try {
    const items = await fetchMarketPool();

    return {
      items: items
        .map(parseMarketPoolItem)
        .filter((item): item is ScreenableStock => Boolean(item))
        .reduce<CachedMarketScreenSnapshot[]>((acc, item) => {
          try {
            const snapshot = analyzeStockForMarketScreen(item);

            acc.push({
              stock: {
                ...snapshot.stock,
                sector: item.sector,
              },
              hourWindow: snapshot.hourWindow,
              dayWindow: snapshot.dayWindow,
              monthWindow: snapshot.monthWindow,
              patternInput: snapshot.patternInput,
            });
          } catch {
            // Skip malformed snapshots so the broader market scan can continue.
          }

          return acc;
        }, []),
      source: 'live_market_pool',
      updatedAt: Date.now(),
    };
  } catch (error) {
    if (!(error instanceof AppError) || error.code !== ERROR_CODES.DATA_SOURCE_ERROR) {
      throw error;
    }

    return getBundledMarketPool();
  }
}

export function resetMarketStockPoolCacheForTests() {
  marketPoolCache = null;
  marketPoolCacheExpiresAt = 0;
  marketPoolCacheUpdatedAt = 0;
  marketPoolCacheSource = 'live_market_pool';
  marketPoolCacheNotice = null;
  marketPoolPromise = null;
}

export function getMarketStockPoolCacheMeta() {
  return {
    cached: Boolean(marketPoolCache && Date.now() < marketPoolCacheExpiresAt),
    updatedAt:
      marketPoolCacheUpdatedAt > 0
        ? new Date(marketPoolCacheUpdatedAt).toISOString()
        : null,
    expiresAt:
      marketPoolCacheExpiresAt > 0
        ? new Date(marketPoolCacheExpiresAt).toISOString()
        : null,
    source: marketPoolCacheSource as MarketPoolSource | undefined,
    notice: marketPoolCacheNotice,
  };
}

export async function getMarketStockPool(args: {
  patternConfigOverride?: QimenPatternConfigOverride;
  riskConfigOverride?: QimenRiskConfigOverride;
} = {}): Promise<ScoredMarketScreenResult[]> {
  if (marketPoolCache && Date.now() < marketPoolCacheExpiresAt) {
    return marketPoolCache
      .map((snapshot) =>
        buildScoredMarketResult(
          snapshot,
          args.patternConfigOverride,
          args.riskConfigOverride,
        ),
      )
      .sort(comparePatternLevelCount);
  }

  if (!marketPoolPromise) {
    marketPoolPromise = buildMarketStockPool()
      .then((result) => {
        if (
          result.source === 'bundled_limit_up_snapshot' &&
          marketPoolCache &&
          marketPoolCache.length > 0
        ) {
          return {
            items: marketPoolCache,
            source: marketPoolCacheSource,
            updatedAt: marketPoolCacheUpdatedAt || Date.now(),
            notice: marketPoolCacheNotice ?? undefined,
          };
        }

        marketPoolCache = result.items;
        marketPoolCacheUpdatedAt = result.updatedAt;
        marketPoolCacheExpiresAt = Date.now() + MARKET_CACHE_TTL_MS;
        marketPoolCacheSource = result.source;
        marketPoolCacheNotice = result.notice ?? null;
        return result;
      })
      .catch((error) => {
        if (marketPoolCache && marketPoolCache.length > 0) {
          return {
            items: marketPoolCache,
            source: marketPoolCacheSource,
            updatedAt: marketPoolCacheUpdatedAt || Date.now(),
            notice: marketPoolCacheNotice ?? undefined,
          };
        }

        throw error;
      })
      .finally(() => {
        marketPoolPromise = null;
      });
  }

  return (await marketPoolPromise).items
    .map((snapshot) =>
      buildScoredMarketResult(
        snapshot,
        args.patternConfigOverride,
        args.riskConfigOverride,
      ),
    )
    .sort(comparePatternLevelCount);
}

function matchesWindowFilter(
  window: MarketScreenResultItem['hourWindow'],
  filter: MarketScreenFilters['hour'],
): boolean {
  if (filter.door && window.door !== filter.door) {
    return false;
  }

  if (filter.star && window.star !== filter.star) {
    return false;
  }

  if (filter.god && window.god !== filter.god) {
    return false;
  }

  return true;
}

function matchesPatternFilter(
  item: ScoredMarketScreenResult,
  filter: MarketScreenPatternFilter | undefined,
): boolean {
  if (!hasPatternFilters(filter)) {
    return true;
  }

  if (!item.patternSummary.isEligible) {
    return false;
  }

  if (filter?.bullishOnly && !item.patternSummary.bullishSignal) {
    return false;
  }

  if (filter?.minScore && item.patternSummary.totalScore < filter.minScore) {
    return false;
  }

  if (filter?.names && filter.names.length > 0) {
    const names = filter.hourOnly
      ? item.patternSummary.hourPatternNames
      : item.patternSummary.matchedPatternNames;

    if (!filter.names.some((name) => names.includes(name))) {
      return false;
    }
  }

  if (filter?.palacePositions && filter.palacePositions.length > 0) {
    if (
      !filter.palacePositions.some((position) =>
        item.patternSummary.palacePositions.includes(position),
      )
    ) {
      return false;
    }
  }

  return true;
}

export async function screenMarketStocks(
  request: MarketScreenRequest,
): Promise<MarketScreenSuccessResponse> {
  if (request.marketSignal?.hasBAboveGE === false) {
    throw new AppError(ERROR_CODES.MARKET_ENVIRONMENT_UNFAVORABLE, 400);
  }

  const filters = normalizeFilters(request.filters);

  if (!hasAnyFilters(filters)) {
    throw new AppError(ERROR_CODES.MARKET_FILTER_REQUIRED, 400);
  }

  const page = normalizePage(request.page);
  const pageSize = normalizePageSize(request.pageSize);
  const items = await getMarketStockPool({
    patternConfigOverride: request.patternConfigOverride,
    riskConfigOverride: request.riskConfigOverride,
  });
  const cacheMeta = getMarketStockPoolCacheMeta();
  const matchedItems = items.filter((item) => {
    return (
      matchesWindowFilter(item.hourWindow, filters.hour) &&
      matchesWindowFilter(item.dayWindow, filters.day) &&
      matchesWindowFilter(item.monthWindow, filters.month) &&
      matchesPatternFilter(item, filters.pattern) &&
      matchesMinimumRating(item.patternSummary.rating, request.minRating) &&
      (!request.onlyEligible || item.patternSummary.isEligible)
    );
  }).sort(comparePatternLevelCount);
  const startIndex = (page - 1) * pageSize;

  return {
    total: matchedItems.length,
    page,
    pageSize,
    items: matchedItems.slice(startIndex, startIndex + pageSize),
    meta:
      cacheMeta.source === 'bundled_limit_up_snapshot'
        ? {
            source: 'bundled_limit_up_snapshot',
            generatedAt: cacheMeta.updatedAt ?? undefined,
            notice: cacheMeta.notice ?? '当前结果来自内置涨停活跃股样本。',
          }
        : {
            source: 'live_market_pool',
            generatedAt: cacheMeta.updatedAt ?? undefined,
          },
  };
}

import {
  ERROR_CODES,
  type Market,
  type MarketScreenPatternFilter,
  type MarketScreenPatternSummary,
  type MarketScreenFilters,
  type MarketScreenRequest,
  type MarketScreenResultItem,
  type MarketScreenSuccessResponse,
} from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';
import { evaluateQimenAuspiciousPatterns } from '@/lib/qimen/auspicious-patterns';
import { analyzeStockForMarketScreen } from '@/lib/qimen/analysis';
import { isStStockName } from '@/lib/services/stock-data';

const MARKET_POOL_ENDPOINT =
  'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=10000&po=1&np=1&fltt=2&invt=2&fid=f12&fs=m:1+t:2,m:0+t:6,m:0+t:80&fields=f12,f14,f26';
const MARKET_CACHE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

type EastMoneyMarketPoolItem = {
  f12?: string;
  f14?: string;
  f26?: number | string;
};

type EastMoneyMarketPoolResponse = {
  data?: {
    diff?: EastMoneyMarketPoolItem[];
  };
};

type ScreenableStock = MarketScreenResultItem['stock'];
type CachedMarketScreenResult = MarketScreenResultItem & {
  patternSummary: MarketScreenPatternSummary;
};

let marketPoolCache: CachedMarketScreenResult[] | null = null;
let marketPoolCacheExpiresAt = 0;
let marketPoolPromise: Promise<CachedMarketScreenResult[]> | null = null;

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

  return {
    names: names && names.length > 0 ? Array.from(new Set(names)) : undefined,
    minScore: minScore && minScore > 0 ? minScore : undefined,
    bullishOnly: filter.bullishOnly === true ? true : undefined,
    hourOnly: filter.hourOnly === true ? true : undefined,
  };
}

function hasPatternFilters(filter: MarketScreenPatternFilter | undefined): boolean {
  return Boolean(
    filter &&
      ((filter.names && filter.names.length > 0) ||
        filter.minScore ||
        filter.bullishOnly ||
        filter.hourOnly),
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

function resolveMarket(code: string): Market {
  if (/^[69]/.test(code)) {
    return 'SH';
  }

  if (/^3/.test(code)) {
    return 'CYB';
  }

  if (/^[02]/.test(code)) {
    return 'SZ';
  }

  throw new AppError(ERROR_CODES.UNSUPPORTED_MARKET, 400);
}

function parseMarketPoolItem(item: EastMoneyMarketPoolItem): ScreenableStock | null {
  const code = item.f12?.trim();
  const name = item.f14?.trim();
  const listingDate = formatListingDate(item.f26);

  if (!code || !name || !listingDate) {
    return null;
  }

  if (isStStockName(name)) {
    return null;
  }

  return {
    code,
    name,
    market: resolveMarket(code),
    listingDate,
  };
}

async function fetchMarketPool(): Promise<EastMoneyMarketPoolItem[]> {
  let response: Response;

  try {
    response = await fetch(MARKET_POOL_ENDPOINT, {
      cache: 'no-store',
      headers: {
        accept: 'application/json,text/plain,*/*',
      },
    });
  } catch {
    throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
  }

  if (!response.ok) {
    throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
  }

  let payload: EastMoneyMarketPoolResponse;

  try {
    payload = (await response.json()) as EastMoneyMarketPoolResponse;
  } catch {
    throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
  }

  return payload.data?.diff ?? [];
}

function resolvePatternExclusionReason(
  item: MarketScreenResultItem,
  evaluation: ReturnType<typeof evaluateQimenAuspiciousPatterns>,
): string | null {
  if (
    evaluation.counts.COMPOSITE === 0 &&
    evaluation.counts.A === 0 &&
    evaluation.counts.B === 0
  ) {
    return '无 A/B 级核心动力';
  }

  const protectedPalaceIds = new Set<number>(
    [
      item.hourWindow.position,
      evaluation.corePalaces.shengDoorPalaceId,
      evaluation.corePalaces.skyWuPalaceId,
    ].filter((value): value is number => Boolean(value)),
  );
  const invalidProtectedPalace = evaluation.invalidPalaces.find((palace) => {
    return protectedPalaceIds.has(palace.palaceId);
  });

  if (invalidProtectedPalace) {
    return `核心用神受制: ${invalidProtectedPalace.palaceLabel} ${invalidProtectedPalace.reasons.join('/')}`;
  }

  return null;
}

function createPatternSummary(
  item: MarketScreenResultItem,
  evaluation: ReturnType<typeof evaluateQimenAuspiciousPatterns>,
): MarketScreenPatternSummary {
  const hourPatternNames = Array.from(
    new Set(
      evaluation.activeMatches
        .filter((match) => match.palaceId === item.hourWindow.position)
        .map((match) => match.name),
    ),
  );
  const exclusionReason = resolvePatternExclusionReason(item, evaluation);

  return {
    totalScore: evaluation.totalScore,
    rating: evaluation.rating,
    energyLabel: evaluation.energyLabel,
    summary: evaluation.summary,
    corePatternsLabel: evaluation.corePatternsLabel,
    matchedPatternNames: Array.from(
      new Set(evaluation.activeMatches.map((match) => match.name)),
    ),
    hourPatternNames,
    counts: evaluation.counts,
    bullishSignal:
      item.hourWindow.door === '生门' || item.hourWindow.god === '值符',
    isEligible: exclusionReason === null,
    exclusionReason,
  };
}

async function buildMarketStockPool(): Promise<CachedMarketScreenResult[]> {
  const items = await fetchMarketPool();

  return items
    .map(parseMarketPoolItem)
    .filter((item): item is ScreenableStock => Boolean(item))
    .map((item) => {
      try {
        const snapshot = analyzeStockForMarketScreen(item);
        const patternEvaluation = evaluateQimenAuspiciousPatterns(snapshot.patternInput);

        return {
          stock: snapshot.stock,
          hourWindow: snapshot.hourWindow,
          dayWindow: snapshot.dayWindow,
          monthWindow: snapshot.monthWindow,
          patternSummary: createPatternSummary(snapshot, patternEvaluation),
        };
      } catch {
        return null;
      }
    })
    .filter((item): item is CachedMarketScreenResult => Boolean(item))
    .sort((left, right) => left.stock.code.localeCompare(right.stock.code));
}

export function resetMarketStockPoolCacheForTests() {
  marketPoolCache = null;
  marketPoolCacheExpiresAt = 0;
  marketPoolPromise = null;
}

export async function getMarketStockPool(): Promise<CachedMarketScreenResult[]> {
  if (marketPoolCache && Date.now() < marketPoolCacheExpiresAt) {
    return marketPoolCache;
  }

  if (!marketPoolPromise) {
    marketPoolPromise = buildMarketStockPool()
      .then((items) => {
        marketPoolCache = items;
        marketPoolCacheExpiresAt = Date.now() + MARKET_CACHE_TTL_MS;
        return items;
      })
      .finally(() => {
        marketPoolPromise = null;
      });
  }

  return marketPoolPromise;
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
  item: CachedMarketScreenResult,
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
  const items = await getMarketStockPool();
  const matchedItems = items.filter((item) => {
    return (
      matchesWindowFilter(item.hourWindow, filters.hour) &&
      matchesWindowFilter(item.dayWindow, filters.day) &&
      matchesWindowFilter(item.monthWindow, filters.month) &&
      matchesPatternFilter(item, filters.pattern)
    );
  });
  const startIndex = (page - 1) * pageSize;

  return {
    total: matchedItems.length,
    page,
    pageSize,
    items: matchedItems.slice(startIndex, startIndex + pageSize),
  };
}

import {
  ERROR_CODES,
  type Market,
  type MarketScreenFilters,
  type MarketScreenRequest,
  type MarketScreenResultItem,
  type MarketScreenSuccessResponse,
} from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';
import { analyzeStockWindows } from '@/lib/qimen/analysis';
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

let marketPoolCache: MarketScreenResultItem[] | null = null;
let marketPoolCacheExpiresAt = 0;
let marketPoolPromise: Promise<MarketScreenResultItem[]> | null = null;

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
  };
}

function hasAnyFilters(filters: MarketScreenFilters): boolean {
  return Object.values(filters).some((windowFilter) => {
    return Object.values(windowFilter).some(Boolean);
  });
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

async function buildMarketStockPool(): Promise<MarketScreenResultItem[]> {
  const items = await fetchMarketPool();

  return items
    .map(parseMarketPoolItem)
    .filter((item): item is ScreenableStock => Boolean(item))
    .map((item) => {
      try {
        return analyzeStockWindows(item);
      } catch {
        return null;
      }
    })
    .filter((item): item is MarketScreenResultItem => Boolean(item))
    .sort((left, right) => left.stock.code.localeCompare(right.stock.code));
}

export function resetMarketStockPoolCacheForTests() {
  marketPoolCache = null;
  marketPoolCacheExpiresAt = 0;
  marketPoolPromise = null;
}

export async function getMarketStockPool(): Promise<MarketScreenResultItem[]> {
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

export async function screenMarketStocks(
  request: MarketScreenRequest,
): Promise<MarketScreenSuccessResponse> {
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
      matchesWindowFilter(item.monthWindow, filters.month)
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

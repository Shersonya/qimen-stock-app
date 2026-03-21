import {
  type LimitUpFilterRequest,
  type LimitUpFilterResponse,
  type LimitUpStock,
} from '@/lib/contracts/strategy';
import { getMarketStockPool } from '@/lib/services/market-screen';
import { isStStockName } from '@/lib/services/stock-data';
import { getStockDailyHistory } from '@/lib/services/stock-history';

const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const CACHE_TTL_MS = 30 * 60 * 1000;
const HISTORY_FETCH_BUFFER_DAYS = 120;
const CONCURRENCY_LIMIT = 6;
const MIN_NEW_STOCK_TRADING_DAYS = 60;

type MarketPoolStock = Awaited<ReturnType<typeof getMarketStockPool>>[number];

type CachedLimitUpResult = {
  expiresAt: number;
  response: Pick<LimitUpFilterResponse, 'total' | 'filterDate' | 'lookbackDays'> & {
    items: LimitUpStock[];
  };
};

const limitUpCache = new Map<string, CachedLimitUpResult>();

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

function normalizeLookbackDays(value: number | undefined): number {
  if (!Number.isFinite(value) || !value || value < 1) {
    return DEFAULT_LOOKBACK_DAYS;
  }

  return Math.floor(value);
}

function normalizeMinLimitUpCount(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function normalizeSortBy(
  value: LimitUpFilterRequest['sortBy'] | undefined,
): NonNullable<LimitUpFilterRequest['sortBy']> {
  return value === 'lastLimitUpDate' || value === 'latestClose' ? value : 'limitUpCount';
}

function normalizeSortOrder(
  value: LimitUpFilterRequest['sortOrder'] | undefined,
): NonNullable<LimitUpFilterRequest['sortOrder']> {
  return value === 'asc' ? 'asc' : 'desc';
}

function normalizeBoolean(value: boolean | undefined, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function getShanghaiDateString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
  }).format(date);
}

function shiftDate(date: string, deltaDays: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day));
  nextDate.setUTCDate(nextDate.getUTCDate() + deltaDays);

  return nextDate.toISOString().slice(0, 10);
}

function getHistoryWindow(lookbackDays: number): { beg: string; end: string } {
  const end = getShanghaiDateString();
  const beg = shiftDate(end, -(lookbackDays + HISTORY_FETCH_BUFFER_DAYS));

  return { beg, end };
}

function getLimitUpThreshold(stockCode: string): number {
  if (/^688/.test(stockCode)) {
    return Number.POSITIVE_INFINITY;
  }

  if (/^3/.test(stockCode)) {
    return 1.199;
  }

  return 1.099;
}

function isLimitUpByRatio(close: number, prevClose: number, stockCode: string): boolean {
  if (!(close > 0) || !(prevClose > 0)) {
    return false;
  }

  const threshold = getLimitUpThreshold(stockCode);

  return close / prevClose >= threshold - 1e-6;
}

export function isLimitUp(
  close: number,
  prevClose: number,
  stockCode: string,
): boolean {
  return isLimitUpByRatio(close, prevClose, stockCode);
}

function hasEnoughTradingDays(historyLength: number): boolean {
  return historyLength >= MIN_NEW_STOCK_TRADING_DAYS;
}

function compareLimitUpStocks(
  left: LimitUpStock,
  right: LimitUpStock,
  sortBy: NonNullable<LimitUpFilterRequest['sortBy']>,
  sortOrder: NonNullable<LimitUpFilterRequest['sortOrder']>,
): number {
  const direction = sortOrder === 'asc' ? 1 : -1;

  const compareByDate = (a: string, b: string) => a.localeCompare(b);

  let primary = 0;

  switch (sortBy) {
    case 'lastLimitUpDate':
      primary = compareByDate(left.lastLimitUpDate, right.lastLimitUpDate);
      break;
    case 'latestClose':
      primary = left.latestClose - right.latestClose;
      break;
    case 'limitUpCount':
    default:
      primary = left.limitUpCount - right.limitUpCount;
      break;
  }

  if (primary !== 0) {
    return primary * direction;
  }

  const countDiff = (left.limitUpCount - right.limitUpCount) * -1;
  if (countDiff !== 0) {
    return countDiff;
  }

  const dateDiff = compareByDate(right.lastLimitUpDate, left.lastLimitUpDate);
  if (dateDiff !== 0) {
    return dateDiff;
  }

  return left.stockCode.localeCompare(right.stockCode);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.allSettled(workers);

  return results;
}

function buildCacheKey(request: Required<
  Pick<
    LimitUpFilterRequest,
    | 'lookbackDays'
    | 'minLimitUpCount'
    | 'excludeST'
    | 'excludeKechuang'
    | 'excludeNewStock'
    | 'sortBy'
    | 'sortOrder'
  >
>): string {
  return JSON.stringify(request);
}

function getCachedResponse(
  requestKey: string,
): CachedLimitUpResult | null {
  const cached = limitUpCache.get(requestKey);

  if (!cached || Date.now() >= cached.expiresAt) {
    if (cached) {
      limitUpCache.delete(requestKey);
    }

    return null;
  }

  return cached;
}

function setCachedResponse(requestKey: string, response: CachedLimitUpResult['response']) {
  limitUpCache.set(requestKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    response,
  });
}

function buildPagedResponse(
  response: CachedLimitUpResult['response'],
  page: number,
  pageSize: number,
): LimitUpFilterResponse {
  const startIndex = (page - 1) * pageSize;

  return {
    total: response.total,
    page,
    pageSize,
    filterDate: response.filterDate,
    lookbackDays: response.lookbackDays,
    items: response.items.slice(startIndex, startIndex + pageSize),
  };
}

async function buildLimitUpStock(
  stock: MarketPoolStock,
  options: {
    lookbackDays: number;
    excludeST: boolean;
    excludeKechuang: boolean;
    excludeNewStock: boolean;
  },
): Promise<LimitUpStock | null> {
  const { stock: basicStock } = stock;

  if (options.excludeKechuang && /^688/.test(basicStock.code)) {
    return null;
  }

  if (options.excludeST && isStStockName(basicStock.name)) {
    return null;
  }

  const { beg, end } = getHistoryWindow(options.lookbackDays);
  const history = (await getStockDailyHistory(basicStock.code, basicStock.market, { beg, end }))
    .slice()
    .sort((left, right) => left.tradeDate.localeCompare(right.tradeDate));

  if (options.excludeNewStock && !hasEnoughTradingDays(history.length)) {
    return null;
  }

  const limitUpDates: string[] = [];

  for (let index = Math.max(1, history.length - options.lookbackDays); index < history.length; index += 1) {
    const currentBar = history[index];
    const previousBar = history[index - 1];

    if (isLimitUpByRatio(currentBar.close, previousBar.close, basicStock.code)) {
      limitUpDates.push(currentBar.tradeDate);
    }
  }

  if (limitUpDates.length === 0) {
    return null;
  }

  const latestBar = history[history.length - 1];

  return {
    stockCode: basicStock.code,
    stockName: basicStock.name,
    market: basicStock.market,
    limitUpDates,
    limitUpCount: limitUpDates.length,
    firstLimitUpDate: limitUpDates[0],
    lastLimitUpDate: limitUpDates[limitUpDates.length - 1],
    latestClose: latestBar.close,
    latestVolume: latestBar.volume,
    sector: basicStock.sector ?? undefined,
  };
}

export function resetLimitUpCacheForTests() {
  limitUpCache.clear();
}

export async function filterLimitUpStocks(
  request: LimitUpFilterRequest = {},
): Promise<LimitUpFilterResponse> {
  const lookbackDays = normalizeLookbackDays(request.lookbackDays);
  const minLimitUpCount = normalizeMinLimitUpCount(request.minLimitUpCount);
  const excludeST = normalizeBoolean(request.excludeST, true);
  const excludeKechuang = normalizeBoolean(request.excludeKechuang, true);
  const excludeNewStock = normalizeBoolean(request.excludeNewStock, true);
  const sortBy = normalizeSortBy(request.sortBy);
  const sortOrder = normalizeSortOrder(request.sortOrder);
  const page = normalizePage(request.page);
  const pageSize = normalizePageSize(request.pageSize);
  const requestKey = buildCacheKey({
    lookbackDays,
    minLimitUpCount,
    excludeST,
    excludeKechuang,
    excludeNewStock,
    sortBy,
    sortOrder,
  });

  const cached = getCachedResponse(requestKey);
  if (cached) {
    return buildPagedResponse(cached.response, page, pageSize);
  }

  const stocks = await getMarketStockPool();
  const historyWindow = getHistoryWindow(lookbackDays);
  const items = await mapWithConcurrency(
    stocks,
    CONCURRENCY_LIMIT,
    async (stock) => {
      try {
        return await buildLimitUpStock(stock, {
          lookbackDays,
          excludeST,
          excludeKechuang,
          excludeNewStock,
        });
      } catch {
        return null;
      }
    },
  );

  const filteredItems = items
    .filter((item): item is LimitUpStock => Boolean(item))
    .filter((item) => item.limitUpCount >= minLimitUpCount)
    .sort((left, right) => compareLimitUpStocks(left, right, sortBy, sortOrder));

  const response: CachedLimitUpResult['response'] = {
    total: filteredItems.length,
    filterDate: historyWindow.end,
    lookbackDays,
    items: filteredItems,
  };

  setCachedResponse(requestKey, response);

  return buildPagedResponse(response, page, pageSize);
}

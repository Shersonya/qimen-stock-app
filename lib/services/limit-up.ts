import {
  type LimitUpFilterRequest,
  type LimitUpFilterResponse,
  type LimitUpStock,
} from '@/lib/contracts/strategy';
import { getBundledLimitUpSnapshot } from '@/lib/fallback-data/limit-up';
import { isStStockName } from '@/lib/services/stock-data';
import { getStockDailyHistory } from '@/lib/services/stock-history';
import { mapWithConcurrency } from '@/lib/utils/async';
import {
  getShanghaiDateString,
  shiftDateString,
  toCompactDateString,
} from '@/lib/utils/date';

const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const CACHE_TTL_MS = 30 * 60 * 1000;
const HISTORY_FETCH_BUFFER_DAYS = 120;
const CONCURRENCY_LIMIT = 12;
const MIN_NEW_STOCK_TRADING_DAYS = 60;
const LIMIT_UP_POOL_ENDPOINT = 'https://push2ex.eastmoney.com/getTopicZTPool';
const LIMIT_UP_POOL_PAGE_SIZE = 200;
const LIMIT_UP_POOL_CONCURRENCY = 6;

type EastMoneyLimitUpPoolItem = {
  c?: string;
  m?: number;
  n?: string;
  p?: number | string;
  amount?: number | string;
  hybk?: string;
};

type EastMoneyLimitUpPoolResponse = {
  data?: {
    tc?: number;
    pool?: EastMoneyLimitUpPoolItem[];
  };
};

type AggregatedLimitUpCandidate = {
  stockCode: string;
  stockName: string;
  market: LimitUpStock['market'];
  limitUpDates: string[];
  latestPoolClose: number;
  latestPoolVolume: number;
  sector?: string;
};

type CachedLimitUpResult = {
  expiresAt: number;
  response: Pick<LimitUpFilterResponse, 'total' | 'filterDate' | 'lookbackDays' | 'meta'> & {
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

function getHistoryWindow(lookbackDays: number): { beg: string; end: string } {
  const end = getShanghaiDateString();
  const beg = shiftDateString(end, -(lookbackDays + HISTORY_FETCH_BUFFER_DAYS));

  return { beg, end };
}

function getLimitUpThreshold(stockCode: string): number {
  if (/^688/.test(stockCode)) {
    return 1.199;
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
    meta: response.meta,
  };
}

function buildBundledLimitUpResponse(args: {
  lookbackDays: number;
  minLimitUpCount: number;
  excludeST: boolean;
  excludeKechuang: boolean;
  excludeNewStock: boolean;
  sortBy: NonNullable<LimitUpFilterRequest['sortBy']>;
  sortOrder: NonNullable<LimitUpFilterRequest['sortOrder']>;
  page: number;
  pageSize: number;
}): LimitUpFilterResponse {
  const bundled = getBundledLimitUpSnapshot();
  const effectiveLookbackDays = Math.min(args.lookbackDays, bundled.tradingDates.length);
  const activeTradingDates = new Set(bundled.tradingDates.slice(-effectiveLookbackDays));
  const filteredItems = bundled.items
    .map((item) => {
      const limitUpDates = item.limitUpDates.filter((tradeDate) => activeTradingDates.has(tradeDate));

      if (!limitUpDates.length) {
        return null;
      }

      if (args.excludeST && isStStockName(item.stockName)) {
        return null;
      }

      if (args.excludeKechuang && /^688/.test(item.stockCode)) {
        return null;
      }

      if (args.excludeNewStock && item.isNewStockCandidate) {
        return null;
      }

      return {
        ...item,
        limitUpDates,
        limitUpCount: limitUpDates.length,
        firstLimitUpDate: limitUpDates[0]!,
        lastLimitUpDate: limitUpDates[limitUpDates.length - 1]!,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => item.limitUpCount >= args.minLimitUpCount)
    .sort((left, right) => compareLimitUpStocks(left, right, args.sortBy, args.sortOrder));

  return buildPagedResponse(
    {
      total: filteredItems.length,
      filterDate: bundled.filterDate,
      lookbackDays: effectiveLookbackDays,
      items: filteredItems,
      meta: {
        source: 'bundled_snapshot',
        generatedAt: bundled.generatedAt,
        notice: '实时涨停池暂不可用，当前结果来自内置 30 日涨停快照。',
      },
    },
    args.page,
    args.pageSize,
  );
}

function resolveMarket(stockCode: string, marketFlag: number | undefined): LimitUpStock['market'] {
  if (/^920/.test(stockCode)) {
    return 'BJ';
  }

  if (/^688/.test(stockCode)) {
    return 'STAR';
  }

  if (/^3/.test(stockCode)) {
    return 'CYB';
  }

  if (/^[69]/.test(stockCode) || marketFlag === 1) {
    return 'SH';
  }

  return 'SZ';
}

function normalizePoolPrice(value: number | string | undefined) {
  const price = Number(value);

  return Number.isFinite(price) && price > 0 ? price / 1000 : 0;
}

function normalizePoolVolume(
  price: number,
  amount: number | string | undefined,
) {
  const normalizedAmount = Number(amount);

  if (!(price > 0) || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return 0;
  }

  return Number((normalizedAmount / price / 100).toFixed(2));
}

function parseLimitUpPoolItem(item: EastMoneyLimitUpPoolItem) {
  const stockCode = item.c?.trim();
  const stockName = item.n?.trim();

  if (!stockCode || !stockName) {
    return null;
  }

  const latestPoolClose = normalizePoolPrice(item.p);

  return {
    stockCode,
    stockName,
    market: resolveMarket(stockCode, item.m),
    latestPoolClose,
    latestPoolVolume: normalizePoolVolume(latestPoolClose, item.amount),
    sector: item.hybk?.trim() || undefined,
  };
}

async function fetchLimitUpPoolPage(date: string, pageIndex: number) {
  const compactDate = toCompactDateString(date);

  if (!compactDate) {
    throw new Error('invalid_limit_up_date');
  }

  const params = new URLSearchParams({
    ut: '7eea3edcaed734bea9cbfc24409ed989',
    dpt: 'wz.ztzt',
    Pageindex: String(pageIndex),
    pagesize: String(LIMIT_UP_POOL_PAGE_SIZE),
    sort: 'fbt:asc',
    date: compactDate,
  });
  const response = await fetch(`${LIMIT_UP_POOL_ENDPOINT}?${params.toString()}`, {
    cache: 'no-store',
    headers: {
      accept: 'application/json,text/plain,*/*',
    },
  });

  if (!response.ok) {
    throw new Error('limit_up_pool_unavailable');
  }

  const payload = (await response.json()) as EastMoneyLimitUpPoolResponse;

  return {
    total: Number(payload.data?.tc) || 0,
    items: payload.data?.pool ?? [],
  };
}

async function fetchLimitUpPoolByDate(date: string) {
  const firstPage = await fetchLimitUpPoolPage(date, 0);
  const totalPages = Math.max(1, Math.ceil(firstPage.total / LIMIT_UP_POOL_PAGE_SIZE));

  if (totalPages === 1) {
    return firstPage.items;
  }

  const pages = Array.from({ length: totalPages - 1 }, (_unused, index) => index + 1);
  const remainingPages = await mapWithConcurrency(
    pages,
    LIMIT_UP_POOL_CONCURRENCY,
    async (pageIndex) => (await fetchLimitUpPoolPage(date, pageIndex)).items,
  );

  return [firstPage.items, ...remainingPages].flat();
}

async function getRecentTradingDates(lookbackDays: number) {
  const historyWindow = getHistoryWindow(lookbackDays);
  const tradingCalendar = await getStockDailyHistory('000001', 'SH', {
    beg: toCompactDateString(historyWindow.beg) ?? undefined,
    end: toCompactDateString(historyWindow.end) ?? undefined,
  });

  return tradingCalendar
    .map((item) => item.tradeDate)
    .slice(-lookbackDays);
}

function aggregateLimitUpCandidates(
  poolsByDate: Array<{
    tradeDate: string;
    items: EastMoneyLimitUpPoolItem[];
  }>,
  options: {
    excludeST: boolean;
    excludeKechuang: boolean;
  },
): AggregatedLimitUpCandidate[] {
  const byStock = new Map<string, AggregatedLimitUpCandidate>();

  for (const { tradeDate, items } of poolsByDate) {
    for (const item of items) {
      const parsed = parseLimitUpPoolItem(item);

      if (!parsed) {
        continue;
      }

      if (options.excludeKechuang && /^688/.test(parsed.stockCode)) {
        continue;
      }

      if (options.excludeST && isStStockName(parsed.stockName)) {
        continue;
      }

      const existing = byStock.get(parsed.stockCode);

      if (existing) {
        existing.limitUpDates.push(tradeDate);
        existing.latestPoolClose = parsed.latestPoolClose || existing.latestPoolClose;
        existing.latestPoolVolume = parsed.latestPoolVolume || existing.latestPoolVolume;
        existing.sector = parsed.sector ?? existing.sector;
        continue;
      }

      byStock.set(parsed.stockCode, {
        stockCode: parsed.stockCode,
        stockName: parsed.stockName,
        market: parsed.market,
        limitUpDates: [tradeDate],
        latestPoolClose: parsed.latestPoolClose,
        latestPoolVolume: parsed.latestPoolVolume,
        sector: parsed.sector,
      });
    }
  }

  return Array.from(byStock.values()).map((item) => ({
    ...item,
    limitUpDates: item.limitUpDates
      .slice()
      .sort((left, right) => left.localeCompare(right)),
  }));
}

async function finalizeLimitUpCandidate(
  candidate: AggregatedLimitUpCandidate,
  options: {
    excludeNewStock: boolean;
    historyWindow: { beg: string; end: string };
  },
): Promise<LimitUpStock | null> {
  let latestClose = candidate.latestPoolClose;
  let latestVolume = candidate.latestPoolVolume;
  let historyLength = 0;

  try {
    const history = (await getStockDailyHistory(candidate.stockCode, candidate.market, {
      beg: toCompactDateString(options.historyWindow.beg) ?? undefined,
      end: toCompactDateString(options.historyWindow.end) ?? undefined,
    }))
      .slice()
      .sort((left, right) => left.tradeDate.localeCompare(right.tradeDate));

    historyLength = history.length;

    const latestBar = history.at(-1);

    if (latestBar) {
      latestClose = latestBar.close;
      latestVolume = latestBar.volume;
    }
  } catch {
    if (options.excludeNewStock) {
      return null;
    }
  }

  if (options.excludeNewStock && !hasEnoughTradingDays(historyLength)) {
    return null;
  }

  return {
    stockCode: candidate.stockCode,
    stockName: candidate.stockName,
    market: candidate.market,
    limitUpDates: candidate.limitUpDates,
    limitUpCount: candidate.limitUpDates.length,
    firstLimitUpDate: candidate.limitUpDates[0]!,
    lastLimitUpDate: candidate.limitUpDates[candidate.limitUpDates.length - 1]!,
    latestClose,
    latestVolume,
    sector: candidate.sector,
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

  const historyWindow = getHistoryWindow(lookbackDays);
  try {
    const tradingDates = await getRecentTradingDates(lookbackDays);
    const poolsByDate = await mapWithConcurrency(
      tradingDates,
      LIMIT_UP_POOL_CONCURRENCY,
      async (tradeDate) => ({
        tradeDate,
        items: await fetchLimitUpPoolByDate(tradeDate),
      }),
    );
    const candidates = aggregateLimitUpCandidates(poolsByDate, {
      excludeST,
      excludeKechuang,
    });
    const items = await mapWithConcurrency(
      candidates,
      CONCURRENCY_LIMIT,
      async (candidate) => {
        return finalizeLimitUpCandidate(candidate, {
          excludeNewStock,
          historyWindow,
        });
      },
    );

    const filteredItems = items
      .filter((item): item is LimitUpStock => Boolean(item))
      .filter((item) => item.limitUpCount >= minLimitUpCount)
      .sort((left, right) => compareLimitUpStocks(left, right, sortBy, sortOrder));

    const response: CachedLimitUpResult['response'] = {
      total: filteredItems.length,
      filterDate: tradingDates.at(-1) ?? historyWindow.end,
      lookbackDays,
      items: filteredItems,
      meta: {
        source: 'live',
      },
    };

    setCachedResponse(requestKey, response);

    return buildPagedResponse(response, page, pageSize);
  } catch {
    return buildBundledLimitUpResponse({
      lookbackDays,
      minLimitUpCount,
      excludeST,
      excludeKechuang,
      excludeNewStock,
      sortBy,
      sortOrder,
      page,
      pageSize,
    });
  }
}

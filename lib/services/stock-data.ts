import {
  DEFAULT_LISTING_TIME,
  DEFAULT_TIME_SOURCE,
  ERROR_CODES,
  type Market,
  type StockListingData,
} from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';
import {
  getCompanySurveyPrefix,
  getMarketFromCurrentAStockCode,
  getSupportedMarketFromStockCode,
} from '@/lib/markets';
import { getStockDailyHistory } from '@/lib/services/stock-history';

const EASTMONEY_SURVEY_ENDPOINT =
  'https://emweb.securities.eastmoney.com/PC_HSF10/CompanySurvey/CompanySurveyAjax?code=';
const EASTMONEY_SUGGEST_ENDPOINT =
  'https://searchapi.eastmoney.com/api/suggest/get';
const EASTMONEY_SUGGEST_TOKEN = 'D43BF722C8E33BDC906FB84D85E326E8';
const STOCK_LISTING_CACHE_TTL_MS = 4 * 60 * 60 * 1000;

type EastMoneyResponse = {
  status?: number;
  message?: string;
  jbzl?: {
    agdm?: string;
    agjc?: string;
    zqlb?: string;
  };
  fxxg?: {
    ssrq?: string;
  };
  SecurityCode?: string;
  SecurityShortName?: string;
  SecuCode?: string;
  Market?: string;
};

type EastMoneySuggestItem = {
  Code?: string;
  Name?: string;
  QuoteID?: string;
  UnifiedCode?: string;
  SecurityTypeName?: string;
};

type EastMoneySuggestResponse = {
  QuotationCodeTable?: {
    Data?: EastMoneySuggestItem[];
  };
};

type StockListingCacheEntry = {
  expiresAt: number;
  value?: StockListingData;
  promise?: Promise<StockListingData>;
};

let stockListingCache = new Map<string, StockListingCacheEntry>();

export function isStStockName(stockName: string): boolean {
  return /^(ST|\*ST|SST|S\*ST)/i.test(stockName.trim());
}

export function resetStockListingCacheForTests() {
  stockListingCache = new Map();
}

function validateStockCode(stockCode: string): string {
  const normalized = stockCode.trim();

  if (!/^\d{6}$/.test(normalized)) {
    throw new AppError(ERROR_CODES.INVALID_STOCK_CODE, 400);
  }

  return normalized;
}

function resolveSurveyMarket(payload: EastMoneyResponse): Market | null {
  const zqlb = payload.jbzl?.zqlb?.trim();

  switch (zqlb?.trim()) {
    case '上交所主板A股':
      return 'SH';
    case '深交所主板A股':
      return 'SZ';
    case '深交所创业板A股':
      return 'CYB';
    case '上交所科创板A股':
      return 'STAR';
  }

  if (payload.Market === 'BJ' || payload.SecuCode?.trim().endsWith('.BJ')) {
    return 'BJ';
  }

  return getSupportedMarketFromStockCode(
    payload.jbzl?.agdm?.trim() ||
      payload.SecurityCode?.trim() ||
      '',
  );
}

function getSurveyListingDate(payload: EastMoneyResponse): string | null {
  const listingDate = payload.fxxg?.ssrq?.trim() || null;

  return listingDate && /^\d{4}-\d{2}-\d{2}$/.test(listingDate) ? listingDate : null;
}

function extractSurveyCode(payload: EastMoneyResponse): string | null {
  return payload.jbzl?.agdm?.trim() || payload.SecurityCode?.trim() || null;
}

function extractSurveyName(payload: EastMoneyResponse): string | null {
  return payload.jbzl?.agjc?.trim() || payload.SecurityShortName?.trim() || null;
}

function getSearchResultCode(item: EastMoneySuggestItem): string | null {
  const code = item.UnifiedCode?.trim() || item.Code?.trim() || null;

  return code && /^\d{6}$/.test(code) ? code : null;
}

function isSupportedSearchResult(item: EastMoneySuggestItem): boolean {
  const securityTypeName = item.SecurityTypeName?.trim();
  const code = getSearchResultCode(item);

  if (!securityTypeName || !code) {
    return false;
  }

  return (
    securityTypeName === '沪A' ||
    securityTypeName === '深A' ||
    securityTypeName === '科创板' ||
    securityTypeName === '京A'
  );
}

function resolveSearchResultMarket(item: EastMoneySuggestItem): Market {
  const securityTypeName = item.SecurityTypeName?.trim();
  const code = getSearchResultCode(item);
  const inferredMarket = code ? getMarketFromCurrentAStockCode(code) : null;

  if (securityTypeName === '科创板') {
    return 'STAR';
  }

  if (securityTypeName === '京A' && code?.startsWith('920')) {
    return 'BJ';
  }

  if (inferredMarket) {
    return inferredMarket;
  }

  throw new AppError(ERROR_CODES.UNSUPPORTED_MARKET, 400);
}

async function fetchSurvey(stockCode: string): Promise<EastMoneyResponse | null> {
  const exchangePrefix = getCompanySurveyPrefix(stockCode);

  if (!exchangePrefix) {
    return null;
  }

  const url = `${EASTMONEY_SURVEY_ENDPOINT}${exchangePrefix}${stockCode}`;

  let response: Response;

  try {
    response = await fetch(url, {
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

  let payload: EastMoneyResponse;

  try {
    payload = (await response.json()) as EastMoneyResponse;
  } catch {
    throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
  }

  if (payload.status === -1) {
    return null;
  }

  return payload;
}

async function fetchSearchSuggestion(
  stockCode: string,
): Promise<EastMoneySuggestItem | null> {
  const params = new URLSearchParams({
    input: stockCode,
    type: '14',
    token: EASTMONEY_SUGGEST_TOKEN,
  });
  const url = `${EASTMONEY_SUGGEST_ENDPOINT}?${params.toString()}`;

  let response: Response;

  try {
    response = await fetch(url, {
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

  let payload: EastMoneySuggestResponse;

  try {
    payload = (await response.json()) as EastMoneySuggestResponse;
  } catch {
    throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
  }

  const results = payload.QuotationCodeTable?.Data ?? [];
  const supportedResults = results.filter(
    isSupportedSearchResult,
  );

  if (supportedResults.length === 0) {
    if (results.length > 0) {
      throw new AppError(ERROR_CODES.UNSUPPORTED_MARKET, 400);
    }

    return null;
  }

  const exactMatch = supportedResults.find((item) => {
    const code = getSearchResultCode(item);

    return code === stockCode || item.Code?.trim() === stockCode;
  });

  return exactMatch ?? (supportedResults.length === 1 ? supportedResults[0] ?? null : null);
}

async function getListingDateFromHistory(
  stockCode: string,
  market: Market,
): Promise<string> {
  const history = await getStockDailyHistory(stockCode, market, {
    beg: '19900101',
    end: '20500101',
  });
  const listingDate = history[0]?.tradeDate;

  if (!listingDate) {
    throw new AppError(ERROR_CODES.LISTING_DATE_MISSING, 502);
  }

  return listingDate;
}

export async function getStockListingInfo(
  stockCode: string,
): Promise<StockListingData> {
  const normalizedCode = validateStockCode(stockCode);
  const cached = stockListingCache.get(normalizedCode);

  if (cached?.value && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const promise = (async () => {
  const directSurveyPayload = await fetchSurvey(normalizedCode);
  const directSurveyCode = directSurveyPayload ? extractSurveyCode(directSurveyPayload) : null;
  const directSurveyName = directSurveyPayload ? extractSurveyName(directSurveyPayload) : null;
  const directSurveyMarket = directSurveyPayload
    ? resolveSurveyMarket(directSurveyPayload)
    : null;
  const directSurveyListingDate = directSurveyPayload
    ? getSurveyListingDate(directSurveyPayload)
    : null;

  if (directSurveyCode && directSurveyName && directSurveyMarket && directSurveyListingDate) {
    if (isStStockName(directSurveyName)) {
      throw new AppError(ERROR_CODES.ST_STOCK_UNSUPPORTED, 400);
    }

    return {
      code: directSurveyCode,
      name: directSurveyName,
      market: directSurveyMarket,
      listingDate: directSurveyListingDate,
      listingTime: DEFAULT_LISTING_TIME,
      timeSource: DEFAULT_TIME_SOURCE,
    };
  }

  if (directSurveyName && isStStockName(directSurveyName)) {
    throw new AppError(ERROR_CODES.ST_STOCK_UNSUPPORTED, 400);
  }

  const searchResult = await fetchSearchSuggestion(normalizedCode);

  if (!searchResult) {
    if (directSurveyPayload) {
      throw new AppError(ERROR_CODES.UNSUPPORTED_MARKET, 400);
    }

    throw new AppError(ERROR_CODES.STOCK_NOT_FOUND, 404);
  }

  const code = getSearchResultCode(searchResult);
  const name = searchResult.Name?.trim();

  if (!code || !name) {
    throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
  }

  if (isStStockName(name)) {
    throw new AppError(ERROR_CODES.ST_STOCK_UNSUPPORTED, 400);
  }

  const market = resolveSearchResultMarket(searchResult);
  const canonicalSurveyPayload =
    directSurveyPayload && directSurveyCode === code
      ? directSurveyPayload
      : await fetchSurvey(code);
  const canonicalSurveyMarket = canonicalSurveyPayload
    ? resolveSurveyMarket(canonicalSurveyPayload)
    : null;
  const listingDate =
    (canonicalSurveyPayload ? getSurveyListingDate(canonicalSurveyPayload) : null) ||
    directSurveyListingDate ||
    (await getListingDateFromHistory(code, market));

  return {
    code,
    name,
    market: canonicalSurveyMarket ?? market,
    listingDate,
    listingTime: DEFAULT_LISTING_TIME,
    timeSource: DEFAULT_TIME_SOURCE,
  };
  })().catch((error) => {
    stockListingCache.delete(normalizedCode);
    throw error;
  });

  stockListingCache.set(normalizedCode, {
    expiresAt: Date.now() + STOCK_LISTING_CACHE_TTL_MS,
    promise,
  });

  const result = await promise;

  stockListingCache.set(normalizedCode, {
    expiresAt: Date.now() + STOCK_LISTING_CACHE_TTL_MS,
    value: result,
  });

  return result;
}

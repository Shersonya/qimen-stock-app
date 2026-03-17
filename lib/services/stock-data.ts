import {
  DEFAULT_LISTING_TIME,
  DEFAULT_TIME_SOURCE,
  ERROR_CODES,
  type Market,
  type StockListingData,
} from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';

const EASTMONEY_ENDPOINT =
  'https://emweb.securities.eastmoney.com/PC_HSF10/CompanySurvey/CompanySurveyAjax?code=';

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
};

export function isStStockName(stockName: string): boolean {
  return /^(ST|\*ST|SST|S\*ST)/i.test(stockName.trim());
}

function validateStockCode(stockCode: string): string {
  const normalized = stockCode.trim();

  if (!/^\d{6}$/.test(normalized)) {
    throw new AppError(ERROR_CODES.INVALID_STOCK_CODE, 400);
  }

  return normalized;
}

function getExchangePrefix(stockCode: string): 'SH' | 'SZ' {
  if (/^[69]/.test(stockCode)) {
    return 'SH';
  }

  if (/^[023]/.test(stockCode)) {
    return 'SZ';
  }

  throw new AppError(ERROR_CODES.INVALID_STOCK_CODE, 400);
}

function resolveMarket(zqlb?: string): Market {
  switch (zqlb?.trim()) {
    case '上交所主板A股':
      return 'SH';
    case '深交所主板A股':
      return 'SZ';
    case '深交所创业板A股':
      return 'CYB';
    default:
      throw new AppError(ERROR_CODES.UNSUPPORTED_MARKET, 400);
  }
}

function getListingDate(payload: EastMoneyResponse): string {
  const listingDate = payload.fxxg?.ssrq?.trim();

  if (!listingDate) {
    throw new AppError(ERROR_CODES.LISTING_DATE_MISSING, 502);
  }

  return listingDate;
}

async function fetchSurvey(stockCode: string): Promise<EastMoneyResponse> {
  const exchangePrefix = getExchangePrefix(stockCode);
  const url = `${EASTMONEY_ENDPOINT}${exchangePrefix}${stockCode}`;

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
    throw new AppError(ERROR_CODES.STOCK_NOT_FOUND, 404);
  }

  return payload;
}

export async function getStockListingInfo(
  stockCode: string,
): Promise<StockListingData> {
  const normalizedCode = validateStockCode(stockCode);
  const payload = await fetchSurvey(normalizedCode);

  const code = payload.jbzl?.agdm?.trim();
  const name = payload.jbzl?.agjc?.trim();

  if (!code || !name) {
    throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
  }

  if (isStStockName(name)) {
    throw new AppError(ERROR_CODES.ST_STOCK_UNSUPPORTED, 400);
  }

  return {
    code,
    name,
    market: resolveMarket(payload.jbzl?.zqlb),
    listingDate: getListingDate(payload),
    listingTime: DEFAULT_LISTING_TIME,
    timeSource: DEFAULT_TIME_SOURCE,
  };
}

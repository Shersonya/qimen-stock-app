import {
  ERROR_CODES,
  type Market,
} from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';
import { getEastMoneySecIdPrefix } from '@/lib/markets';

const EASTMONEY_QUOTE_ENDPOINT =
  'https://push2.eastmoney.com/api/qt/stock/get';

type EastMoneyQuoteResponse = {
  data?: {
    f46?: number | string;
  };
};

export function normalizeOpenPrice(
  rawOpenPrice: number | string | undefined | null,
): string | null {
  if (rawOpenPrice === undefined || rawOpenPrice === null || rawOpenPrice === '') {
    return null;
  }

  const numericValue =
    typeof rawOpenPrice === 'number'
      ? rawOpenPrice
      : Number(String(rawOpenPrice).trim());

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return (numericValue / 100).toFixed(2);
}

export async function getStockOpenPrice(
  stockCode: string,
  market: Market,
): Promise<string | null> {
  const secid = `${getEastMoneySecIdPrefix(market)}.${stockCode}`;
  const url = `${EASTMONEY_QUOTE_ENDPOINT}?secid=${secid}&fields=f46`;

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

  let payload: EastMoneyQuoteResponse;

  try {
    payload = (await response.json()) as EastMoneyQuoteResponse;
  } catch {
    throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
  }

  return normalizeOpenPrice(payload.data?.f46);
}

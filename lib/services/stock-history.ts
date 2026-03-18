import {
  ERROR_CODES,
  type Market,
} from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';

const EASTMONEY_HISTORY_ENDPOINT =
  'https://push2his.eastmoney.com/api/qt/stock/kline/get';

export type StockHistoryPoint = {
  tradeDate: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
};

type EastMoneyHistoryResponse = {
  data?: {
    klines?: string[];
  };
};

type HistoryOptions = {
  beg?: string;
  end?: string;
};

function getSecIdPrefix(market: Market): '0' | '1' {
  return market === 'SH' ? '1' : '0';
}

function normalizeHistoryNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = Number(value.trim());

  return Number.isFinite(normalized) ? normalized : null;
}

export function parseHistoryKlineRow(row: string): StockHistoryPoint | null {
  const [
    tradeDate = '',
    open = '',
    close = '',
    high = '',
    low = '',
    volume = '',
    amount = '',
  ] = row.split(',');

  const parsedOpen = normalizeHistoryNumber(open);
  const parsedClose = normalizeHistoryNumber(close);
  const parsedHigh = normalizeHistoryNumber(high);
  const parsedLow = normalizeHistoryNumber(low);
  const parsedVolume = normalizeHistoryNumber(volume);
  const parsedAmount = normalizeHistoryNumber(amount);

  if (
    !tradeDate ||
    parsedOpen === null ||
    parsedClose === null ||
    parsedHigh === null ||
    parsedLow === null ||
    parsedVolume === null ||
    parsedAmount === null
  ) {
    return null;
  }

  return {
    tradeDate,
    open: parsedOpen,
    close: parsedClose,
    high: parsedHigh,
    low: parsedLow,
    volume: parsedVolume,
    amount: parsedAmount,
  };
}

export async function getStockDailyHistory(
  stockCode: string,
  market: Market,
  options: HistoryOptions = {},
): Promise<StockHistoryPoint[]> {
  const secid = `${getSecIdPrefix(market)}.${stockCode}`;
  const params = new URLSearchParams({
    secid,
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58',
    klt: '101',
    fqt: '1',
    beg: options.beg ?? '20240101',
    end: options.end ?? '20500101',
  });
  const url = `${EASTMONEY_HISTORY_ENDPOINT}?${params.toString()}`;

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

  let payload: EastMoneyHistoryResponse;

  try {
    payload = (await response.json()) as EastMoneyHistoryResponse;
  } catch {
    throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
  }

  return (payload.data?.klines ?? [])
    .map(parseHistoryKlineRow)
    .filter((item): item is StockHistoryPoint => Boolean(item));
}

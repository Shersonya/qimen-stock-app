import {
  ERROR_CODES,
  type Market,
} from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';

const EASTMONEY_HISTORY_ENDPOINT =
  'https://push2his.eastmoney.com/api/qt/stock/kline/get';
const HISTORY_FETCH_RETRY_COUNT = 3;
const HISTORY_FETCH_RETRY_DELAY_MS = 250;

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

function normalizeHistoryDateParam(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim();

  if (/^\d{8}$/.test(normalized)) {
    return normalized;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized.replace(/-/g, '');
  }

  return fallback;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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
    beg: normalizeHistoryDateParam(options.beg, '20240101'),
    end: normalizeHistoryDateParam(options.end, '20500101'),
  });
  const url = `${EASTMONEY_HISTORY_ENDPOINT}?${params.toString()}`;
  let payload: EastMoneyHistoryResponse | null = null;

  for (let attempt = 1; attempt <= HISTORY_FETCH_RETRY_COUNT; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          accept: 'application/json,text/plain,*/*',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          referer: 'https://quote.eastmoney.com/',
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
      }

      payload = (await response.json()) as EastMoneyHistoryResponse;
      break;
    } catch {
      if (attempt >= HISTORY_FETCH_RETRY_COUNT) {
        throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
      }

      await delay(HISTORY_FETCH_RETRY_DELAY_MS * attempt);
    }
  }

  return (payload?.data?.klines ?? [])
    .map(parseHistoryKlineRow)
    .filter((item): item is StockHistoryPoint => Boolean(item));
}

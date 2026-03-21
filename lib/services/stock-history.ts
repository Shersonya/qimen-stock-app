import {
  ERROR_CODES,
  type Market,
} from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';

const EASTMONEY_HISTORY_ENDPOINT =
  'https://push2his.eastmoney.com/api/qt/stock/kline/get';
const TENCENT_HISTORY_ENDPOINT =
  'https://web.ifzq.gtimg.cn/appstock/app/newfqkline/get';
const HISTORY_FETCH_RETRY_COUNT = 3;
const HISTORY_FETCH_RETRY_DELAY_MS = 250;
const TENCENT_HISTORY_MAX_COUNT = 800;
const EASTMONEY_FAILURE_COOLDOWN_MS = 5 * 60 * 1000;

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

type TencentHistoryResponse = {
  code?: number;
  data?: Record<
    string,
    {
      qfqday?: unknown[][];
      day?: unknown[][];
    }
  >;
};

type HistoryOptions = {
  beg?: string;
  end?: string;
};

let eastMoneyDisabledUntil = 0;

export function resetStockHistoryStateForTests() {
  eastMoneyDisabledUntil = 0;
}

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

function compactDateToDashed(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }

  return value;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getSecIdPrefix(market: Market): '0' | '1' {
  return market === 'SH' ? '1' : '0';
}

function getTencentSecIdPrefix(market: Market): 'sh' | 'sz' {
  return market === 'SH' ? 'sh' : 'sz';
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

function parseTencentHistoryRow(row: unknown[]): StockHistoryPoint | null {
  const [
    tradeDateRaw,
    openRaw,
    closeRaw,
    highRaw,
    lowRaw,
    volumeRaw,
    ,
    ,
    amountWanRaw,
  ] = row;
  const tradeDate =
    typeof tradeDateRaw === 'string' ? compactDateToDashed(tradeDateRaw.trim()) : '';
  const open = normalizeHistoryNumber(String(openRaw ?? ''));
  const close = normalizeHistoryNumber(String(closeRaw ?? ''));
  const high = normalizeHistoryNumber(String(highRaw ?? ''));
  const low = normalizeHistoryNumber(String(lowRaw ?? ''));
  const volume = normalizeHistoryNumber(String(volumeRaw ?? ''));
  const amountWan = normalizeHistoryNumber(String(amountWanRaw ?? ''));

  if (
    !tradeDate ||
    open === null ||
    close === null ||
    high === null ||
    low === null ||
    volume === null
  ) {
    return null;
  }

  return {
    tradeDate,
    open,
    close,
    high,
    low,
    volume,
    amount:
      amountWan !== null ? amountWan * 10000 : Math.round(close * volume * 100),
  };
}

async function fetchEastMoneyHistory(url: string): Promise<EastMoneyHistoryResponse> {
  if (Date.now() < eastMoneyDisabledUntil) {
    throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
  }

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

      const payload = (await response.json()) as EastMoneyHistoryResponse;

      eastMoneyDisabledUntil = 0;

      return payload;
    } catch {
      if (attempt >= HISTORY_FETCH_RETRY_COUNT) {
        eastMoneyDisabledUntil = Date.now() + EASTMONEY_FAILURE_COOLDOWN_MS;
        throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
      }

      await delay(HISTORY_FETCH_RETRY_DELAY_MS * attempt);
    }
  }

  throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
}

async function fetchTencentHistory(
  stockCode: string,
  market: Market,
  options: Required<HistoryOptions>,
): Promise<StockHistoryPoint[]> {
  const secid = `${getTencentSecIdPrefix(market)}${stockCode}`;
  const url = `${TENCENT_HISTORY_ENDPOINT}?param=${secid},day,,,${TENCENT_HISTORY_MAX_COUNT},qfq`;
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
  }

  const payload = (await response.json()) as TencentHistoryResponse;
  const record = payload.data?.[secid];
  const rows = record?.qfqday ?? record?.day ?? [];
  const beg = compactDateToDashed(options.beg);
  const end = compactDateToDashed(options.end);

  return rows
    .map((row) => (Array.isArray(row) ? parseTencentHistoryRow(row) : null))
    .filter((item): item is StockHistoryPoint => Boolean(item))
    .filter((item) => item.tradeDate >= beg && item.tradeDate <= end);
}

export async function getStockDailyHistory(
  stockCode: string,
  market: Market,
  options: HistoryOptions = {},
): Promise<StockHistoryPoint[]> {
  const normalizedOptions = {
    beg: normalizeHistoryDateParam(options.beg, '20240101'),
    end: normalizeHistoryDateParam(options.end, '20500101'),
  };
  const secid = `${getSecIdPrefix(market)}.${stockCode}`;
  const params = new URLSearchParams({
    secid,
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58',
    klt: '101',
    fqt: '1',
    beg: normalizedOptions.beg,
    end: normalizedOptions.end,
  });
  const url = `${EASTMONEY_HISTORY_ENDPOINT}?${params.toString()}`;
  try {
    const payload = await fetchEastMoneyHistory(url);

    return (payload.data?.klines ?? [])
      .map(parseHistoryKlineRow)
      .filter((item): item is StockHistoryPoint => Boolean(item));
  } catch {
    try {
      return await fetchTencentHistory(stockCode, market, normalizedOptions);
    } catch {
      throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
    }
  }
}

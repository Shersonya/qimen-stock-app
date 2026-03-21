import {
  ERROR_CODES,
  type Market,
} from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';
import {
  getDateRangeLength,
  normalizeDateString,
} from '@/lib/utils/date';

const EASTMONEY_HISTORY_ENDPOINT =
  'https://push2his.eastmoney.com/api/qt/stock/kline/get';
const SINA_HISTORY_ENDPOINT = 'https://quotes.sina.cn/cn/api/jsonp_v2.php';
const DEFAULT_SINA_DATA_LENGTH = 480;
const MAX_SINA_DATA_LENGTH = 1000;

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

type SinaHistoryRow = {
  day?: string;
  open?: string;
  close?: string;
  high?: string;
  low?: string;
  volume?: string;
};

type HistoryOptions = {
  beg?: string;
  end?: string;
};

function getSecIdPrefix(market: Market): '0' | '1' {
  return market === 'SH' ? '1' : '0';
}

function getSinaSymbol(stockCode: string, market: Market) {
  return `${market === 'SH' ? 'sh' : 'sz'}${stockCode}`;
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

export function parseSinaHistoryKlineRow(row: SinaHistoryRow): StockHistoryPoint | null {
  const tradeDate = normalizeDateString(row.day);
  const open = normalizeHistoryNumber(row.open);
  const close = normalizeHistoryNumber(row.close);
  const high = normalizeHistoryNumber(row.high);
  const low = normalizeHistoryNumber(row.low);
  const volume = normalizeHistoryNumber(row.volume);

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
    amount: Number((close * volume * 100).toFixed(2)),
  };
}

export function parseSinaHistoryJsonp(payload: string): StockHistoryPoint[] | null {
  const sanitized = payload
    .replace(/^\/\*[\s\S]*?\*\/\s*/, '')
    .trim();
  const match = sanitized.match(/^(?:var\s+)?[\w$]+\s*=\s*([\s\S]+);?\s*$/);

  if (!match) {
    return null;
  }

  let rows: unknown;

  try {
    const raw = match[1].trim().replace(/;$/, '');
    const json =
      raw.startsWith('(') && raw.endsWith(')')
        ? raw.slice(1, -1)
        : raw;
    rows = JSON.parse(json);
  } catch {
    return null;
  }

  if (!Array.isArray(rows)) {
    return null;
  }

  return rows
    .map((row) => parseSinaHistoryKlineRow(row as SinaHistoryRow))
    .filter((item): item is StockHistoryPoint => Boolean(item));
}

function filterHistoryByDateRange(
  items: StockHistoryPoint[],
  options: HistoryOptions,
) {
  const beg = normalizeDateString(options.beg);
  const end = normalizeDateString(options.end);

  return items.filter((item) => {
    if (beg && item.tradeDate < beg) {
      return false;
    }

    if (end && item.tradeDate > end) {
      return false;
    }

    return true;
  });
}

function getSinaDataLength(options: HistoryOptions) {
  const rangeLength = getDateRangeLength(options);

  if (rangeLength === null) {
    return DEFAULT_SINA_DATA_LENGTH;
  }

  return Math.min(Math.max(rangeLength + 120, 180), MAX_SINA_DATA_LENGTH);
}

async function fetchEastMoneyHistory(url: string) {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      accept: 'application/json,text/plain,*/*',
    },
  });

  if (!response.ok) {
    throw new Error('eastmoney_history_unavailable');
  }

  const payload = (await response.json()) as EastMoneyHistoryResponse;

  return (payload.data?.klines ?? [])
    .map(parseHistoryKlineRow)
    .filter((item): item is StockHistoryPoint => Boolean(item));
}

async function fetchSinaHistory(
  stockCode: string,
  market: Market,
  options: HistoryOptions,
) {
  const datalen = getSinaDataLength(options);
  const url =
    `${SINA_HISTORY_ENDPOINT}/var%20_history=` +
    `/CN_MarketDataService.getKLineData?symbol=${getSinaSymbol(stockCode, market)}` +
    `&scale=240&ma=no&datalen=${datalen}`;
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      accept: '*/*',
    },
  });

  if (!response.ok) {
    throw new Error('sina_history_unavailable');
  }

  const text = await response.text();
  const parsed = parseSinaHistoryJsonp(text);

  if (!parsed) {
    throw new Error('sina_history_invalid_payload');
  }

  return filterHistoryByDateRange(parsed, options);
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

  try {
    return await fetchEastMoneyHistory(url);
  } catch {
    try {
      return await fetchSinaHistory(stockCode, market, options);
    } catch {
      throw new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502);
    }
  }
}

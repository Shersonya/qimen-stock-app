import type { Market } from '@/lib/contracts/qimen';
import { getEastMoneySecIdPrefix } from '@/lib/markets';

const EASTMONEY_INTRADAY_ENDPOINT =
  'https://push2his.eastmoney.com/api/qt/stock/kline/get';
const INTRADAY_LOOKBACK_MINUTES = 80;

export type StockIntradayPoint = {
  time: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
};

function normalizeIntradayNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = Number(value.trim());

  return Number.isFinite(normalized) ? normalized : null;
}

export function parseEastMoneyIntradayRow(row: string): StockIntradayPoint | null {
  const [
    time = '',
    open = '',
    close = '',
    high = '',
    low = '',
    volume = '',
    amount = '',
  ] = row.split(',');
  const parsedOpen = normalizeIntradayNumber(open);
  const parsedClose = normalizeIntradayNumber(close);
  const parsedHigh = normalizeIntradayNumber(high);
  const parsedLow = normalizeIntradayNumber(low);
  const parsedVolume = normalizeIntradayNumber(volume);
  const parsedAmount = normalizeIntradayNumber(amount);

  if (
    !time ||
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
    time,
    open: parsedOpen,
    close: parsedClose,
    high: parsedHigh,
    low: parsedLow,
    volume: parsedVolume,
    amount: parsedAmount,
  };
}

export function calculateTenMinuteSpeed(points: StockIntradayPoint[]): number | null {
  if (points.length < 11) {
    return null;
  }

  const current = points[points.length - 1];
  const previous = points[Math.max(0, points.length - 11)];

  if (!current || !previous || previous.close <= 0) {
    return null;
  }

  return Number(((current.close - previous.close) / previous.close).toFixed(4));
}

export async function getStockIntradaySpeed10m(
  stockCode: string,
  market: Market,
): Promise<number | null> {
  const secid = `${getEastMoneySecIdPrefix(market)}.${stockCode}`;
  const params = new URLSearchParams({
    secid,
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57',
    klt: '1',
    fqt: '1',
    lmt: String(INTRADAY_LOOKBACK_MINUTES),
    end: '20500101',
  });

  let response: Response;

  try {
    response = await fetch(`${EASTMONEY_INTRADAY_ENDPOINT}?${params.toString()}`, {
      cache: 'no-store',
      headers: {
        accept: 'application/json,text/plain,*/*',
        referer: 'https://quote.eastmoney.com/',
      },
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  try {
    const payload = (await response.json()) as { data?: { klines?: string[] } };
    const points = (payload.data?.klines ?? [])
      .map(parseEastMoneyIntradayRow)
      .filter((item): item is StockIntradayPoint => Boolean(item));

    return calculateTenMinuteSpeed(points);
  } catch {
    return null;
  }
}

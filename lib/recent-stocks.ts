export const RECENT_STOCK_CODES_STORAGE_KEY = 'qimen-stock-recent-codes';
const RECENT_STOCK_CODES_LIMIT = 10;

export function readRecentStockCodes() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(RECENT_STOCK_CODES_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === 'string' && /^\d{6}$/.test(item))
      .slice(0, RECENT_STOCK_CODES_LIMIT);
  } catch {
    return [];
  }
}

export function writeRecentStockCodes(stockCodes: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      RECENT_STOCK_CODES_STORAGE_KEY,
      JSON.stringify(stockCodes),
    );
  } catch {
    // Ignore local storage failures to keep the primary workflow usable.
  }
}

export function prependRecentStockCode(stockCodes: string[], stockCode: string) {
  return [stockCode, ...stockCodes.filter((item) => item !== stockCode)].slice(
    0,
    RECENT_STOCK_CODES_LIMIT,
  );
}

import { MOCK_STOCKS, type StockSearchItem } from '@/data/stocks';

export const STOCK_SEARCH_EMPTY_MESSAGE =
  '未找到匹配股票，请尝试输入完整代码或更准确的名称';
export const STOCK_SEARCH_AMBIGUOUS_MESSAGE =
  '匹配结果较多，请先从候选列表中选择股票。';
export const STOCK_SEARCH_REQUIRED_MESSAGE = '请输入股票代码或名称后再起局。';
export const STOCK_SEARCH_INVALID_CODE_MESSAGE = '股票代码不存在';

export type StockSearchMatchType =
  | 'code-exact'
  | 'mixed'
  | 'code-prefix'
  | 'name-exact'
  | 'name-prefix'
  | 'name-contains'
  | 'alias-exact'
  | 'alias-prefix'
  | 'alias-contains'
  | 'label-contains';

export type StockSearchSuggestion = StockSearchItem & {
  score: number;
  matchType: StockSearchMatchType;
};

export type StockResolution =
  | {
      stock: StockSearchItem;
      suggestions: StockSearchSuggestion[];
      isConfident: true;
      reason: 'exact-code' | 'exact-name' | 'exact-alias' | 'single-match';
      errorMessage?: undefined;
    }
  | {
      stock: null;
      suggestions: StockSearchSuggestion[];
      isConfident: false;
      reason: 'empty' | 'invalid-code' | 'not-found' | 'ambiguous';
      errorMessage: string;
    };

function normalizeQuery(value: string) {
  return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, '');
}

function normalizeAliases(aliases: string[] | undefined) {
  return (aliases ?? []).map((alias) => normalizeQuery(alias));
}

function createSuggestion(
  stock: StockSearchItem,
  score: number,
  matchType: StockSearchMatchType,
): StockSearchSuggestion {
  return {
    ...stock,
    score,
    matchType,
  };
}

function buildSuggestion(
  stock: StockSearchItem,
  rawQuery: string,
): StockSearchSuggestion | null {
  const query = normalizeQuery(rawQuery);

  if (!query) {
    return null;
  }

  const code = stock.code;
  const name = normalizeQuery(stock.name);
  const aliases = normalizeAliases(stock.aliases);
  const digits = query.replace(/\D/g, '');
  const text = query.replace(/\d/g, '');
  const combined = normalizeQuery(`${stock.code}${stock.name}${(stock.aliases ?? []).join('')}`);

  if (query === code) {
    return createSuggestion(stock, 1000, 'code-exact');
  }

  if (
    digits &&
    text &&
    code.startsWith(digits) &&
    (name.includes(text) ||
      aliases.some((alias) => alias.includes(text)) ||
      combined.includes(query))
  ) {
    return createSuggestion(stock, 930 + digits.length + text.length, 'mixed');
  }

  if (/^\d+$/.test(query) && code.startsWith(query)) {
    return createSuggestion(stock, 900 + query.length, 'code-prefix');
  }

  if (query === name) {
    return createSuggestion(stock, 800, 'name-exact');
  }

  if (name.startsWith(query)) {
    return createSuggestion(stock, 720 + query.length, 'name-prefix');
  }

  if (name.includes(query)) {
    return createSuggestion(stock, 620 + query.length, 'name-contains');
  }

  if (aliases.some((alias) => alias === query)) {
    return createSuggestion(stock, 520, 'alias-exact');
  }

  if (aliases.some((alias) => alias.startsWith(query))) {
    return createSuggestion(stock, 470 + query.length, 'alias-prefix');
  }

  if (aliases.some((alias) => alias.includes(query))) {
    return createSuggestion(stock, 420 + query.length, 'alias-contains');
  }

  if (combined.includes(query)) {
    return createSuggestion(stock, 320 + query.length, 'label-contains');
  }

  return null;
}

function compareSuggestions(
  left: StockSearchSuggestion,
  right: StockSearchSuggestion,
) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  return left.code.localeCompare(right.code, 'zh-Hans-CN');
}

function hasStrongSpecificity(query: string) {
  const normalized = normalizeQuery(query);

  if (!normalized) {
    return false;
  }

  if (/^\d+$/.test(normalized)) {
    return normalized.length >= 3;
  }

  return normalized.length >= 2;
}

export function formatStockDisplay(stock: Pick<StockSearchItem, 'code' | 'name'>) {
  return `${stock.code} ${stock.name}`;
}

export function findStockByCode(
  code: string,
  stocks: StockSearchItem[] = MOCK_STOCKS,
) {
  return stocks.find((stock) => stock.code === code.trim()) ?? null;
}

export function searchStocks(
  query: string,
  stocks: StockSearchItem[] = MOCK_STOCKS,
  limit = 12,
) {
  return stocks
    .map((stock) => buildSuggestion(stock, query))
    .filter((item): item is StockSearchSuggestion => item !== null)
    .sort(compareSuggestions)
    .slice(0, limit);
}

export function resolveStock(
  input: string,
  stocks: StockSearchItem[] = MOCK_STOCKS,
): StockResolution {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      stock: null,
      suggestions: [],
      isConfident: false,
      reason: 'empty',
      errorMessage: STOCK_SEARCH_REQUIRED_MESSAGE,
    };
  }

  const inlineCodeMatch = trimmed.match(/^(\d{6})(?:\s|$)/);

  if (inlineCodeMatch?.[1]) {
    const matchedStock = findStockByCode(inlineCodeMatch[1], stocks);

    if (matchedStock) {
      return {
        stock: matchedStock,
        suggestions: searchStocks(trimmed, stocks),
        isConfident: true,
        reason: 'exact-code',
      };
    }
  }

  const compact = normalizeQuery(trimmed);

  if (/^\d{6}$/.test(compact)) {
    const matchedStock = findStockByCode(compact, stocks);

    if (matchedStock) {
      return {
        stock: matchedStock,
        suggestions: searchStocks(trimmed, stocks),
        isConfident: true,
        reason: 'exact-code',
      };
    }

    return {
      stock: null,
      suggestions: [],
      isConfident: false,
      reason: 'invalid-code',
      errorMessage: STOCK_SEARCH_INVALID_CODE_MESSAGE,
    };
  }

  const suggestions = searchStocks(trimmed, stocks);

  if (suggestions.length === 0) {
    return {
      stock: null,
      suggestions,
      isConfident: false,
      reason: 'not-found',
      errorMessage: STOCK_SEARCH_EMPTY_MESSAGE,
    };
  }

  const [topMatch] = suggestions;

  if (topMatch.matchType === 'name-exact') {
    return {
      stock: topMatch,
      suggestions,
      isConfident: true,
      reason: 'exact-name',
    };
  }

  if (topMatch.matchType === 'alias-exact') {
    return {
      stock: topMatch,
      suggestions,
      isConfident: true,
      reason: 'exact-alias',
    };
  }

  if (suggestions.length === 1 && hasStrongSpecificity(trimmed)) {
    return {
      stock: topMatch,
      suggestions,
      isConfident: true,
      reason: 'single-match',
    };
  }

  return {
    stock: null,
    suggestions,
    isConfident: false,
    reason: 'ambiguous',
    errorMessage: STOCK_SEARCH_AMBIGUOUS_MESSAGE,
  };
}

export function getBestMatch(
  query: string,
  stocks: StockSearchItem[] = MOCK_STOCKS,
) {
  const resolution = resolveStock(query, stocks);

  return resolution.isConfident ? resolution.stock : null;
}

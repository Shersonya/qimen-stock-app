import type { Market } from '@/lib/contracts/qimen';

export function getMarketFromCurrentAStockCode(stockCode: string): Market | null {
  const normalizedCode = stockCode.trim();

  if (/^688\d{3}$/.test(normalizedCode)) {
    return 'STAR';
  }

  if (/^920\d{3}$/.test(normalizedCode)) {
    return 'BJ';
  }

  if (/^3\d{5}$/.test(normalizedCode)) {
    return 'CYB';
  }

  if (/^(0|2)\d{5}$/.test(normalizedCode)) {
    return 'SZ';
  }

  if (/^[69]\d{5}$/.test(normalizedCode)) {
    return 'SH';
  }

  return null;
}

export function getSupportedMarketFromStockCode(stockCode: string): Market | null {
  const currentMarket = getMarketFromCurrentAStockCode(stockCode);

  if (currentMarket) {
    return currentMarket;
  }

  return /^[48]\d{5}$/.test(stockCode.trim()) ? 'BJ' : null;
}

export function getCompanySurveyPrefix(stockCode: string): 'SH' | 'SZ' | 'BJ' | null {
  const market = getSupportedMarketFromStockCode(stockCode);

  switch (market) {
    case 'SH':
    case 'STAR':
      return 'SH';
    case 'SZ':
    case 'CYB':
      return 'SZ';
    case 'BJ':
      return 'BJ';
    default:
      return null;
  }
}

export function getEastMoneySecIdPrefix(market: Market): '0' | '1' {
  return market === 'SH' || market === 'STAR' ? '1' : '0';
}

export function getTencentMarketPrefix(market: Market): 'sh' | 'sz' | 'bj' {
  switch (market) {
    case 'SH':
    case 'STAR':
      return 'sh';
    case 'BJ':
      return 'bj';
    case 'SZ':
    case 'CYB':
    default:
      return 'sz';
  }
}

export function getSinaMarketPrefix(market: Market): 'sh' | 'sz' | 'bj' {
  return getTencentMarketPrefix(market);
}

export function getExchangeByMarket(market: Market): 'SSE' | 'SZSE' | 'BSE' {
  switch (market) {
    case 'SH':
    case 'STAR':
      return 'SSE';
    case 'BJ':
      return 'BSE';
    case 'SZ':
    case 'CYB':
    default:
      return 'SZSE';
  }
}

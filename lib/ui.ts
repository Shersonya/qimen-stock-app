import type { Market, QimenPalace } from '@/lib/contracts/qimen';

export type BoardViewState = 'idle' | 'loading' | 'ready';

export const MARKET_OPTIONS: Array<{
  value: Market;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    value: 'SH',
    label: '沪市主板',
    shortLabel: '沪市',
    description: '镇盘稳重，适合观察主板龙头气势。',
  },
  {
    value: 'SZ',
    label: '深市主板',
    shortLabel: '深市',
    description: '节奏偏灵动，适合观察主板活跃轮动。',
  },
  {
    value: 'CYB',
    label: '创业板',
    shortLabel: '创业板',
    description: '成长风格更强，适合观察题材势能。',
  },
] as const;

export const SAMPLE_CODES_BY_MARKET: Record<Market, string[]> = {
  SH: ['600519', '601318', '600036'],
  SZ: ['000001', '000333', '002594'],
  CYB: ['300750', '300059', '300308'],
};

export function getMarketLabel(market: Market) {
  return (
    MARKET_OPTIONS.find((option) => option.value === market)?.label ?? market
  );
}

export function getMarketShortLabel(market: Market) {
  return (
    MARKET_OPTIONS.find((option) => option.value === market)?.shortLabel ?? market
  );
}

export function getMarketDescription(market: Market) {
  return (
    MARKET_OPTIONS.find((option) => option.value === market)?.description ?? ''
  );
}

export function getReferenceBoardKeyFromMarket(market: Market) {
  switch (market) {
    case 'SH':
      return 'sh';
    case 'SZ':
      return 'sz';
    case 'CYB':
    default:
      return 'cyb';
  }
}

export function getMarketFromStockCode(stockCode: string): Market | null {
  const normalizedCode = stockCode.trim();

  if (/^[69]/.test(normalizedCode)) {
    return 'SH';
  }

  if (/^3/.test(normalizedCode)) {
    return 'CYB';
  }

  if (/^[02]/.test(normalizedCode)) {
    return 'SZ';
  }

  return null;
}

export function getDefaultPalaceIndex(palaces: QimenPalace[]) {
  const centerPalaceIndex = palaces.findIndex((palace) => palace.position === 5);

  return centerPalaceIndex >= 0 ? centerPalaceIndex : 0;
}

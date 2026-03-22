import payload from '@/data/market-screen-fallback.generated.json';

export type BundledMarketScreenSnapshot = {
  generatedAt: string;
  sourceFilterDate: string;
  items: Array<{
    stock: {
      code: string;
      name: string;
      market: 'SH' | 'SZ' | 'CYB';
      listingDate: string;
      sector?: string | null;
    };
    hourWindow: {
      stem: string;
      palaceName: string;
      position: number;
      door: string;
      star: string;
      god: string;
    };
    dayWindow: {
      stem: string;
      palaceName: string;
      position: number;
      door: string;
      star: string;
      god: string;
    };
    monthWindow: {
      stem: string;
      palaceName: string;
      position: number;
      door: string;
      star: string;
      god: string;
    };
    patternInput: {
      stock_id: string;
      stock_name: string;
      qimen_data: {
        天盘干: string[];
        地盘干: string[];
        门盘: string[];
        神盘: string[];
        宫位信息: Array<{
          id: number;
          五行: string;
          八卦: string;
        }>;
        值使门: string;
        全局时间: {
          日干支: string;
          时干支: string;
          是否伏吟: boolean;
        };
      };
    };
  }>;
};

export function getBundledMarketScreenSnapshot(): BundledMarketScreenSnapshot {
  return payload as BundledMarketScreenSnapshot;
}

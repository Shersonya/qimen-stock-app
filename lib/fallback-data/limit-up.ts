import type { LimitUpStock } from '@/lib/contracts/strategy';
import payload from '@/data/limit-up-fallback.generated.json';

export type BundledLimitUpSnapshot = {
  generatedAt: string;
  filterDate: string;
  lookbackDays: number;
  tradingDates: string[];
  items: Array<
    LimitUpStock & {
      isNewStockCandidate?: boolean;
    }
  >;
};

export function getBundledLimitUpSnapshot(): BundledLimitUpSnapshot {
  return payload as BundledLimitUpSnapshot;
}

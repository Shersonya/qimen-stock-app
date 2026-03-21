import type { Market } from '@/lib/contracts/qimen';

export interface KLineBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
}

export interface ExtendedKLineBar extends KLineBar {
  circulatingShares?: number;
}

export type TdxIndicatorKey = `X_${number}`;
type TdxIndicatorSlotMap = Record<TdxIndicatorKey, number | boolean>;

export interface TdxIndicatorNamedFields {
  virtualVolume: number;
  realVolume: number;
  volumeRatio: number;
  angle20: number;
  biasRate: number;
  trueC: number;
  trueCGain: number;
  MA5: number;
  MA10: number;
  MA20: number;
  MA60: number;
  MA120: number;
  maUp: boolean;
  fiveLinesBull: boolean;
  meiZhu: number;
  shadowPressure: number;
  meiYangYang: boolean;
}

export interface TdxIndicatorResult
  extends TdxIndicatorSlotMap, TdxIndicatorNamedFields {}

export interface TdxScanResult {
  stockCode: string;
  stockName: string;
  market: Market;
  signalDate: string;
  closePrice: number;
  volume: number;
  meiZhu: boolean;
  meiYangYang: boolean;
  meiZhuDate?: string;
  signalStrength: number;
  trueCGain: number;
  maUp: boolean;
  fiveLinesBull: boolean;
  biasRate: number;
  volumeRatio: number;
}

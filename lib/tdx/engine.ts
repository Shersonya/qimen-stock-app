import { isStStockName } from '@/lib/services/stock-data';
import { BARSLAST, COUNT, LLV, MA } from '@/lib/tdx/indicators';
import type { ExtendedKLineBar, TdxIndicatorResult } from '@/lib/tdx/types';

function refNumber(values: number[], index: number, offset: number, fallback = 0): number {
  const target = index - offset;

  return target >= 0 ? values[target] ?? fallback : fallback;
}

function refBoolean(values: boolean[], index: number, offset: number): boolean {
  const target = index - offset;

  return target >= 0 ? values[target] ?? false : false;
}

function safeDivide(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : numerator / denominator;
}

function percentChange(current: number, previous: number) {
  return previous === 0 ? 0 : ((current - previous) / previous) * 100;
}

function equalPrice(a: number, b: number) {
  return Math.abs(a - b) <= Math.max(0.01, Math.abs(b) * 0.0001);
}

function angleFromMovingAverage(series: number[]) {
  return series.map((value, index) => {
    const previous = index > 0 ? series[index - 1] ?? 0 : 0;

    if (previous === 0) {
      return 0;
    }

    return (Math.atan((value / previous) * 100 - 100) / Math.PI) * 180;
  });
}

function toWeight(condition: boolean, weight: number) {
  return condition ? weight : 0;
}

type DerivedStage = {
  refShadow: number;
  refBodyHigh: number;
  condition1: boolean;
  condition2: boolean;
  condition3: boolean;
  condition4: boolean;
  condition5: boolean;
  setup: boolean;
  signalWindow: boolean;
  strengthConstraint: boolean;
  envelopeConstraint: boolean;
  cumulativeConstraint: boolean;
  supportConstraint: boolean;
  setupOrSignal: boolean;
  finalConstraint: boolean;
  final: boolean;
};

function deriveContinuationStage(input: {
  index: number;
  refOffset: number;
  close: number[];
  open: number[];
  high: number[];
  volume: number[];
  x15: number;
  x16: number;
  x18: number;
  x74History: number[];
  shadowPressure: number[];
  trueCHistory: number[];
  trueCGainHistory: number[];
  meiZhuHistory: boolean[];
  x87: boolean;
}) {
  const {
    index,
    refOffset,
    close,
    open,
    high,
    volume,
    x15,
    x16,
    x18,
    x74History,
    shadowPressure,
    trueCHistory,
    trueCGainHistory,
    meiZhuHistory,
    x87,
  } = input;
  const refShadow = Math.max(
    refNumber(shadowPressure, index, refOffset, 0),
    refNumber(close, index, refOffset, 0),
  );
  const refBodyHigh = Math.max(
    refNumber(close, index, refOffset, 0),
    refNumber(open, index, refOffset, 0),
  );
  const volumeRef = refNumber(volume, index, refOffset, 0);
  const closeRef = refNumber(close, index, refOffset, 0);
  const highRef = refNumber(high, index, refOffset, 0);
  const trueC = trueCHistory[index] ?? 0;
  const trueCGain = trueCGainHistory[index] ?? 0;
  const refStrength = refNumber(x74History, index, refOffset, 0);
  const referenceFloor = refShadow - Math.max(refShadow * 0.001, 0.01);
  const condition1 =
    close[index] >= referenceFloor && x18 >= -0.7 && volume[index] <= volumeRef;
  const condition2 =
    close[index] >= refShadow * 0.993 &&
    x15 >= referenceFloor &&
    volume[index] <= volumeRef;
  const condition3 =
    close[index] >= closeRef && high[index] >= highRef && volume[index] <= volumeRef;
  const condition4 =
    trueC >= refShadow &&
    refShadow <= close[index] * 1.01 &&
    volume[index] <= volumeRef &&
    close[index] >= open[index] &&
    x18 >= -0.7;
  const condition5 =
    close[index] >= refShadow &&
    volume[index] <= volumeRef * 1.26 &&
    trueCGain >= 1;
  const signalWindow =
    condition1 || condition2 || condition3 || condition4 || condition5;
  const strengthConstraint = x16 <= refStrength * 0.8;
  const envelopeConstraint =
    close[index] <= Math.max(refBodyHigh, refShadow) * 1.045;
  const cumulativeConstraint =
    percentChange(close[index], refNumber(close, index, refOffset + 1, 0)) < 12.5;
  const supportConstraint = close[index] >= closeRef * 0.985;
  const setupOrSignal = x87 || signalWindow;
  const finalConstraint =
    strengthConstraint &&
    envelopeConstraint &&
    cumulativeConstraint &&
    supportConstraint;
  const final = refBoolean(meiZhuHistory, index, refOffset) && setupOrSignal && finalConstraint;

  return {
    refShadow,
    refBodyHigh,
    condition1,
    condition2,
    condition3,
    condition4,
    condition5,
    setup: x87,
    signalWindow,
    strengthConstraint,
    envelopeConstraint,
    cumulativeConstraint,
    supportConstraint,
    setupOrSignal,
    finalConstraint,
    final,
  } satisfies DerivedStage;
}

export function calculateTdxIndicators(
  bars: ExtendedKLineBar[],
  stockName = '',
): TdxIndicatorResult[] {
  const open = bars.map((bar) => bar.open);
  const high = bars.map((bar) => bar.high);
  const low = bars.map((bar) => bar.low);
  const close = bars.map((bar) => bar.close);
  const volume = bars.map((bar) => bar.volume);
  const amount = bars.map((bar) => bar.amount);
  const circulatingShares = bars.map((bar) => bar.circulatingShares ?? 0);

  const ma5 = MA(close, 5);
  const ma10 = MA(close, 10);
  const ma20 = MA(close, 20);
  const ma60 = MA(close, 60);
  const ma120 = MA(close, 120);
  const maVol5 = MA(volume, 5);
  const maVol10 = MA(volume, 10);
  const llvClose60 = LLV(close, 60);
  const angle5 = angleFromMovingAverage(ma5);
  const angle10 = angleFromMovingAverage(ma10);
  const angle20 = angleFromMovingAverage(ma20);
  const angle60 = angleFromMovingAverage(ma60);
  const angle120 = angleFromMovingAverage(ma120);
  const isSt = isStStockName(stockName);

  const results: TdxIndicatorResult[] = [];
  const x56History: boolean[] = [];
  const x63History: number[] = [];
  const x16History: number[] = [];
  const x74History: number[] = [];
  const trueCHistory: number[] = [];
  const trueCGainHistory: number[] = [];
  const meiZhuHistory: boolean[] = [];
  const shadowPressureHistory: number[] = [];

  for (let index = 0; index < bars.length; index += 1) {
    const previousClose = refNumber(close, index, 1, close[index] ?? 0);
    const x13 =
      (refNumber(volume, index, 1) +
        refNumber(volume, index, 2) +
        refNumber(volume, index, 3) +
        refNumber(volume, index, 4) +
        refNumber(volume, index, 5)) /
      5;
    const x15 = volume[index] > 0 ? amount[index] / volume[index] / 100 : close[index];
    const x16 = percentChange(close[index], previousClose);
    const x17 = percentChange(high[index], previousClose);
    const x18 = percentChange(x15, previousClose);
    const x19 =
      close[index] +
      (high[index] - close[index]) / 3 -
      (close[index] - x15) / 3;
    const trueC =
      close[index] < x15
        ? x15 + (high[index] - x15) / 3
        : close[index] +
          (high[index] - close[index]) / 3 -
            (close[index] - x15) / 3;
    const trueCGain =
      x16 <= x18
        ? x18 + (x17 - x18) / 3
        : x16 + (x17 - x16) / 3;
    const biasRate = ma20[index] === 0 ? 0 : ((close[index] - ma20[index]) / ma20[index]) * 100;
    const x22 = close[index] >= previousClose * 1.093 && equalPrice(close[index], high[index]);
    const x23 =
      ma10[index] >= refNumber(ma10, index, 1) &&
      ma60[index] >= refNumber(ma60, index, 1) &&
      ma120[index] >= refNumber(ma120, index, 1) &&
      close[index] >= ma20[index];
    const x24 = x23;
    const x25 =
      ma10[index] >= refNumber(ma10, index, 1) &&
      ma20[index] >= refNumber(ma20, index, 1) &&
      ma120[index] >= refNumber(ma120, index, 1) &&
      close[index] >= ma20[index];
    const x26 =
      ma10[index] >= refNumber(ma10, index, 1) &&
      ma20[index] >= refNumber(ma20, index, 1) &&
      ma60[index] >= refNumber(ma60, index, 1) &&
      close[index] >= ma20[index];
    const x27 =
      ma5[index] >= refNumber(ma5, index, 1) &&
      ma10[index] >= refNumber(ma10, index, 1) &&
      ma20[index] >= refNumber(ma20, index, 1) &&
      close[index] >= ma20[index];
    const x28 =
      ma5[index] >= refNumber(ma5, index, 1) &&
      ma20[index] >= refNumber(ma20, index, 1) &&
      ma60[index] >= refNumber(ma60, index, 1) &&
      close[index] >= ma20[index];
    const x29 =
      ma5[index] >= refNumber(ma5, index, 1) &&
      ma10[index] >= refNumber(ma10, index, 1) &&
      ma120[index] >= refNumber(ma120, index, 1) &&
      close[index] >= ma20[index];
    const maUp = x23 || x24 || x25 || x26 || x27 || x28 || x29;
    const fiveLinesBull =
      ma5[index] >= refNumber(ma5, index, 1) &&
      ma10[index] >= refNumber(ma10, index, 1) &&
      ma60[index] >= refNumber(ma60, index, 1) &&
      ma120[index] >= refNumber(ma120, index, 1) &&
      close[index] >= ma20[index];

    const x32 = toWeight(
      volume[index] >= refNumber(volume, index, 1) * 1.75 &&
        x16 >= 1.99 &&
        trueCGain >= 2.45 &&
        x17 > 3,
      0.2,
    );
    const x33 = toWeight(
      volume[index] >= refNumber(volume, index, 1) * 1.65 &&
        x16 >= 1.99 &&
        trueCGain >= 3 &&
        x17 > 3.3,
      0.2,
    );
    const x34 = toWeight(
      volume[index] >= refNumber(volume, index, 1) * 1.55 &&
        x16 >= 2.25 &&
        trueCGain >= 3.3 &&
        x17 > 3.5,
      0.2,
    );
    const x35 = toWeight(
      volume[index] >= refNumber(volume, index, 1) * 1.5 &&
        x16 >= 2.5 &&
        trueCGain >= 3.5 &&
        x17 > 4,
      0.2,
    );
    const x36 = toWeight(
      volume[index] >= refNumber(volume, index, 1) * 1.45 &&
        x16 >= 2.68 &&
        trueCGain >= 4 &&
        x17 > 5,
      0.2,
    );
    const x37 = toWeight(
      x32 > 0 || x33 > 0 || x34 > 0 || x35 > 0 || x36 > 0,
      0.2,
    );
    const x38 =
      volume[index] > refNumber(volume, index, 1) &&
      close[index] >= refNumber(close, index, 1) &&
      refNumber(close, index, 1) >= refNumber(close, index, 2);
    const x39 = percentChange(close[index], refNumber(close, index, 2));
    const x40 = x38 && x39 >= 4.5 && volume[index] + refNumber(volume, index, 1) >= refNumber(volume, index, 2) * 4
      ? 1
      : 0;
    const x41 =
      volume[index] > refNumber(volume, index, 1) &&
      refNumber(volume, index, 1) > refNumber(volume, index, 2) * 0.9 &&
      volume[index] > refNumber(volume, index, 2) &&
      close[index] > refNumber(close, index, 1) &&
      refNumber(close, index, 1) >= refNumber(close, index, 2) &&
      refNumber(close, index, 2) >= refNumber(close, index, 3) &&
      volume[index] +
        refNumber(volume, index, 1) +
        refNumber(volume, index, 2) >=
        refNumber(volume, index, 3) * 5;
    const x42 = percentChange(close[index], refNumber(close, index, 3));
    const x43 = x41 && x42 >= 5 ? 1 : 0;
    const x44 = toWeight(x40 > 0 || x43 > 0, 0.4);
    const x45 = close[index] <= previousClose && close[index] > previousClose * 0.97;
    const x46 = close[index] <= previousClose * 0.97;
    const x47 =
      refBoolean(results.map((item) => Boolean(item.X_45)), index, 1) &&
      close[index] >= refNumber(open, index, 1) &&
      close[index] >= previousClose * 1.04;
    const x48 =
      refBoolean(results.map((item) => Boolean(item.X_46)), index, 1) &&
      close[index] >= (refNumber(open, index, 1) + previousClose) * 0.5 &&
      close[index] >= previousClose * 1.045;
    const x49 = x47 || x48;
    const x50 =
      close[index] >= refNumber(close, index, 2) * 1.045 &&
      close[index] >= previousClose * 1.04 &&
      refBoolean(results.map((item) => Boolean(item.X_45)), index, 2) &&
      close[index] >= refNumber(open, index, 2);
    const x51 =
      close[index] >= refNumber(close, index, 2) * 1.05 &&
      close[index] >= previousClose * 1.045 &&
      refBoolean(results.map((item) => Boolean(item.X_46)), index, 2) &&
      close[index] >= (refNumber(open, index, 1) + previousClose) * 0.5;
    const x52 = x50 || x51;
    const x53 = toWeight(x49 || x52, 0.6);
    const x54 = close[index] >= previousClose * 1.05;
    const x55 =
      close[index] >= previousClose * 1.045 &&
      high[index] >= previousClose * 1.05 &&
      trueCGain >= 5;
    const x56 = x54 || x55;
    const limitUpCountHistory = COUNT(results.map((item) => Boolean(item.X_22)), 13);
    const x57 = (
      (limitUpCountHistory[index] > 0 ? x16 > 1 : x16 > 2.68) &&
      volume[index] > refNumber(volume, index, 1) * 1.5 &&
      close[index] >= low[index] * 1.03 &&
      high[index] >= low[index] * 1.05
    )
      ? 1
      : 0;
    const x58 = toWeight(x56 || x53 > 0 || x37 > 0 || x44 > 0 || x57 > 0, 0.2);
    const refCountX56 = refNumber(COUNT(x56History, 20), index, 1);
    const x59 =
      refCountX56 >= 1 &&
      high[index] > previousClose * 1.05 &&
      trueCGain > 3 &&
      x16 > 2.68 &&
      x58 > 0;
    const x60 = refCountX56 >= 1 && x44 > 0;
    const x61 = !(refCountX56 >= 1) && x58 > 0;
    const x62 = x59 || x60 || x61;
    const x63 = x62 ? x58 * 2 : 0;
    const x64 = refNumber(x63History, index, 1) > 0 && !refBoolean(x56History, index, 1) && x56;
    const x65 =
      refNumber(x63History, index, 1) > 0 &&
      !refBoolean(x56History, index, 1) &&
      x63 > 0 &&
      volume[index] > refNumber(volume, index, 1);
    const x66 = refNumber(x63History, index, 1) > 0 && !refBoolean(x56History, index, 1) && x44 > 0;
    const x67 = refNumber(x63History, index, 1) > 0 && refBoolean(x56History, index, 1) && x56;
    const x68 =
      refNumber(x63History, index, 1) > 0 &&
      refBoolean(x56History, index, 1) &&
      x63 > 0 &&
      volume[index] > refNumber(volume, index, 1);
    const x69 = x64 || x65 || x66 || x67 || x68;
    const x70 = refNumber(x63History, index, 1) === 0 && x63 > 0;
    const x71 =
      refNumber(x63History, index, 2) > 0 &&
      x63 > 0 &&
      x16 <= refNumber(x16History, index, 2) &&
      volume[index] <= refNumber(volume, index, 2) &&
      !x56;
    const x72 =
      refNumber(x63History, index, 3) > 0 &&
      x63 > 0 &&
      x16 <= refNumber(x16History, index, 3) &&
      volume[index] <= refNumber(volume, index, 3) &&
      !x56;
    const x73 = x71 || x72;
    const meiZhu = x63 > 0 && !x73 && (x69 || x70) ? 0.5 : 0;

    const shadowPressure = high[index] - (high[index] - Math.min(open[index], close[index])) / 3;
    const x74 =
      meiZhu > 0 && x43 > 0
        ? x42
        : meiZhu > 0 && x40 > 0
          ? x39
          : meiZhu > 0
            ? Math.max(x16, trueCGain)
            : 0;
    const x75 = high[index] - (high[index] - Math.max(open[index], close[index])) * 0.382;
    const lastMeiZhuBeforeCurrent = BARSLAST(meiZhuHistory)[index - 1] ?? index;
    const x76 = index === 0 ? 0 : lastMeiZhuBeforeCurrent + 1;
    const x77 = refNumber(volume, index, x76);
    const x78 = refNumber(volume, index, Math.max(0, x76 - 1));
    const x79 = refNumber(close, index, x76);
    const x80 = refNumber(close, index, Math.max(0, x76 - 1));
    const x81 = close[index] >= previousClose * 1.007 && x18 > -0.8;
    const x82 = x15 >= previousClose * 1.007 && close[index] >= previousClose * 0.993;
    const x83 =
      refNumber(close, index, 1) >= refNumber(close, index, 2) * 1.007 &&
      refNumber(results.map((item) => Number(item.X_18)), index, 1) > -0.8 &&
      close[index] >= refNumber(close, index, 1) &&
      volume[index] <= refNumber(volume, index, 1);
    const x84 =
      refNumber(results.map((item) => Number(item.X_15)), index, 1) >= refNumber(close, index, 2) * 1.007 &&
      refNumber(close, index, 1) >= refNumber(close, index, 2) * 0.993 &&
      close[index] >= refNumber(close, index, 1) &&
      volume[index] <= refNumber(volume, index, 1);
    const x85 = safeDivide(close[index], refNumber(close, index, 2)) >= 1.01 && close[index] >= refNumber(close, index, 1) && x18 > -0.8;
    const x86 =
      safeDivide(close[index], refNumber(close, index, 2)) >= 1.01 &&
      x15 >= previousClose * 1.007 &&
      close[index] >= previousClose * 0.993;
    const x87 = x81 || x82 || x83 || x84 || x85 || x86;
    const x88 = Math.max(
      refNumber(shadowPressureHistory, index, 1),
      refNumber(close, index, 1),
    );
    const x89 = Math.max(refNumber(close, index, 1), refNumber(open, index, 1));
    const x90 =
      close[index] >= x88 - Math.max(x88 * 0.001, 0.01) &&
      x18 >= -0.7 &&
      volume[index] <= refNumber(volume, index, 1);
    const x91 =
      close[index] >= x88 * 0.993 &&
      x15 >= x88 - Math.max(x88 * 0.001, 0.01) &&
      volume[index] <= refNumber(volume, index, 1);
    const x92 =
      close[index] >= refNumber(close, index, 1) &&
      high[index] >= refNumber(high, index, 1) &&
      volume[index] <= refNumber(volume, index, 1);
    const x93 =
      trueC >= x88 &&
      x88 <= close[index] * 1.01 &&
      volume[index] <= refNumber(volume, index, 1) &&
      close[index] >= open[index] &&
      x18 >= -0.7;
    const x94 =
      close[index] >= x88 &&
      volume[index] <= refNumber(volume, index, 1) * 1.26 &&
      trueCGain >= 1;
    const x95 = x90 || x91 || x92 || x93 || x94;
    const x96 = x16 <= refNumber(x74History, index, 1) * 0.8;
    const x97 = close[index] <= Math.max(x89, x88) * 1.045;
    const x98 = percentChange(close[index], refNumber(close, index, 2)) < 12.5;
    const x99 = refBoolean(meiZhuHistory, index, 1) && x95 && x96 && x97 && x98;

    // The original prompt omits the explicit day-2~4 code, so these fields are
    // derived by extending the day-1 continuation pattern with deeper lookbacks.
    const stage2 = deriveContinuationStage({
      index,
      refOffset: 2,
      close,
      open,
      high,
      volume,
      x15,
      x16,
      x18,
      x74History,
      shadowPressure: shadowPressureHistory,
      trueCHistory,
      trueCGainHistory,
      meiZhuHistory,
      x87,
    });
    const stage3 = deriveContinuationStage({
      index,
      refOffset: 3,
      close,
      open,
      high,
      volume,
      x15,
      x16,
      x18,
      x74History,
      shadowPressure: shadowPressureHistory,
      trueCHistory,
      trueCGainHistory,
      meiZhuHistory,
      x87,
    });
    const stage4 = deriveContinuationStage({
      index,
      refOffset: 4,
      close,
      open,
      high,
      volume,
      x15,
      x16,
      x18,
      x74History,
      shadowPressure: shadowPressureHistory,
      trueCHistory,
      trueCGainHistory,
      meiZhuHistory,
      x87,
    });
    const x148 =
      open[index] > previousClose &&
      high[index] > previousClose * 1.0268 &&
      close[index] < open[index] &&
      volume[index] > refNumber(volume, index, 1);
    const meiYangYang =
      (x99 || stage2.final || stage3.final || stage4.final) && !x148;

    const result = {} as TdxIndicatorResult;
    result.X_1 = 1;
    result.X_2 = 0;
    result.X_3 = 1;
    result.X_4 = maVol5[index] ?? 0;
    result.X_5 = maVol10[index] ?? 0;
    result.X_6 = close[index] * circulatingShares[index] / 10000 / 10000;
    result.X_7 = Number(result.X_6) < 50;
    result.virtualVolume = volume[index];
    result.realVolume = volume[index];
    result.volumeRatio = safeDivide(volume[index], previousClose === close[index] ? refNumber(volume, index, 1) : refNumber(volume, index, 1));
    result.X_8 = angle5[index] ?? 0;
    result.X_9 = angle10[index] ?? 0;
    result.angle20 = angle20[index] ?? 0;
    result.X_10 = angle60[index] ?? 0;
    result.X_11 = angle120[index] ?? 0;
    result.biasRate = biasRate;
    result.X_12 = biasRate < 13;
    result.X_13 = x13;
    result.X_14 = safeDivide(volume[index], x13);
    result.X_15 = x15;
    result.X_16 = x16;
    result.X_17 = x17;
    result.X_18 = x18;
    result.X_19 = x19;
    result.trueC = trueC;
    result.X_20 = x16 + (x17 - x16) / 3 - (x16 - x18) / 3;
    result.trueCGain = trueCGain;
    result.X_21 = percentChange(close[index], llvClose60[index] ?? 0);
    result.MA5 = ma5[index] ?? 0;
    result.MA10 = ma10[index] ?? 0;
    result.MA20 = ma20[index] ?? 0;
    result.MA60 = ma60[index] ?? 0;
    result.MA120 = ma120[index] ?? 0;
    result.X_22 = x22;
    result.X_23 = x23;
    result.X_24 = x24;
    result.X_25 = x25;
    result.X_26 = x26;
    result.X_27 = x27;
    result.X_28 = x28;
    result.X_29 = x29;
    result.maUp = maUp;
    result.fiveLinesBull = fiveLinesBull;
    result.X_30 = volume[index] > 0;
    result.X_31 = !isSt;
    result.X_32 = x32;
    result.X_33 = x33;
    result.X_34 = x34;
    result.X_35 = x35;
    result.X_36 = x36;
    result.X_37 = x37;
    result.X_38 = x38;
    result.X_39 = x39;
    result.X_40 = x40;
    result.X_41 = x41;
    result.X_42 = x42;
    result.X_43 = x43;
    result.X_44 = x44;
    result.X_45 = x45;
    result.X_46 = x46;
    result.X_47 = x47;
    result.X_48 = x48;
    result.X_49 = x49;
    result.X_50 = x50;
    result.X_51 = x51;
    result.X_52 = x52;
    result.X_53 = x53;
    result.X_54 = x54;
    result.X_55 = x55;
    result.X_56 = x56;
    result.X_57 = x57;
    result.X_58 = x58;
    result.X_59 = x59;
    result.X_60 = x60;
    result.X_61 = x61;
    result.X_62 = x62;
    result.X_63 = x63;
    result.X_64 = x64;
    result.X_65 = x65;
    result.X_66 = x66;
    result.X_67 = x67;
    result.X_68 = x68;
    result.X_69 = x69;
    result.X_70 = x70;
    result.X_71 = x71;
    result.X_72 = x72;
    result.X_73 = x73;
    result.meiZhu = meiZhu;
    result.X_74 = x74;
    result.shadowPressure = shadowPressure;
    result.X_75 = x75;
    result.X_76 = x76;
    result.X_77 = x77;
    result.X_78 = x78;
    result.X_79 = x79;
    result.X_80 = x80;
    result.X_81 = x81;
    result.X_82 = x82;
    result.X_83 = x83;
    result.X_84 = x84;
    result.X_85 = x85;
    result.X_86 = x86;
    result.X_87 = x87;
    result.X_88 = x88;
    result.X_89 = x89;
    result.X_90 = x90;
    result.X_91 = x91;
    result.X_92 = x92;
    result.X_93 = x93;
    result.X_94 = x94;
    result.X_95 = x95;
    result.X_96 = x96;
    result.X_97 = x97;
    result.X_98 = x98;
    result.X_99 = x99;
    result.X_100 = stage2.refShadow;
    result.X_101 = stage2.refBodyHigh;
    result.X_102 = stage2.condition1;
    result.X_103 = stage2.condition2;
    result.X_104 = stage2.condition3;
    result.X_105 = stage2.condition4;
    result.X_106 = stage2.condition5;
    result.X_107 = stage2.setup;
    result.X_108 = stage2.signalWindow;
    result.X_109 = stage2.strengthConstraint;
    result.X_110 = stage2.envelopeConstraint;
    result.X_111 = stage2.cumulativeConstraint;
    result.X_112 = stage2.supportConstraint;
    result.X_113 = stage2.setupOrSignal;
    result.X_114 = stage2.finalConstraint;
    result.X_115 = stage2.final;
    result.X_116 = stage3.refShadow;
    result.X_117 = stage3.refBodyHigh;
    result.X_118 = stage3.condition1;
    result.X_119 = stage3.condition2;
    result.X_120 = stage3.condition3;
    result.X_121 = stage3.condition4;
    result.X_122 = stage3.condition5;
    result.X_123 = stage3.setup;
    result.X_124 = stage3.signalWindow;
    result.X_125 = stage3.strengthConstraint;
    result.X_126 = stage3.envelopeConstraint;
    result.X_127 = stage3.cumulativeConstraint;
    result.X_128 = stage3.supportConstraint;
    result.X_129 = stage3.setupOrSignal;
    result.X_130 = stage3.finalConstraint;
    result.X_131 = stage3.final;
    result.X_132 = stage4.refShadow;
    result.X_133 = stage4.refBodyHigh;
    result.X_134 = stage4.condition1;
    result.X_135 = stage4.condition2;
    result.X_136 = stage4.condition3;
    result.X_137 = stage4.condition4;
    result.X_138 = stage4.condition5;
    result.X_139 = stage4.setup;
    result.X_140 = stage4.signalWindow;
    result.X_141 = stage4.strengthConstraint;
    result.X_142 = stage4.envelopeConstraint;
    result.X_143 = stage4.cumulativeConstraint;
    result.X_144 = stage4.supportConstraint;
    result.X_145 = stage4.setupOrSignal;
    result.X_146 = stage4.finalConstraint;
    result.X_147 = stage4.final;
    result.X_148 = x148;
    result.meiYangYang = meiYangYang;
    results.push(result);
    x56History.push(x56);
    x63History.push(x63);
    x16History.push(x16);
    x74History.push(x74);
    trueCHistory.push(trueC);
    trueCGainHistory.push(trueCGain);
    meiZhuHistory.push(meiZhu > 0);
    shadowPressureHistory.push(shadowPressure);
  }

  return results;
}

export function hasMeiZhuSignal(indicators: TdxIndicatorResult[]) {
  return (indicators.at(-1)?.meiZhu ?? 0) > 0;
}

export function hasMeiYangYangSignal(indicators: TdxIndicatorResult[]) {
  return indicators.at(-1)?.meiYangYang ?? false;
}

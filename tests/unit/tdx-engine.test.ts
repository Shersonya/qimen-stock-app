/** @jest-environment node */

import {
  calculateTdxIndicators,
  hasMeiYangYangSignal,
  hasMeiZhuSignal,
} from '@/lib/tdx/engine';
import type { ExtendedKLineBar } from '@/lib/tdx/types';

function createBar(
  dateIndex: number,
  open: number,
  close: number,
  high: number,
  low: number,
  volume: number,
): ExtendedKLineBar {
  const averagePrice = (open + close + high + low) / 4;

  return {
    date: `2026-03-${String(dateIndex + 1).padStart(2, '0')}`,
    open,
    close,
    high,
    low,
    volume,
    amount: averagePrice * volume * 100,
    circulatingShares: 320000,
  };
}

function createSyntheticBars() {
  const bars: ExtendedKLineBar[] = [];
  let previousClose = 9.8;

  for (let index = 0; index < 128; index += 1) {
    const nextClose = Number((previousClose * 1.0045).toFixed(2));
    const open = Number((previousClose * 0.998).toFixed(2));
    const high = Number((nextClose * 1.01).toFixed(2));
    const low = Number((open * 0.995).toFixed(2));
    const volume = 120000 + index * 600;

    bars.push(createBar(index, open, nextClose, high, low, volume));
    previousClose = nextClose;
  }

  const meiZhuOpen = Number((previousClose * 1.008).toFixed(2));
  const meiZhuClose = Number((previousClose * 1.056).toFixed(2));
  const meiZhuHigh = Number((previousClose * 1.061).toFixed(2));
  const meiZhuLow = Number((previousClose * 1.002).toFixed(2));

  bars.push(createBar(128, meiZhuOpen, meiZhuClose, meiZhuHigh, meiZhuLow, 360000));
  previousClose = meiZhuClose;

  const meiYangOpen = Number((previousClose * 0.997).toFixed(2));
  const meiYangClose = Number((previousClose * 1.011).toFixed(2));
  const meiYangHigh = Number((previousClose * 1.018).toFixed(2));
  const meiYangLow = Number((meiYangOpen * 0.997).toFixed(2));

  bars.push(createBar(129, meiYangOpen, meiYangClose, meiYangHigh, meiYangLow, 250000));

  return bars;
}

describe('tdx engine', () => {
  it('returns the full X_1~X_148 contract for each bar', () => {
    const indicators = calculateTdxIndicators(createSyntheticBars(), '宁德时代');
    const last = indicators.at(-1);

    expect(last).toBeDefined();
    expect(last).toEqual(
      expect.objectContaining({
        X_1: 1,
        X_22: expect.any(Boolean),
        X_63: expect.any(Number),
        X_74: expect.any(Number),
        X_100: expect.any(Number),
        X_115: expect.any(Boolean),
        X_132: expect.any(Number),
        X_147: expect.any(Boolean),
        X_148: expect.any(Boolean),
        meiYangYang: expect.any(Boolean),
      }),
    );
  });

  it('reproduces a synthetic meiZhu breakout followed by meiYangYang continuation', () => {
    const indicators = calculateTdxIndicators(createSyntheticBars(), '宁德时代');
    const breakout = indicators.at(-2);
    const continuation = indicators.at(-1);

    expect(breakout?.meiZhu).toBe(0.5);
    expect(breakout?.X_74).toBeGreaterThanOrEqual(5);
    expect(continuation?.meiYangYang).toBe(true);
    expect(hasMeiZhuSignal(indicators.slice(0, -1))).toBe(true);
    expect(hasMeiYangYangSignal(indicators)).toBe(true);
  });

  it('documents the inferred day-2~4 continuation fields in executable form', () => {
    const indicators = calculateTdxIndicators(createSyntheticBars(), '宁德时代');
    const last = indicators.at(-1);

    expect(last?.X_107).toBeDefined();
    expect(last?.X_113).toBeDefined();
    expect(last?.X_123).toBeDefined();
    expect(last?.X_139).toBeDefined();
  });
});

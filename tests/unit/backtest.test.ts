/** @jest-environment node */

import {
  createBacktestDemoEvaluator,
  createBacktestDemoSamples,
  runBacktest,
} from '@/lib/backtest';
import type { BacktestSample } from '@/lib/backtest';

describe('backtest core', () => {
  it('aggregates hit rate and group summaries from an injected evaluator', () => {
    const samples: BacktestSample[] = [
      {
        sampleId: 's1',
        stockId: '600519',
        stockName: '贵州茅台',
        strategyId: 'strategy-a',
        actualDirection: '涨',
      },
      {
        sampleId: 's2',
        stockId: '600519',
        stockName: '贵州茅台',
        strategyId: 'strategy-a',
        actualDirection: '跌',
      },
      {
        sampleId: 's3',
        stockId: '000001',
        stockName: '平安银行',
        strategyId: 'strategy-b',
        actualDirection: '观望',
      },
    ];

    const result = runBacktest(samples, (sample) => {
      if (sample.sampleId === 's1') {
        return {
          direction: '涨',
          score: 0.9,
          note: 'trend aligned',
        };
      }

      if (sample.sampleId === 's2') {
        return '涨';
      }

      return {
        direction: '观望',
        note: 'wait',
      };
    });

    expect(result.summary).toMatchObject({
      label: 'overall',
      totalSamples: 3,
      evaluatedSamples: 3,
      hitSamples: 2,
      missSamples: 1,
      predictedDirectionCounts: {
        涨: 2,
        跌: 0,
        观望: 1,
      },
      actualDirectionCounts: {
        涨: 1,
        跌: 1,
        观望: 1,
      },
    });
    expect(result.summary.hitRate).toBeCloseTo(2 / 3);
    expect(result.byStock['600519']).toMatchObject({
      label: '600519 贵州茅台',
      totalSamples: 2,
      hitSamples: 1,
      missSamples: 1,
    });
    expect(result.byStrategy['strategy-a']).toMatchObject({
      label: 'strategy-a',
      totalSamples: 2,
      hitSamples: 1,
      missSamples: 1,
    });
    expect(result.results[0]).toMatchObject({
      sampleId: 's1',
      predictedDirection: '涨',
      isHit: true,
      score: 0.9,
      note: 'trend aligned',
    });
  });

  it('returns zeroed summaries for empty input', () => {
    const result = runBacktest([], createBacktestDemoEvaluator());

    expect(result.summary).toMatchObject({
      label: 'overall',
      totalSamples: 0,
      evaluatedSamples: 0,
      hitSamples: 0,
      missSamples: 0,
      hitRate: 0,
    });
    expect(result.byStock).toEqual({});
    expect(result.byStrategy).toEqual({});
    expect(result.results).toEqual([]);
  });

  it('ships with a runnable demo fixture that stays deterministic', () => {
    const result = runBacktest(
      createBacktestDemoSamples(),
      createBacktestDemoEvaluator(),
    );

    expect(result.summary.totalSamples).toBe(3);
    expect(result.summary.hitSamples).toBe(2);
    expect(result.byStrategy['strategy-momentum']?.totalSamples).toBe(2);
  });
});

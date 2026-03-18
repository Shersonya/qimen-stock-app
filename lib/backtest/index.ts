import {
  BACKTEST_DIRECTIONS,
  type BacktestDirection,
  type BacktestEvaluation,
  type BacktestEvaluator,
  type BacktestGroupSummary,
  type BacktestPrediction,
  type BacktestRunResult,
  type BacktestSample,
  type BacktestSampleResult,
} from './types';

function createDirectionCounts(): Record<BacktestDirection, number> {
  return Object.fromEntries(
    BACKTEST_DIRECTIONS.map((direction) => [direction, 0]),
  ) as Record<BacktestDirection, number>;
}

function createGroupSummary(label: string): BacktestGroupSummary {
  return {
    label,
    totalSamples: 0,
    hitSamples: 0,
    missSamples: 0,
    hitRate: 0,
    predictedDirectionCounts: createDirectionCounts(),
    actualDirectionCounts: createDirectionCounts(),
  };
}

function normalizeEvaluation(
  evaluation: BacktestPrediction | BacktestEvaluation,
): BacktestEvaluation {
  if (typeof evaluation === 'string') {
    return { direction: evaluation };
  }

  return evaluation;
}

function incrementDirectionCount(
  counts: Record<BacktestDirection, number>,
  direction: BacktestDirection,
) {
  counts[direction] += 1;
}

function finalizeGroupSummary(summary: BacktestGroupSummary): BacktestGroupSummary {
  return {
    ...summary,
    hitRate: summary.totalSamples === 0 ? 0 : summary.hitSamples / summary.totalSamples,
  };
}

function updateGroupSummary(
  summary: BacktestGroupSummary,
  sample: BacktestSample,
  predictedDirection: BacktestDirection,
  isHit: boolean,
) {
  summary.totalSamples += 1;
  summary.hitSamples += isHit ? 1 : 0;
  summary.missSamples += isHit ? 0 : 1;
  incrementDirectionCount(summary.predictedDirectionCounts, predictedDirection);
  incrementDirectionCount(summary.actualDirectionCounts, sample.actualDirection);
}

export function runBacktest(
  samples: BacktestSample[],
  evaluator: BacktestEvaluator,
): BacktestRunResult {
  const summary = createGroupSummary('overall');
  const byStock: Record<string, BacktestGroupSummary> = {};
  const byStrategy: Record<string, BacktestGroupSummary> = {};
  const results: BacktestSampleResult[] = [];

  for (const sample of samples) {
    const evaluation = normalizeEvaluation(evaluator(sample));
    const predictedDirection = evaluation.direction;
    const isHit = predictedDirection === sample.actualDirection;

    updateGroupSummary(summary, sample, predictedDirection, isHit);

    const stockSummary =
      byStock[sample.stockId] ??= createGroupSummary(`${sample.stockId} ${sample.stockName}`);
    updateGroupSummary(stockSummary, sample, predictedDirection, isHit);

    const strategySummary =
      byStrategy[sample.strategyId] ??= createGroupSummary(sample.strategyId);
    updateGroupSummary(strategySummary, sample, predictedDirection, isHit);

    results.push({
      ...sample,
      predictedDirection,
      score: evaluation.score,
      note: evaluation.note,
      isHit,
    });
  }

  return {
    summary: {
      ...finalizeGroupSummary(summary),
      evaluatedSamples: samples.length,
    },
    byStock: Object.fromEntries(
      Object.entries(byStock).map(([key, value]) => [key, finalizeGroupSummary(value)]),
    ),
    byStrategy: Object.fromEntries(
      Object.entries(byStrategy).map(([key, value]) => [key, finalizeGroupSummary(value)]),
    ),
    results,
  };
}

export function createBacktestDemoSamples(): BacktestSample[] {
  return [
    {
      sampleId: 'sample-001',
      stockId: '600519',
      stockName: '贵州茅台',
      strategyId: 'strategy-momentum',
      actualDirection: '涨',
      observedAt: '2026-03-01T09:30:00+08:00',
    },
    {
      sampleId: 'sample-002',
      stockId: '600519',
      stockName: '贵州茅台',
      strategyId: 'strategy-momentum',
      actualDirection: '跌',
      observedAt: '2026-03-02T09:30:00+08:00',
    },
    {
      sampleId: 'sample-003',
      stockId: '000001',
      stockName: '平安银行',
      strategyId: 'strategy-breakout',
      actualDirection: '观望',
      observedAt: '2026-03-03T09:30:00+08:00',
    },
  ];
}

export function createBacktestDemoEvaluator() {
  return (sample: BacktestSample) => {
    if (sample.stockId === '600519') {
      return {
        direction: '涨' as const,
        score: 0.86,
        note: '示例策略：对白酒龙头维持偏多判断。',
      };
    }

    return '观望' as const;
  };
}

export { BACKTEST_DIRECTIONS };
export type {
  BacktestDirection,
  BacktestEvaluation,
  BacktestEvaluator,
  BacktestGroupSummary,
  BacktestPrediction,
  BacktestRunResult,
  BacktestSample,
  BacktestSampleResult,
  BacktestSummary,
} from './types';

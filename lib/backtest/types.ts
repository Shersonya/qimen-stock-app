export const BACKTEST_DIRECTIONS = ['涨', '跌', '观望'] as const;

export type BacktestDirection = (typeof BACKTEST_DIRECTIONS)[number];

export type BacktestSample = {
  sampleId: string;
  stockId: string;
  stockName: string;
  strategyId: string;
  actualDirection: BacktestDirection;
  observedAt?: string;
  context?: Record<string, unknown>;
};

export type BacktestPrediction =
  | BacktestDirection
  | {
      direction: BacktestDirection;
      score?: number;
      note?: string;
      strategyId?: string;
    };

export type BacktestEvaluation = {
  direction: BacktestDirection;
  score?: number;
  note?: string;
  strategyId?: string;
};

export type BacktestEvaluator = (sample: BacktestSample) => BacktestPrediction | BacktestEvaluation;

export type BacktestSampleResult = BacktestSample & {
  predictedDirection: BacktestDirection;
  score?: number;
  note?: string;
  isHit: boolean;
};

export type BacktestGroupSummary = {
  label: string;
  totalSamples: number;
  hitSamples: number;
  missSamples: number;
  hitRate: number;
  predictedDirectionCounts: Record<BacktestDirection, number>;
  actualDirectionCounts: Record<BacktestDirection, number>;
};

export type BacktestSummary = BacktestGroupSummary & {
  evaluatedSamples: number;
};

export type BacktestRunResult = {
  summary: BacktestSummary;
  byStock: Record<string, BacktestGroupSummary>;
  byStrategy: Record<string, BacktestGroupSummary>;
  results: BacktestSampleResult[];
};

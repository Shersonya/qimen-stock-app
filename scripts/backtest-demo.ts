import {
  createBacktestDemoEvaluator,
  createBacktestDemoSamples,
  runBacktest,
} from '@/lib/backtest';

const result = runBacktest(createBacktestDemoSamples(), createBacktestDemoEvaluator());

console.log(
  JSON.stringify(
    {
      summary: result.summary,
      byStock: result.byStock,
      byStrategy: result.byStrategy,
      results: result.results,
    },
    null,
    2,
  ),
);

import { runBacktest, type BacktestDirection, type BacktestSample } from '@/lib/backtest';
import type {
  BacktestApiSuccessResponse,
  BacktestRequest,
  BacktestRequestItem,
} from '@/lib/contracts/qimen';
import { getStockDailyHistory } from '@/lib/services/stock-history';

const DEFAULT_LOOKBACK_DAYS = 60;
const MAX_LOOKBACK_DAYS = 240;
const MAX_BACKTEST_ITEMS = 20;
const DEFAULT_STRATEGY_LABEL = '当前筛选策略';

type NormalizedBacktestRequest = {
  items: BacktestRequestItem[];
  lookbackDays: number;
  strategyLabel: string;
};

function normalizeLookbackDays(value: number | undefined) {
  if (!Number.isFinite(value) || !value || value < 5) {
    return DEFAULT_LOOKBACK_DAYS;
  }

  return Math.min(Math.floor(value), MAX_LOOKBACK_DAYS);
}

function normalizeStrategyLabel(value: string | undefined) {
  const normalized = value?.trim();

  return normalized || DEFAULT_STRATEGY_LABEL;
}

function normalizeRequest(request: BacktestRequest): NormalizedBacktestRequest {
  return {
    items: request.items.slice(0, MAX_BACKTEST_ITEMS),
    lookbackDays: normalizeLookbackDays(request.lookbackDays),
    strategyLabel: normalizeStrategyLabel(request.strategyLabel),
  };
}

function toDateToken(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}${month}${day}`;
}

function toDateLabel(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function resolveHistoryRange(lookbackDays: number) {
  const end = new Date();
  const start = new Date(end);

  // Leave extra calendar days for weekends and holidays.
  start.setDate(end.getDate() - Math.max(lookbackDays * 2, lookbackDays + 14));

  return {
    beg: toDateToken(start),
    end: toDateToken(end),
    from: toDateLabel(start),
    to: toDateLabel(end),
  };
}

function resolveActualDirection(
  previousClose: number,
  nextClose: number,
): BacktestDirection {
  if (nextClose > previousClose) {
    return '涨';
  }

  if (nextClose < previousClose) {
    return '跌';
  }

  return '观望';
}

function createPredictionNote(item: BacktestRequestItem) {
  const patterns = item.patternSummary.matchedPatternNames.slice(0, 3).join('、');

  if (patterns) {
    return `依据吉格 ${patterns}，当前预测为 ${item.patternSummary.predictedDirection}。`;
  }

  return `依据时干用神规则，当前预测为 ${item.patternSummary.predictedDirection}。`;
}

function buildSamplesForItem(
  item: BacktestRequestItem,
  historyRows: Awaited<ReturnType<typeof getStockDailyHistory>>,
  strategyLabel: string,
): BacktestSample[] {
  const samples: BacktestSample[] = [];

  for (let index = 1; index < historyRows.length; index += 1) {
    const previous = historyRows[index - 1];
    const current = historyRows[index];

    if (!previous || !current) {
      continue;
    }

    samples.push({
      sampleId: `${item.stock.code}-${current.tradeDate}`,
      stockId: item.stock.code,
      stockName: item.stock.name,
      strategyId: strategyLabel,
      actualDirection: resolveActualDirection(previous.close, current.close),
      observedAt: current.tradeDate,
      context: {
        previousClose: previous.close,
        close: current.close,
        predictedDirection: item.patternSummary.predictedDirection,
      },
    });
  }

  return samples;
}

export async function runMarketScreenBacktest(
  request: BacktestRequest,
): Promise<BacktestApiSuccessResponse> {
  const normalized = normalizeRequest(request);
  const range = resolveHistoryRange(normalized.lookbackDays);
  const predictionLookup = new Map(
    normalized.items.map((item) => [
      item.stock.code,
      {
        direction: item.patternSummary.predictedDirection,
        note: createPredictionNote(item),
        score: item.patternSummary.totalScore / 50,
      },
    ]),
  );
  const skippedStocks: string[] = [];
  const samples = (
    await Promise.all(
      normalized.items.map(async (item) => {
        try {
          const historyRows = await getStockDailyHistory(item.stock.code, item.stock.market, {
            beg: range.beg,
            end: range.end,
          });

          if (historyRows.length < 2) {
            skippedStocks.push(`${item.stock.code} 数据不足`);
            return [];
          }

          return buildSamplesForItem(item, historyRows, normalized.strategyLabel);
        } catch {
          skippedStocks.push(`${item.stock.code} 数据拉取失败`);
          return [];
        }
      }),
    )
  ).flat();
  const result = runBacktest(samples, (sample) => {
    const prediction = predictionLookup.get(sample.stockId);

    return {
      direction: prediction?.direction ?? '观望',
      note: prediction?.note,
      score: prediction?.score,
      strategyId: normalized.strategyLabel,
    };
  });

  return {
    ...result,
    generatedAt: new Date().toISOString(),
    lookbackDays: normalized.lookbackDays,
    range: {
      from: range.from,
      to: range.to,
    },
    strategyLabel: normalized.strategyLabel,
    predictionRule: '时干用神落生门或值符定义为涨，其余默认记为观望。',
    includedStocks: normalized.items.length - skippedStocks.length,
    skippedStocks,
  };
}

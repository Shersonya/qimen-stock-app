import { performance } from 'node:perf_hooks';

import { batchDiagnose } from '@/lib/services/batch-diagnosis';
import { filterLimitUpStocks, resetLimitUpCacheForTests } from '@/lib/services/limit-up';
import { getMarketDashboard } from '@/lib/services/market-dashboard';
import {
  getMarketStockPool,
  getMarketStockPoolCacheMeta,
  resetMarketStockPoolCacheForTests,
  screenMarketStocks,
} from '@/lib/services/market-screen';
import { resetTdxScanCacheForTests, scanTdxSignals } from '@/lib/services/tdx-scan';

type BenchmarkRow = {
  name: string;
  durationMs: number;
  status: 'ok' | 'error';
  summary: Record<string, unknown>;
};

type TimedResult<T> = {
  durationMs: number;
  value?: T;
  error?: unknown;
};

type MarketPoolSnapshot = {
  items: Awaited<ReturnType<typeof getMarketStockPool>>;
  meta: ReturnType<typeof getMarketStockPoolCacheMeta>;
};

const screenRequest = {
  filters: {
    hour: {
      door: '开门',
    },
  },
  page: 1,
  pageSize: 50,
} as const;

const tdxRequest = {
  signalType: 'both',
  requireMaUp: false,
  requireFiveLinesBull: false,
  maxBiasRate: 13,
  minSignalStrength: 0,
  page: 1,
  pageSize: 50,
} as const;

const limitUpRequest = {
  lookbackDays: 30,
  minLimitUpCount: 1,
  excludeST: true,
  excludeKechuang: true,
  excludeNewStock: true,
  sortBy: 'limitUpCount',
  sortOrder: 'desc',
  page: 1,
  pageSize: 50,
} as const;

const batchDiagnosisRequest = {
  stockCodes: ['600519', '000001', '300750'],
};

async function measure<T>(fn: () => Promise<T>): Promise<TimedResult<T>> {
  const startedAt = performance.now();

  try {
    const value = await fn();

    return {
      durationMs: performance.now() - startedAt,
      value,
    };
  } catch (error) {
    return {
      durationMs: performance.now() - startedAt,
      error,
    };
  }
}

function toFixedNumber(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

function createRow(
  name: string,
  result: TimedResult<unknown>,
  summaryFactory?: (value: unknown) => Record<string, unknown>,
): BenchmarkRow {
  if (result.error !== undefined) {
    return {
      name,
      durationMs: toFixedNumber(result.durationMs),
      status: 'error',
      summary: {
        error: serializeError(result.error),
      },
    };
  }

  return {
    name,
    durationMs: toFixedNumber(result.durationMs),
    status: 'ok',
    summary: summaryFactory ? summaryFactory(result.value) : {},
  };
}

function printRows(title: string, rows: BenchmarkRow[]) {
  console.log(`\n# ${title}`);
  console.table(
    rows.map((row) => ({
      name: row.name,
      durationMs: row.durationMs,
      status: row.status,
      summary: JSON.stringify(row.summary),
    })),
  );
}

async function runMarketPoolBenchmarks() {
  resetMarketStockPoolCacheForTests();

  const cold = await measure(async () => {
    const items = await getMarketStockPool();
    const meta = getMarketStockPoolCacheMeta();

    return {
      items,
      meta,
    };
  });

  const warm = await measure(async () => {
    const items = await getMarketStockPool();
    const meta = getMarketStockPoolCacheMeta();

    return {
      items,
      meta,
    };
  });

  return [
    createRow('market-pool:cold', cold, (value) => {
      const payload = value as MarketPoolSnapshot;

      return {
        universeSize: payload.items.length,
        source: payload.meta.source,
        cached: payload.meta.cached,
      };
    }),
    createRow('market-pool:warm', warm, (value) => {
      const payload = value as {
        items: Awaited<ReturnType<typeof getMarketStockPool>>;
        meta: ReturnType<typeof getMarketStockPoolCacheMeta>;
      };

      return {
        universeSize: payload.items.length,
        source: payload.meta.source,
        cached: payload.meta.cached,
      };
    }),
  ];
}

async function runDashboardBenchmarks() {
  resetMarketStockPoolCacheForTests();

  const cold = await measure(() => getMarketDashboard({}));
  const warm = await measure(() => getMarketDashboard({}));

  return [
    createRow('market-dashboard:cold', cold, (value) => {
      const payload = value as Awaited<ReturnType<typeof getMarketDashboard>>;

      return {
        universeSize: payload.universeSize,
        cacheSource: payload.cache.source,
        cached: payload.cache.cached,
      };
    }),
    createRow('market-dashboard:warm', warm, (value) => {
      const payload = value as Awaited<ReturnType<typeof getMarketDashboard>>;

      return {
        universeSize: payload.universeSize,
        cacheSource: payload.cache.source,
        cached: payload.cache.cached,
      };
    }),
  ];
}

async function runScreenBenchmarks() {
  resetMarketStockPoolCacheForTests();

  const cold = await measure(() => screenMarketStocks(screenRequest));
  const warm = await measure(() => screenMarketStocks(screenRequest));

  resetMarketStockPoolCacheForTests();
  await getMarketStockPool();
  const warmPoolOnly = await measure(() => screenMarketStocks(screenRequest));

  return [
    createRow('market-screen:cold', cold, (value) => {
      const payload = value as Awaited<ReturnType<typeof screenMarketStocks>>;

      return {
        total: payload.total,
        source: payload.meta?.source ?? null,
      };
    }),
    createRow('market-screen:warm', warm, (value) => {
      const payload = value as Awaited<ReturnType<typeof screenMarketStocks>>;

      return {
        total: payload.total,
        source: payload.meta?.source ?? null,
      };
    }),
    createRow('market-screen:warm-pool', warmPoolOnly, (value) => {
      const payload = value as Awaited<ReturnType<typeof screenMarketStocks>>;

      return {
        total: payload.total,
        source: payload.meta?.source ?? null,
      };
    }),
  ];
}

async function runLimitUpBenchmarks() {
  resetLimitUpCacheForTests();

  const cold = await measure(() => filterLimitUpStocks(limitUpRequest));
  const warm = await measure(() => filterLimitUpStocks(limitUpRequest));

  return [
    createRow('limit-up:cold', cold, (value) => {
      const payload = value as Awaited<ReturnType<typeof filterLimitUpStocks>>;

      return {
        total: payload.total,
        source: payload.meta?.source ?? null,
        filterDate: payload.filterDate,
      };
    }),
    createRow('limit-up:warm', warm, (value) => {
      const payload = value as Awaited<ReturnType<typeof filterLimitUpStocks>>;

      return {
        total: payload.total,
        source: payload.meta?.source ?? null,
        filterDate: payload.filterDate,
      };
    }),
  ];
}

async function runTdxBenchmarks() {
  resetMarketStockPoolCacheForTests();
  resetTdxScanCacheForTests();

  const cold = await measure(() => scanTdxSignals(tdxRequest));
  const warm = await measure(() => scanTdxSignals(tdxRequest));

  resetMarketStockPoolCacheForTests();
  resetTdxScanCacheForTests();
  await getMarketStockPool();
  const warmPoolOnly = await measure(() => scanTdxSignals(tdxRequest));

  return [
    createRow('tdx-scan:cold', cold, (value) => {
      const payload = value as Awaited<ReturnType<typeof scanTdxSignals>>;

      return {
        total: payload.total,
        cached: payload.meta?.cached ?? null,
        universeSource: payload.meta?.universeSource ?? null,
        universeSize: payload.meta?.universeSize ?? null,
      };
    }),
    createRow('tdx-scan:warm', warm, (value) => {
      const payload = value as Awaited<ReturnType<typeof scanTdxSignals>>;

      return {
        total: payload.total,
        cached: payload.meta?.cached ?? null,
        universeSource: payload.meta?.universeSource ?? null,
        universeSize: payload.meta?.universeSize ?? null,
      };
    }),
    createRow('tdx-scan:warm-pool', warmPoolOnly, (value) => {
      const payload = value as Awaited<ReturnType<typeof scanTdxSignals>>;

      return {
        total: payload.total,
        cached: payload.meta?.cached ?? null,
        universeSource: payload.meta?.universeSource ?? null,
        universeSize: payload.meta?.universeSize ?? null,
      };
    }),
  ];
}

async function runBatchDiagnosisBenchmarks() {
  const result = await measure(() => batchDiagnose(batchDiagnosisRequest));

  return [
    createRow('batch-diagnosis:3-stocks', result, (value) => {
      const payload = value as Awaited<ReturnType<typeof batchDiagnose>>;

      return {
        total: payload.length,
        avgPerStockMs:
          payload.length > 0 ? toFixedNumber(result.durationMs / payload.length) : null,
      };
    }),
  ];
}

async function main() {
  console.log(`# Screening profile started at ${new Date().toISOString()}`);
  console.log('# Request presets');
  console.log(
    JSON.stringify(
      {
        screenRequest,
        tdxRequest,
        limitUpRequest,
        batchDiagnosisRequest,
      },
      null,
      2,
    ),
  );

  const marketPoolRows = await runMarketPoolBenchmarks();
  printRows('Shared Market Pool', marketPoolRows);

  const dashboardRows = await runDashboardBenchmarks();
  printRows('Dashboard', dashboardRows);

  const screenRows = await runScreenBenchmarks();
  printRows('Market Screen', screenRows);

  const limitUpRows = await runLimitUpBenchmarks();
  printRows('Limit Up', limitUpRows);

  const tdxRows = await runTdxBenchmarks();
  printRows('TDX Scan', tdxRows);

  const batchRows = await runBatchDiagnosisBenchmarks();
  printRows('Batch Diagnosis', batchRows);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

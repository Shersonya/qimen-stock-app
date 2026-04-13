type SmokeContext = Record<string, unknown>;

type PageCase = {
  kind: 'page';
  name: string;
  path: string;
  expectText?: string;
};

type ApiCase = {
  kind: 'api';
  name: string;
  path: string;
  method?: 'POST';
  body: Record<string, unknown> | ((context: SmokeContext) => Record<string, unknown>);
  summarize?: (payload: unknown) => Record<string, unknown>;
};

type SmokeCase = PageCase | ApiCase;

type SmokeResult = {
  name: string;
  status: number | 'FETCH_ERROR';
  durationMs: number;
  ok: boolean;
  details?: Record<string, unknown>;
  error?: string;
};

const DEFAULT_TIMEOUT_MS = 45_000;
const defaultBaseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3100';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

const smokeCases: SmokeCase[] = [
  {
    kind: 'page',
    name: 'page:/',
    path: '/',
    expectText: '奇门量化工作台',
  },
  {
    kind: 'page',
    name: 'page:/dashboard',
    path: '/dashboard',
    expectText: '奇门吉气总览',
  },
  {
    kind: 'page',
    name: 'page:/screen',
    path: '/screen',
    expectText: '四层滤网控制台',
  },
  {
    kind: 'page',
    name: 'page:/strategy',
    path: '/strategy',
    expectText: '龙头博弈、通达信与涨停板的三模块工作台',
  },
  {
    kind: 'page',
    name: 'page:/stock-pool',
    path: '/stock-pool',
    expectText: '股票池',
  },
  {
    kind: 'page',
    name: 'page:/diagnosis',
    path: '/diagnosis',
    expectText: '个股深度诊断',
  },
  {
    kind: 'page',
    name: 'page:/settings',
    path: '/settings',
    expectText: '系统设置',
  },
  {
    kind: 'api',
    name: 'api:market-dashboard',
    path: '/api/market-dashboard',
    body: {},
    summarize: (payload) => {
      const data = asRecord(payload);
      const cache = asRecord(data.cache);
      const marketSignal = asRecord(data.marketSignal);
      return {
        universeSize: data.universeSize ?? null,
        cacheSource: cache.source ?? null,
        signal: marketSignal.statusLabel ?? null,
      };
    },
  },
  {
    kind: 'api',
    name: 'api:dragon-head:monitor',
    path: '/api/dragon-head/monitor',
    body: {
      mode: 'mock_complete',
    },
    summarize: (payload) => {
      const data = asRecord(payload);
      const trendSwitch = asRecord(data.trendSwitch);
      const circuitBreaker = asRecord(data.circuitBreaker);
      return {
        aiAdviceEnabled: data.aiAdviceEnabled ?? null,
        instruction: trendSwitch.instruction ?? null,
        breaker: circuitBreaker.triggered ?? null,
      };
    },
  },
  {
    kind: 'api',
    name: 'api:dragon-head:candidates',
    path: '/api/dragon-head/candidates',
    body: {
      mode: 'mock_degraded',
    },
    summarize: (payload) => {
      const data = asRecord(payload);
      const items = asArray(data.items);
      const firstItem = asRecord(items[0]);
      const strength = asRecord(firstItem.strength);
      return {
        total: data.total ?? null,
        first: firstItem.stockCode ?? null,
        confidence: strength.confidence ?? null,
      };
    },
  },
  {
    kind: 'api',
    name: 'api:market-screen',
    path: '/api/market-screen',
    body: {
      filters: {
        hour: {
          door: '开门',
        },
      },
      page: 1,
      pageSize: 5,
    },
    summarize: (payload) => {
      const data = asRecord(payload);
      const meta = asRecord(data.meta);
      const items = asArray(data.items);
      const firstItem = asRecord(items[0]);
      const stock = asRecord(firstItem.stock);
      return {
        total: data.total ?? null,
        source: meta.source ?? null,
        first: stock.code ?? null,
      };
    },
  },
  {
    kind: 'api',
    name: 'api:tdx-scan',
    path: '/api/tdx-scan',
    body: {
      signalType: 'both',
      page: 1,
      pageSize: 5,
    },
    summarize: (payload) => {
      const data = asRecord(payload);
      const meta = asRecord(data.meta);
      const items = asArray(data.items);
      const firstItem = asRecord(items[0]);
      return {
        total: data.total ?? null,
        cached: meta.cached ?? null,
        universeSource: meta.universeSource ?? null,
        first: firstItem.stockCode ?? null,
      };
    },
  },
  {
    kind: 'api',
    name: 'api:limit-up',
    path: '/api/limit-up',
    body: {
      lookbackDays: 5,
      minLimitUpCount: 1,
      page: 1,
      pageSize: 5,
      sortBy: 'limitUpCount',
      sortOrder: 'desc',
    },
    summarize: (payload) => {
      const data = asRecord(payload);
      const meta = asRecord(data.meta);
      const items = asArray(data.items);
      const firstItem = asRecord(items[0]);
      return {
        total: data.total ?? null,
        source: meta.source ?? 'live',
        filterDate: data.filterDate ?? null,
        first: firstItem.stockCode ?? null,
      };
    },
  },
  {
    kind: 'api',
    name: 'api:qimen',
    path: '/api/qimen',
    body: {
      stockCode: '600519',
    },
    summarize: (payload) => {
      const data = asRecord(payload);
      const stock = asRecord(data.stock);
      const patternAnalysis = asRecord(data.patternAnalysis);
      const deepDiagnosis = asRecord(data.deepDiagnosis);
      return {
        stock: stock.code ?? null,
        rating: patternAnalysis.rating ?? null,
        action: deepDiagnosis.actionLabel ?? null,
      };
    },
  },
  {
    kind: 'api',
    name: 'api:batch-diagnosis',
    path: '/api/batch-diagnosis',
    body: {
      stockCodes: ['600519', '000001'],
    },
    summarize: (payload) => {
      const data = asArray(payload);
      const firstItem = asRecord(data[0]);
      return {
        total: data.length,
        first: firstItem.stockCode ?? null,
      };
    },
  },
  {
    kind: 'api',
    name: 'api:backtest',
    path: '/api/backtest',
    body: {
      items: [],
      lookbackDays: 30,
    },
    summarize: (payload) => {
      const data = asRecord(payload);
      const summary = asRecord(data.summary);
      return {
        samples: summary.totalSamples ?? null,
        hitRate: summary.hitRate ?? null,
      };
    },
  },
  {
    kind: 'api',
    name: 'api:stock-pool:list',
    path: '/api/stock-pool',
    body: {
      action: 'list',
    },
    summarize: (payload) => {
      const data = asRecord(payload);
      const pools = asArray(data.pools);
      return {
        pools: pools.length,
        activePoolId: data.activePoolId ?? null,
      };
    },
  },
  {
    kind: 'api',
    name: 'api:stock-pool:create',
    path: '/api/stock-pool',
    body: {
      action: 'create',
      name: '冒烟验收池',
      stocks: [
        {
          stockCode: '600519',
          stockName: '贵州茅台',
          market: 'SH',
          addReason: 'manual',
          addDate: '2026-03-21',
        },
      ],
    },
    summarize: (payload) => {
      const data = asRecord(payload);
      const pool = asRecord(data.pool);
      const stocks = asArray(pool.stocks);
      return {
        poolId: pool.id ?? null,
        stockCount: stocks.length,
      };
    },
  },
  {
    kind: 'api',
    name: 'api:stock-pool:get',
    path: '/api/stock-pool',
    body: (context) => ({
      action: 'get',
      poolId: asRecord(asRecord(context['api:stock-pool:create']).pool).id,
    }),
    summarize: (payload) => {
      const data = asRecord(payload);
      const pool = asRecord(data.pool);
      const stocks = asArray(pool.stocks);
      return {
        poolId: pool.id ?? null,
        stockCount: stocks.length,
      };
    },
  },
];

function printResult(result: SmokeResult) {
  const prefix = result.ok ? 'PASS' : 'FAIL';
  const details = result.details ? ` ${JSON.stringify(result.details)}` : '';
  const error = result.error ? ` ${result.error}` : '';

  console.log(
    `${prefix} ${result.name} status=${result.status} durationMs=${result.durationMs}${details}${error}`,
  );
}

async function fetchWithTimeout(
  input: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function runPageCase(baseUrl: string, testCase: PageCase): Promise<SmokeResult> {
  const startedAt = Date.now();

  try {
    const response = await fetchWithTimeout(`${baseUrl}${testCase.path}`);
    const html = await response.text();
    const includesExpectedText = testCase.expectText ? html.includes(testCase.expectText) : true;
    const ok = response.ok && includesExpectedText;

    return {
      name: testCase.name,
      status: response.status,
      durationMs: Date.now() - startedAt,
      ok,
      details: {
        expectedText: testCase.expectText ?? null,
        matched: includesExpectedText,
      },
      error: ok ? undefined : 'page smoke assertion failed',
    };
  } catch (error) {
    return {
      name: testCase.name,
      status: 'FETCH_ERROR',
      durationMs: Date.now() - startedAt,
      ok: false,
      error: String(error),
    };
  }
}

async function runApiCase(
  baseUrl: string,
  context: SmokeContext,
  testCase: ApiCase,
): Promise<SmokeResult> {
  const startedAt = Date.now();
  const body = typeof testCase.body === 'function' ? testCase.body(context) : testCase.body;

  try {
    const response = await fetchWithTimeout(`${baseUrl}${testCase.path}`, {
      method: testCase.method ?? 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as Record<string, unknown>;

    context[testCase.name] = payload;

    return {
      name: testCase.name,
      status: response.status,
      durationMs: Date.now() - startedAt,
      ok: response.ok,
      details: testCase.summarize ? testCase.summarize(payload) : undefined,
      error: response.ok
        ? undefined
        : JSON.stringify(payload.error ?? payload),
    };
  } catch (error) {
    return {
      name: testCase.name,
      status: 'FETCH_ERROR',
      durationMs: Date.now() - startedAt,
      ok: false,
      error: String(error),
    };
  }
}

async function main() {
  const context: SmokeContext = {};
  const results: SmokeResult[] = [];

  console.log(`Running runtime smoke against ${defaultBaseUrl}`);

  for (const testCase of smokeCases) {
    const result =
      testCase.kind === 'page'
        ? await runPageCase(defaultBaseUrl, testCase)
        : await runApiCase(defaultBaseUrl, context, testCase);

    results.push(result);
    printResult(result);
  }

  const passed = results.filter((item) => item.ok).length;
  const failed = results.length - passed;

  console.log(
    `Smoke summary: passed=${passed} failed=${failed} total=${results.length}`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

void main();

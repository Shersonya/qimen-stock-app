import type {
  BacktestApiSuccessResponse,
  MarketScreenFilters,
  MarketScreenResultItem,
} from '@/lib/contracts/qimen';

type CountEntry = {
  label: string;
  count: number;
};

export type MarketReportStats = {
  totalStocks: number;
  eligibleStocks: number;
  bullishStocks: number;
  averageScore: number;
  ratingCounts: Record<'S' | 'A' | 'B' | 'C', number>;
  topPatterns: CountEntry[];
  topSectors: CountEntry[];
  topPalaces: CountEntry[];
  brief: string;
  strategyLabel: string;
};

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function formatFilterValues(values: string[], fallback: string) {
  return values.length > 0 ? values.join(' / ') : fallback;
}

export function createStrategyLabel(filters: MarketScreenFilters | null): string {
  if (!filters) {
    return '当前筛选策略';
  }

  const parts: string[] = [];

  if (filters.hour.door || filters.hour.star || filters.hour.god) {
    parts.push(
      `时干 ${formatFilterValues(
        [filters.hour.door, filters.hour.star, filters.hour.god].filter(Boolean) as string[],
        '不限',
      )}`,
    );
  }

  if (filters.day.door || filters.day.star || filters.day.god) {
    parts.push(
      `日干 ${formatFilterValues(
        [filters.day.door, filters.day.star, filters.day.god].filter(Boolean) as string[],
        '不限',
      )}`,
    );
  }

  if (filters.month.door || filters.month.star || filters.month.god) {
    parts.push(
      `月干 ${formatFilterValues(
        [filters.month.door, filters.month.star, filters.month.god].filter(Boolean) as string[],
        '不限',
      )}`,
    );
  }

  if (filters.pattern?.names && filters.pattern.names.length > 0) {
    parts.push(`吉格 ${filters.pattern.names.join('、')}`);
  }

  if (filters.pattern?.palacePositions && filters.pattern.palacePositions.length > 0) {
    parts.push(`宫位 ${filters.pattern.palacePositions.join('、')}宫`);
  }

  if (filters.pattern?.minScore) {
    parts.push(`分数 >= ${filters.pattern.minScore}`);
  }

  if (filters.pattern?.bullishOnly) {
    parts.push('仅看多');
  }

  return parts.join(' · ') || '当前筛选策略';
}

function countEntries(values: string[]) {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label, 'zh-Hans-CN');
    });
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function buildMarketReportStats(
  items: MarketScreenResultItem[],
  filters: MarketScreenFilters | null,
): MarketReportStats {
  const eligibleStocks = items.filter((item) => item.patternSummary?.isEligible !== false);
  const bullishStocks = items.filter((item) => item.patternSummary?.bullishSignal).length;
  const averageScore =
    items.length === 0
      ? 0
      : items.reduce((sum, item) => sum + (item.patternSummary?.totalScore ?? 0), 0) /
        items.length;
  const topPatterns = countEntries(
    items.flatMap((item) => item.patternSummary?.matchedPatternNames ?? []),
  );
  const topSectors = countEntries(
    items.map((item) => item.stock.sector || item.stock.market),
  );
  const topPalaces = countEntries(
    items.flatMap((item) =>
      uniqueStrings(
        (item.patternSummary?.matches ?? []).map((match) => match.palaceLabel),
      ),
    ),
  );
  const ratingCounts = items.reduce(
    (counts, item) => {
      const rating = item.patternSummary?.rating ?? 'C';
      counts[rating] += 1;
      return counts;
    },
    { S: 0, A: 0, B: 0, C: 0 },
  );
  const topPattern = topPatterns[0];
  const topSector = topSectors[0];
  const briefParts = [
    topPattern ? `今日高频吉格为「${topPattern.label}」(${topPattern.count} 次)` : null,
    topSector ? `集中在 ${topSector.label} (${topSector.count} 只)` : null,
    items.length > 0 ? `看多占比 ${formatPercent(bullishStocks / items.length)}` : null,
  ].filter(Boolean);

  return {
    totalStocks: items.length,
    eligibleStocks: eligibleStocks.length,
    bullishStocks,
    averageScore: Number(averageScore.toFixed(1)),
    ratingCounts,
    topPatterns: topPatterns.slice(0, 5),
    topSectors: topSectors.slice(0, 5),
    topPalaces: topPalaces.slice(0, 5),
    brief:
      briefParts.join('，') || '当前筛盘结果较少，建议放宽条件后再观察热点分布。',
    strategyLabel: createStrategyLabel(filters),
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function createMarketReportCsv(items: MarketScreenResultItem[]) {
  const header = [
    '股票代码',
    '股票名称',
    '市场/板块',
    '总分',
    '评级',
    '能量标签',
    '预测方向',
    '核心吉格',
    '命中吉格',
    '操作建议',
  ];
  const rows = items.map((item) => [
    item.stock.code,
    item.stock.name,
    item.stock.sector || item.stock.market,
    `${item.patternSummary?.totalScore ?? 0}`,
    item.patternSummary?.rating ?? 'C',
    item.patternSummary?.energyLabel ?? '',
    item.patternSummary?.predictedDirection ?? '观望',
    item.patternSummary?.corePatternsLabel ?? '',
    (item.patternSummary?.matchedPatternNames ?? []).join('、'),
    item.patternSummary?.summary ?? '',
  ]);

  return ['\uFEFF' + header.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))].join('\n');
}

export function createMarketReportPrintHtml(args: {
  items: MarketScreenResultItem[];
  stats: MarketReportStats;
  backtest: BacktestApiSuccessResponse | null;
}) {
  const { items, stats, backtest } = args;
  const rows = items
    .map((item) => {
      return `<tr>
        <td>${escapeHtml(item.stock.code)}</td>
        <td>${escapeHtml(item.stock.name)}</td>
        <td>${escapeHtml(item.stock.sector || item.stock.market)}</td>
        <td>${item.patternSummary?.totalScore ?? 0}</td>
        <td>${escapeHtml(item.patternSummary?.rating ?? 'C')}</td>
        <td>${escapeHtml(item.patternSummary?.corePatternsLabel ?? '')}</td>
        <td>${escapeHtml(item.patternSummary?.predictedDirection ?? '观望')}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
  <html lang="zh-CN">
    <head>
      <meta charset="utf-8" />
      <title>奇门吉格量化报告</title>
      <style>
        body { font-family: "PingFang SC", "Noto Sans SC", sans-serif; padding: 32px; color: #1b120f; }
        h1, h2 { margin: 0 0 12px; }
        p { line-height: 1.7; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #cbb497; padding: 10px; text-align: left; font-size: 12px; }
        th { background: #f2e3c4; }
        .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
        .card { border: 1px solid #cbb497; border-radius: 12px; padding: 14px; background: #fffaf1; }
      </style>
    </head>
    <body>
      <h1>奇门吉格量化筛选报告</h1>
      <p>${escapeHtml(stats.brief)}</p>
      <div class="grid">
        <div class="card"><strong>命中标的</strong><br />${stats.totalStocks}</div>
        <div class="card"><strong>可执行标的</strong><br />${stats.eligibleStocks}</div>
        <div class="card"><strong>看多占比</strong><br />${stats.totalStocks > 0 ? formatPercent(stats.bullishStocks / stats.totalStocks) : '0.0%'}</div>
        <div class="card"><strong>平均得分</strong><br />${stats.averageScore}</div>
      </div>
      ${
        backtest
          ? `<h2>回测摘要</h2>
             <p>策略「${escapeHtml(backtest.strategyLabel)}」在 ${escapeHtml(backtest.range.from)} 至 ${escapeHtml(backtest.range.to)} 的命中率为 ${formatPercent(backtest.summary.hitRate)}，样本数 ${backtest.summary.totalSamples}。</p>`
          : ''
      }
      <h2>推荐清单</h2>
      <table>
        <thead>
          <tr>
            <th>代码</th>
            <th>名称</th>
            <th>市场/板块</th>
            <th>总分</th>
            <th>评级</th>
            <th>核心吉格</th>
            <th>预测方向</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
  </html>`;
}

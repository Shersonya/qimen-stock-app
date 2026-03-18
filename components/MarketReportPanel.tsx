'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';

import {
  ERROR_CODES,
  getErrorMessage,
  isApiErrorResponse,
  type ApiError,
  type BacktestApiResponse,
  type BacktestApiSuccessResponse,
  type MarketScreenFilters,
  type MarketScreenResultItem,
} from '@/lib/contracts/qimen';
import {
  getDemoBacktestResponse,
  isDemoAutoplay,
  isDemoMode,
} from '@/lib/demo-fixtures';
import {
  buildMarketReportStats,
  createMarketReportCsv,
  createMarketReportPrintHtml,
  createStrategyLabel,
} from '@/lib/market-report';
import { ErrorNotice } from '@/components/ErrorNotice';

type MarketReportPanelProps = {
  items: MarketScreenResultItem[];
  filters: MarketScreenFilters | null;
};

function createFallbackError(): ApiError {
  return {
    code: ERROR_CODES.API_ERROR,
    message: getErrorMessage(ERROR_CODES.API_ERROR),
  };
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[1.2rem] border border-[var(--border-soft)] bg-[var(--surface-overlay)] px-4 py-4">
      <p className="mystic-section-label">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
    </article>
  );
}

export function MarketReportPanel({
  items,
  filters,
}: MarketReportPanelProps) {
  const [lookbackDays, setLookbackDays] = useState(60);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtest, setBacktest] = useState<BacktestApiSuccessResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const demoAutoplayRef = useRef(false);
  const stats = useMemo(() => buildMarketReportStats(items, filters), [filters, items]);
  const strategyLabel = useMemo(() => createStrategyLabel(filters), [filters]);

  async function handleRunBacktest() {
    setIsBacktesting(true);

    try {
      const eligibleItems = items.filter(
        (
          item,
        ): item is MarketScreenResultItem & {
          patternSummary: NonNullable<MarketScreenResultItem['patternSummary']>;
        } => Boolean(item.patternSummary),
      );
      let payload: BacktestApiResponse | null = null;
      let ok = true;

      if (isDemoMode()) {
        payload = getDemoBacktestResponse();
      } else {
        const response = await fetch('/api/backtest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: eligibleItems.map((item) => ({
              stock: item.stock,
              patternSummary: item.patternSummary,
            })),
            lookbackDays,
            strategyLabel,
          }),
        });

        ok = response.ok;

        try {
          payload = (await response.json()) as BacktestApiResponse;
        } catch {
          payload = null;
        }
      }

      if (!payload || !ok || isApiErrorResponse(payload)) {
        setBacktest(null);
        setError(payload && isApiErrorResponse(payload) ? payload.error : createFallbackError());
        return;
      }

      setError(null);
      setBacktest(payload);
    } catch {
      setBacktest(null);
      setError(createFallbackError());
    } finally {
      setIsBacktesting(false);
    }
  }

  function handleExportCsv() {
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadFile(
      `qimen-market-report-${timestamp}.csv`,
      createMarketReportCsv(items),
      'text/csv;charset=utf-8',
    );
  }

  function handleExportPdf() {
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=1280,height=900');

    if (!popup) {
      return;
    }

    popup.document.open();
    popup.document.write(
      createMarketReportPrintHtml({
        items,
        stats,
        backtest,
      }),
    );
    popup.document.close();
    popup.focus();
    popup.print();
  }

  const runDemoBacktest = useEffectEvent(() => {
    void handleRunBacktest();
  });

  useEffect(() => {
    if (
      demoAutoplayRef.current ||
      !isDemoAutoplay() ||
      items.length === 0 ||
      isBacktesting ||
      backtest
    ) {
      return;
    }

    demoAutoplayRef.current = true;
    runDemoBacktest();
  }, [backtest, isBacktesting, items]);

  return (
    <section
      className="mt-5 rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4"
      data-testid="market-report-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-4">
        <div className="max-w-3xl">
          <p className="mystic-section-label">吉格报告与统计</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            策略回顾与热点简报
          </h3>
          <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
            {stats.brief}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="mystic-chip" onClick={handleExportCsv} type="button">
            导出 Excel(CSV)
          </button>
          <button className="mystic-chip" onClick={handleExportPdf} type="button">
            导出 PDF
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-4">
        <MetricCard label="命中标的" value={`${stats.totalStocks}`} />
        <MetricCard label="可执行标的" value={`${stats.eligibleStocks}`} />
        <MetricCard
          label="看多占比"
          value={
            stats.totalStocks > 0
              ? `${((stats.bullishStocks / stats.totalStocks) * 100).toFixed(1)}%`
              : '0.0%'
          }
        />
        <MetricCard label="平均得分" value={`${stats.averageScore}`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <article className="rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-overlay)] px-4 py-4">
          <p className="mystic-section-label">吉格分布</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.topPatterns.map((item) => (
              <span className="mystic-chip" key={item.label}>
                {item.label} {item.count}
              </span>
            ))}
          </div>
        </article>
        <article className="rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-overlay)] px-4 py-4">
          <p className="mystic-section-label">板块/市场分布</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.topSectors.map((item) => (
              <span className="mystic-chip" key={item.label}>
                {item.label} {item.count}
              </span>
            ))}
          </div>
        </article>
        <article className="rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-overlay)] px-4 py-4">
          <p className="mystic-section-label">热点宫位</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.topPalaces.map((item) => (
              <span className="mystic-chip" key={item.label}>
                {item.label} {item.count}
              </span>
            ))}
          </div>
        </article>
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-overlay)] px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mystic-section-label">历史回测</p>
            <h4 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
              {strategyLabel}
            </h4>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              当前规则按“时干用神落生门或值符定义为涨，其余默认记为观望”进行历史日线回测。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="回测窗口"
              className="mystic-select min-w-[160px]"
              onChange={(event) => setLookbackDays(Number(event.target.value))}
              value={lookbackDays}
            >
              <option value={20}>近 20 日</option>
              <option value={60}>近 60 日</option>
              <option value={120}>近 120 日</option>
            </select>
            <button
              className="mystic-button-secondary"
              disabled={items.every((item) => !item.patternSummary) || isBacktesting}
              onClick={() => void handleRunBacktest()}
              type="button"
            >
              {isBacktesting ? '回测中...' : '运行历史回测'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4">
            <ErrorNotice error={error} title="回测异常" />
          </div>
        ) : null}

        {backtest ? (
          <div className="mt-4 space-y-4" data-testid="backtest-summary">
            <div className="grid gap-4 xl:grid-cols-4">
              <MetricCard label="样本总数" value={`${backtest.summary.totalSamples}`} />
              <MetricCard
                label="命中率"
                value={`${(backtest.summary.hitRate * 100).toFixed(1)}%`}
              />
              <MetricCard label="纳入股票" value={`${backtest.includedStocks}`} />
              <MetricCard label="回测区间" value={`${backtest.range.from} - ${backtest.range.to}`} />
            </div>
            <div className="rounded-[1.15rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
              <p className="mystic-section-label">预测规则</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                {backtest.predictionRule}
              </p>
              {backtest.skippedStocks.length > 0 ? (
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  已跳过: {backtest.skippedStocks.join('、')}
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <article className="rounded-[1.15rem] border border-[var(--border-soft)] bg-[var(--surface-overlay)] px-4 py-4">
                <p className="mystic-section-label">个股命中率</p>
                <div className="mt-3 space-y-2">
                  {Object.entries(backtest.byStock).map(([stockId, summary]) => (
                    <div className="flex items-center justify-between gap-3" key={stockId}>
                      <span className="text-sm text-[var(--text-primary)]">{summary.label}</span>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {(summary.hitRate * 100).toFixed(1)}% · {summary.totalSamples} 样本
                      </span>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-[1.15rem] border border-[var(--border-soft)] bg-[var(--surface-overlay)] px-4 py-4">
                <p className="mystic-section-label">筛选方式命中率</p>
                <div className="mt-3 space-y-2">
                  {Object.entries(backtest.byStrategy).map(([strategyId, summary]) => (
                    <div className="flex items-center justify-between gap-3" key={strategyId}>
                      <span className="text-sm text-[var(--text-primary)]">{summary.label}</span>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {(summary.hitRate * 100).toFixed(1)}% · {summary.totalSamples} 样本
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

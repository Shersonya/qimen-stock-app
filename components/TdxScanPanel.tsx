'use client';

import { useMemo, useState } from 'react';

import { ErrorNotice } from '@/components/ErrorNotice';
import { requestTdxScan } from '@/lib/client-api';
import type { ApiError } from '@/lib/contracts/qimen';
import type { TdxScanRequest, TdxScanResponse } from '@/lib/contracts/strategy';
import type { TdxScanResult } from '@/lib/tdx/types';

type TdxSortKey = 'signalStrength' | 'trueCGain' | 'biasRate' | 'volumeRatio' | 'closePrice' | 'signalDate';

type TdxScanPanelProps = {
  demoMode?: boolean;
  activePoolName?: string;
  poolStockCodes?: string[];
  onAddStock?: (item: TdxScanResult) => void;
  onAddAllStocks?: (items: TdxScanResult[]) => void;
};

const SORT_LABELS: Record<TdxSortKey, string> = {
  signalStrength: '强度',
  trueCGain: '真C涨幅',
  biasRate: '乖离率',
  volumeRatio: '量比',
  closePrice: '收盘价',
  signalDate: '信号日期',
};

const UNIVERSE_SOURCE_LABELS = {
  market_pool: '主市场池',
  limit_up_fallback: '涨停活跃降级',
  bundled_market_fallback: '内置活跃样本',
} as const;

const DEFAULT_REQUEST: TdxScanRequest = {
  signalType: 'both',
  requireMaUp: false,
  requireFiveLinesBull: false,
  maxBiasRate: 13,
  minSignalStrength: 0,
  page: 1,
  pageSize: 5,
};

function toApiError(error: unknown): ApiError {
  if (typeof error === 'object' && error && 'code' in error && 'message' in error) {
    return error as ApiError;
  }

  return {
    code: 'API_ERROR',
    message: '策略扫描失败，请稍后重试。',
  };
}

function compareValues(left: TdxScanResult, right: TdxScanResult, key: TdxSortKey) {
  if (key === 'signalDate') {
    return left.signalDate.localeCompare(right.signalDate);
  }

  return (left[key] as number) - (right[key] as number);
}

export function TdxScanPanel({
  demoMode = false,
  activePoolName,
  poolStockCodes = [],
  onAddStock,
  onAddAllStocks,
}: TdxScanPanelProps) {
  const [request, setRequest] = useState<TdxScanRequest>(DEFAULT_REQUEST);
  const [pageInput, setPageInput] = useState(String(DEFAULT_REQUEST.page));
  const [pageSizeInput, setPageSizeInput] = useState(String(DEFAULT_REQUEST.pageSize));
  const [sortKey, setSortKey] = useState<TdxSortKey>('signalStrength');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [result, setResult] = useState<TdxScanResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedItems = useMemo(() => {
    if (!result) {
      return [];
    }

    return [...result.items].sort((left, right) => {
      const value = compareValues(left, right, sortKey);

      return sortOrder === 'desc' ? -value : value;
    });
  }, [result, sortKey, sortOrder]);

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  const poolStockCodeSet = useMemo(() => new Set(poolStockCodes), [poolStockCodes]);

  async function execute(nextRequest: TdxScanRequest) {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = await requestTdxScan(nextRequest);
      setResult(payload);
      setPageInput(String(payload.page));
      setPageSizeInput(String(payload.pageSize));
      setRequest({
        ...nextRequest,
        page: payload.page,
        pageSize: payload.pageSize,
      });
    } catch (nextError) {
      setError(toApiError(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateRequest<K extends keyof TdxScanRequest>(
    key: K,
    value: TdxScanRequest[K],
  ) {
    setRequest((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function changeSort(nextKey: TdxSortKey) {
    if (sortKey === nextKey) {
      setSortOrder((order) => (order === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(nextKey);
      setSortOrder('desc');
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPage = Math.max(1, Number(pageInput) || 1);
    const nextPageSize = Math.max(1, Number(pageSizeInput) || DEFAULT_REQUEST.pageSize!);

    await execute({
      ...request,
      page: nextPage,
      pageSize: nextPageSize,
    });
  }

  async function handlePageChange(nextPage: number) {
    if (!result) {
      return;
    }

    const boundedPage = Math.min(Math.max(1, nextPage), totalPages);

    setPageInput(String(boundedPage));
    await execute({
      ...request,
      page: boundedPage,
      pageSize: result.pageSize,
    });
  }

  const currentPage = Number(pageInput) || 1;

  return (
    <article className="workbench-card" data-testid="tdx-scan-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mystic-section-label">通达信美柱 / 美阳阳</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            策略扫描表单
          </h3>
          <p className="mt-3 max-w-3xl text-sm text-[var(--text-secondary)]">
            当前页先提供可执行的扫描入口、分页和排序控制，后续 issue 会把完整 X_1~X_148
            引擎结果接入这里的结果表。
          </p>
        </div>
        <span className="mystic-chip">{demoMode ? 'Demo 模式' : 'Live API 模式'}</span>
      </div>

      <form className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.95fr),minmax(0,1.05fr)]" onSubmit={handleSubmit}>
        <section className="workbench-card workbench-subcard">
          <p className="mystic-section-label">筛选条件</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">信号类型</span>
              <select
                className="mystic-select w-full"
                value={request.signalType}
                onChange={(event) =>
                  updateRequest('signalType', event.target.value as TdxScanRequest['signalType'])
                }
              >
                <option value="both">全部</option>
                <option value="meiZhu">仅美柱</option>
                <option value="meiYangYang">仅美阳阳</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">页大小</span>
              <select
                className="mystic-select w-full"
                value={pageSizeInput}
                onChange={(event) => setPageSizeInput(event.target.value)}
              >
                <option value="2">2</option>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--text-secondary)]">
              <input
                checked={Boolean(request.requireMaUp)}
                onChange={(event) => updateRequest('requireMaUp', event.target.checked)}
                type="checkbox"
              />
              要求均线向上
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--text-secondary)]">
              <input
                checked={Boolean(request.requireFiveLinesBull)}
                onChange={(event) => updateRequest('requireFiveLinesBull', event.target.checked)}
                type="checkbox"
              />
              要求五线多头
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">最大乖离率</span>
              <input
                className="mystic-input w-full"
                inputMode="decimal"
                type="number"
                value={request.maxBiasRate ?? ''}
                onChange={(event) =>
                  updateRequest(
                    'maxBiasRate',
                    event.target.value === '' ? undefined : Number(event.target.value),
                  )
                }
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">最小信号强度</span>
              <input
                className="mystic-input w-full"
                inputMode="decimal"
                type="number"
                value={request.minSignalStrength ?? ''}
                onChange={(event) =>
                  updateRequest(
                    'minSignalStrength',
                    event.target.value === '' ? undefined : Number(event.target.value),
                  )
                }
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">页码</span>
              <input
                className="mystic-input w-full"
                min={1}
                type="number"
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">排序顺序</span>
              <select
                className="mystic-select w-full"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as 'asc' | 'desc')}
              >
                <option value="desc">降序</option>
                <option value="asc">升序</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="mystic-button-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? '扫描中...' : '开始扫描'}
            </button>
            <button
              className="mystic-button-secondary"
              disabled={isSubmitting}
              type="button"
              onClick={() => {
                setRequest(DEFAULT_REQUEST);
                setPageInput(String(DEFAULT_REQUEST.page));
                setPageSizeInput(String(DEFAULT_REQUEST.pageSize));
                setSortKey('signalStrength');
                setSortOrder('desc');
                setResult(null);
                setError(null);
              }}
            >
              重置条件
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="mystic-chip">扫描半径 180 日</span>
            <span className="mystic-chip">分页可调</span>
            <span className="mystic-chip">表头可排序</span>
            <span className="mystic-chip">
              {activePoolName ? `加入 ${activePoolName}` : '未建池时自动创建'}
            </span>
          </div>
        </section>

        <section className="workbench-card workbench-subcard">
          <p className="mystic-section-label">运行状态</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="workbench-stat-tile">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">模式</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                {demoMode ? 'Demo 验收' : 'Live 请求'}
              </p>
            </div>
            <div className="workbench-stat-tile">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">排序</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                {SORT_LABELS[sortKey]} / {sortOrder === 'desc' ? '降序' : '升序'}
              </p>
            </div>
            <div className="workbench-stat-tile">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">分页</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                第 {currentPage} 页
              </p>
            </div>
          </div>

          {isSubmitting ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[var(--text-secondary)]">
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(216,179,90,0.45)] border-t-[rgba(216,179,90,0.95)]" />
                <span>正在扫描通达信策略，结果表即将刷新。</span>
              </div>
            </div>
          ) : null}

          {error ? <div className="mt-4"><ErrorNotice error={error} title="策略扫描失败" /></div> : null}
        </section>
      </form>

      <section className="mt-6 workbench-card" data-testid="tdx-result-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mystic-section-label">扫描结果</p>
            <h4 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
              {result ? `共 ${result.total} 只，当前页 ${result.page} / ${totalPages}` : '等待扫描'}
            </h4>
          </div>
          {result ? (
            <div className="flex flex-wrap gap-2">
              <span className="mystic-chip">扫描日 {result.scanDate}</span>
              <span className="mystic-chip">页大小 {result.pageSize}</span>
              <span className="mystic-chip">
                扫描宇宙 {UNIVERSE_SOURCE_LABELS[result.meta.universeSource]}
              </span>
              <span className="mystic-chip">宇宙样本 {result.meta.universeSize}</span>
              {result.meta.cached ? <span className="mystic-chip">短期缓存命中</span> : null}
            </div>
          ) : null}
        </div>

        {result?.meta.notice ? (
          <div
            className="mt-4 rounded-2xl border border-[rgba(216,179,90,0.35)] bg-[rgba(216,179,90,0.12)] p-4 text-sm text-[var(--text-primary)]"
            data-testid="tdx-scan-notice"
          >
            {result.meta.notice}
          </div>
        ) : null}

        {result ? (
          <div className="mt-5 overflow-x-auto rounded-[1.2rem] border border-white/10">
            <table className="workbench-settings-table" data-testid="tdx-result-table">
              <thead>
                <tr>
                  <th>代码</th>
                  <th>名称</th>
                  <th>信号</th>
                  <th>
                    <button className="workbench-link-button" type="button" onClick={() => changeSort('signalStrength')}>
                      强度 {sortKey === 'signalStrength' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                    </button>
                  </th>
                  <th>
                    <button className="workbench-link-button" type="button" onClick={() => changeSort('trueCGain')}>
                      真C涨幅 {sortKey === 'trueCGain' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                    </button>
                  </th>
                  <th>
                    <button className="workbench-link-button" type="button" onClick={() => changeSort('biasRate')}>
                      乖离率 {sortKey === 'biasRate' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                    </button>
                  </th>
                  <th>
                    <button className="workbench-link-button" type="button" onClick={() => changeSort('volumeRatio')}>
                      量比 {sortKey === 'volumeRatio' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                    </button>
                  </th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={`${item.stockCode}-${item.signalDate}`}>
                    <td>{item.stockCode}</td>
                    <td>
                      <div className="font-semibold text-[var(--text-primary)]">{item.stockName}</div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">{item.market}</div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {item.meiZhu ? <span className="mystic-chip">美柱</span> : null}
                        {item.meiYangYang ? <span className="mystic-chip">美阳阳</span> : null}
                      </div>
                    </td>
                    <td>{item.signalStrength.toFixed(2)}</td>
                    <td>{item.trueCGain.toFixed(2)}%</td>
                    <td>{item.biasRate.toFixed(2)}%</td>
                    <td>{item.volumeRatio.toFixed(2)}</td>
                    <td>
                      <button
                        className="mystic-chip"
                        disabled={!onAddStock || poolStockCodeSet.has(item.stockCode)}
                        onClick={() => onAddStock?.(item)}
                        type="button"
                      >
                        {poolStockCodeSet.has(item.stockCode) ? '已在股票池' : '加入股票池'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-[var(--text-secondary)]">
            还没有扫描结果。先配置条件并执行扫描，结果表会在这里显示。
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              className="mystic-button-secondary"
              disabled={
                !sortedItems.some((item) => !poolStockCodeSet.has(item.stockCode)) || !onAddAllStocks
              }
              onClick={() =>
                onAddAllStocks?.(sortedItems.filter((item) => !poolStockCodeSet.has(item.stockCode)))
              }
              type="button"
            >
              将当前页结果加入股票池
            </button>
            <button
              className="mystic-button-secondary"
              disabled={!result || isSubmitting || result.page <= 1}
              type="button"
              onClick={() => handlePageChange((result?.page ?? 1) - 1)}
            >
              上一页
            </button>
            <button
              className="mystic-button-secondary"
              disabled={!result || isSubmitting || result.page >= totalPages}
              type="button"
              onClick={() => handlePageChange((result?.page ?? 1) + 1)}
            >
              下一页
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="mystic-chip">排序字段 {SORT_LABELS[sortKey]}</span>
            <span className="mystic-chip">结果数 {result?.items.length ?? 0}</span>
          </div>
        </div>
      </section>
    </article>
  );
}

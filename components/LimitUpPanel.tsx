'use client';

import { useMemo, useState } from 'react';

import { ErrorNotice } from '@/components/ErrorNotice';
import { requestLimitUp } from '@/lib/client-api';
import type { ApiError } from '@/lib/contracts/qimen';
import type {
  LimitUpFilterRequest,
  LimitUpFilterResponse,
  LimitUpStock,
} from '@/lib/contracts/strategy';
import { toApiError } from '@/lib/utils/api-error';

type LimitUpSortKey = 'limitUpCount' | 'lastLimitUpDate' | 'latestClose';

type LimitUpPanelProps = {
  demoMode?: boolean;
  activePoolName?: string;
  poolStockCodes?: string[];
  onAddStock?: (item: LimitUpStock) => void;
  onAddAllStocks?: (items: LimitUpStock[]) => void;
};

const SORT_LABELS: Record<LimitUpSortKey, string> = {
  limitUpCount: '涨停次数',
  lastLimitUpDate: '最近涨停',
  latestClose: '最新收盘',
};

const DEFAULT_REQUEST: LimitUpFilterRequest = {
  lookbackDays: 30,
  minLimitUpCount: 1,
  excludeST: true,
  excludeKechuang: true,
  excludeNewStock: true,
  sortBy: 'limitUpCount',
  sortOrder: 'desc',
  page: 1,
  pageSize: 5,
};

function compareValues(left: LimitUpStock, right: LimitUpStock, key: LimitUpSortKey) {
  if (key === 'lastLimitUpDate') {
    return left.lastLimitUpDate.localeCompare(right.lastLimitUpDate);
  }

  return (left[key] as number) - (right[key] as number);
}

export function LimitUpPanel({
  demoMode = false,
  activePoolName,
  poolStockCodes = [],
  onAddStock,
  onAddAllStocks,
}: LimitUpPanelProps) {
  const [request, setRequest] = useState<LimitUpFilterRequest>(DEFAULT_REQUEST);
  const [pageInput, setPageInput] = useState(String(DEFAULT_REQUEST.page));
  const [pageSizeInput, setPageSizeInput] = useState(String(DEFAULT_REQUEST.pageSize));
  const [sortKey, setSortKey] = useState<LimitUpSortKey>(
    DEFAULT_REQUEST.sortBy as LimitUpSortKey,
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    DEFAULT_REQUEST.sortOrder ?? 'desc',
  );
  const [result, setResult] = useState<LimitUpFilterResponse | null>(null);
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

  async function execute(nextRequest: LimitUpFilterRequest) {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = await requestLimitUp(nextRequest);
      setResult(payload);
      setPageInput(String(payload.page));
      setPageSizeInput(String(payload.pageSize));
      setRequest({
        ...nextRequest,
        page: payload.page,
        pageSize: payload.pageSize,
      });
    } catch (nextError) {
      setError(toApiError(nextError, 'API_ERROR', '涨停筛选失败，请稍后重试。'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateRequest<K extends keyof LimitUpFilterRequest>(
    key: K,
    value: LimitUpFilterRequest[K],
  ) {
    setRequest((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function changeSort(nextKey: LimitUpSortKey) {
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
      sortBy: sortKey,
      sortOrder,
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
      sortBy: sortKey,
      sortOrder,
    });
  }

  const currentPage = Number(pageInput) || 1;

  return (
    <article className="workbench-card" data-testid="limit-up-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mystic-section-label">涨停板策略</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            近 30 日涨停筛选面板
          </h3>
          <p className="mt-3 max-w-3xl text-sm text-[var(--text-secondary)]">
            这一页把回溯窗口、排除条件、排序与分页预留好，后续 issue 会把真实涨停计算和股票池联动接上。
          </p>
        </div>
        <span className="mystic-chip">{demoMode ? 'Demo 模式' : 'Live API 模式'}</span>
      </div>

      <form className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.95fr),minmax(0,1.05fr)]" onSubmit={handleSubmit}>
        <section className="workbench-card workbench-subcard">
          <p className="mystic-section-label">筛选条件</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">回溯天数</span>
              <input
                className="mystic-input w-full"
                min={5}
                type="number"
                value={request.lookbackDays ?? 30}
                onChange={(event) => updateRequest('lookbackDays', Number(event.target.value))}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">最少涨停次数</span>
              <input
                className="mystic-input w-full"
                min={1}
                type="number"
                value={request.minLimitUpCount ?? 1}
                onChange={(event) => updateRequest('minLimitUpCount', Number(event.target.value))}
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--text-secondary)]">
              <input
                checked={request.excludeST !== false}
                onChange={(event) => updateRequest('excludeST', event.target.checked)}
                type="checkbox"
              />
              排除 ST / *ST / 退市
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--text-secondary)]">
              <input
                checked={request.excludeKechuang !== false}
                onChange={(event) => updateRequest('excludeKechuang', event.target.checked)}
                type="checkbox"
              />
              排除科创板
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--text-secondary)]">
              <input
                checked={request.excludeNewStock !== false}
                onChange={(event) => updateRequest('excludeNewStock', event.target.checked)}
                type="checkbox"
              />
              排除次新股
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">页大小</span>
              <select
                className="mystic-select w-full"
                value={pageSizeInput}
                onChange={(event) => setPageSizeInput(event.target.value)}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
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
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">排序字段</span>
              <select
                className="mystic-select w-full"
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as LimitUpSortKey)}
              >
                <option value="limitUpCount">涨停次数</option>
                <option value="lastLimitUpDate">最近涨停</option>
                <option value="latestClose">最新收盘</option>
              </select>
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
              {isSubmitting ? '筛选中...' : '执行筛选'}
            </button>
            <button
              className="mystic-button-secondary"
              disabled={isSubmitting}
              type="button"
              onClick={() => {
                setRequest(DEFAULT_REQUEST);
                setPageInput(String(DEFAULT_REQUEST.page));
                setPageSizeInput(String(DEFAULT_REQUEST.pageSize));
                setSortKey(DEFAULT_REQUEST.sortBy as LimitUpSortKey);
                setSortOrder(DEFAULT_REQUEST.sortOrder ?? 'desc');
                setResult(null);
                setError(null);
              }}
            >
              重置条件
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="mystic-chip">涨停阈值随板块变化</span>
            <span className="mystic-chip">排除条件可配置</span>
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
                <span>正在筛选涨停板样本，结果表即将刷新。</span>
              </div>
            </div>
          ) : null}

          {error ? <div className="mt-4"><ErrorNotice error={error} title="涨停筛选失败" /></div> : null}
        </section>
      </form>

      <section className="mt-6 workbench-card" data-testid="limit-up-result-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mystic-section-label">筛选结果</p>
            <h4 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
              {result ? `共 ${result.total} 只，当前页 ${result.page} / ${totalPages}` : '等待筛选'}
            </h4>
          </div>
          {result ? (
            <div className="flex flex-wrap gap-2">
              <span className="mystic-chip">筛选日 {result.filterDate}</span>
              <span className="mystic-chip">回溯 {result.lookbackDays} 日</span>
              {result.meta?.source === 'bundled_snapshot' ? (
                <span className="mystic-chip">内置快照</span>
              ) : null}
            </div>
          ) : null}
        </div>

        {result?.meta?.notice ? (
          <div className="mt-4 rounded-2xl border border-[rgba(216,179,90,0.35)] bg-[rgba(216,179,90,0.12)] p-4 text-sm text-[var(--text-primary)]">
            {result.meta.notice}
          </div>
        ) : null}

        {result ? (
          <div className="mt-5 overflow-x-auto rounded-[1.2rem] border border-white/10">
            <table className="workbench-settings-table" data-testid="limit-up-result-table">
              <thead>
                <tr>
                  <th>代码</th>
                  <th>名称</th>
                  <th>板块</th>
                  <th>
                    <button className="workbench-link-button" type="button" onClick={() => changeSort('limitUpCount')}>
                      涨停次数 {sortKey === 'limitUpCount' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                    </button>
                  </th>
                  <th>
                    <button className="workbench-link-button" type="button" onClick={() => changeSort('lastLimitUpDate')}>
                      最近涨停 {sortKey === 'lastLimitUpDate' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                    </button>
                  </th>
                  <th>
                    <button className="workbench-link-button" type="button" onClick={() => changeSort('latestClose')}>
                      最新收盘 {sortKey === 'latestClose' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                    </button>
                  </th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={`${item.stockCode}-${item.lastLimitUpDate}`}>
                    <td>{item.stockCode}</td>
                    <td>{item.stockName}</td>
                    <td>{item.sector ?? '未填写'}</td>
                    <td>{item.limitUpCount}</td>
                    <td>{item.lastLimitUpDate}</td>
                    <td>{item.latestClose.toFixed(2)}</td>
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
            还没有筛选结果。先配置条件并执行筛选，结果表会在这里显示。
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

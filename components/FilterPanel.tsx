'use client';

import { useEffect, useState } from 'react';

import {
  ERROR_CODES,
  QIMEN_DOOR_OPTIONS,
  QIMEN_GOD_OPTIONS,
  QIMEN_STAR_OPTIONS,
  getErrorMessage,
  isApiErrorResponse,
  type ApiError,
  type MarketScreenApiResponse,
  type MarketScreenFilters,
  type MarketScreenResultItem,
  type MarketScreenSuccessResponse,
  type MarketScreenWindowFilter,
} from '@/lib/contracts/qimen';
import { ErrorNotice } from '@/components/ErrorNotice';
import { getMarketLabel } from '@/lib/ui';

const INITIAL_FILTERS: MarketScreenFilters = {
  hour: { door: '', star: '', god: '' },
  day: { door: '', star: '', god: '' },
  month: { door: '', star: '', god: '' },
};

const WINDOW_CONFIGS = [
  { key: 'hour', label: '时干用神' },
  { key: 'day', label: '日干用神' },
  { key: 'month', label: '月干用神' },
] as const;

type WindowKey = (typeof WINDOW_CONFIGS)[number]['key'];
type WindowField = keyof MarketScreenWindowFilter;

type FilterPanelProps = {
  isLaunchingStock: boolean;
  launchingStockCode: string | null;
  onLaunchStock: (stockCode: string) => Promise<void>;
};

function createFallbackError(): ApiError {
  return {
    code: ERROR_CODES.API_ERROR,
    message: getErrorMessage(ERROR_CODES.API_ERROR),
  };
}

function normalizeFilters(filters: MarketScreenFilters): MarketScreenFilters {
  return {
    hour: {
      door: filters.hour.door?.trim() ?? '',
      star: filters.hour.star?.trim() ?? '',
      god: filters.hour.god?.trim() ?? '',
    },
    day: {
      door: filters.day.door?.trim() ?? '',
      star: filters.day.star?.trim() ?? '',
      god: filters.day.god?.trim() ?? '',
    },
    month: {
      door: filters.month.door?.trim() ?? '',
      star: filters.month.star?.trim() ?? '',
      god: filters.month.god?.trim() ?? '',
    },
  };
}

function hasActiveFilters(filters: MarketScreenFilters): boolean {
  return WINDOW_CONFIGS.some(({ key }) => {
    const window = filters[key];

    return Boolean(window.door || window.star || window.god);
  });
}

function WindowSummary({
  item,
}: {
  item: MarketScreenResultItem['hourWindow'];
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        {item.stem}干落{item.palaceName}宫
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        洛书 {item.position} · {item.door} / {item.star} / {item.god}
      </p>
    </div>
  );
}

function FilterCard({
  expanded,
  isMobile,
  children,
  label,
  onToggle,
}: {
  expanded: boolean;
  isMobile: boolean;
  children: React.ReactNode;
  label: string;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-[1.35rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
      <button
        className={`flex w-full items-center justify-between gap-3 ${isMobile ? '' : 'pointer-events-none'}`}
        onClick={onToggle}
        type="button"
      >
        <div className="text-left">
          <p className="mystic-section-label">{label}</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
            {label}
          </h3>
        </div>
        {isMobile ? <span className="mystic-chip">{expanded ? '收起' : '展开'}</span> : null}
      </button>
      <div className={`mt-4 ${expanded || !isMobile ? 'block' : 'hidden'}`}>{children}</div>
    </div>
  );
}

export function FilterPanel({
  isLaunchingStock,
  launchingStockCode,
  onLaunchStock,
}: FilterPanelProps) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<MarketScreenFilters | null>(null);
  const [result, setResult] = useState<MarketScreenSuccessResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [expandedWindowKey, setExpandedWindowKey] = useState<WindowKey>('hour');

  const filterEnabled = hasActiveFilters(filters);
  const activeFilterSummary = WINDOW_CONFIGS.flatMap(({ key, label }) => {
    const window = filters[key];
    const values = [
      window.door ? `门 ${window.door}` : null,
      window.star ? `星 ${window.star}` : null,
      window.god ? `神 ${window.god}` : null,
    ].filter(Boolean);

    if (values.length === 0) {
      return [];
    }

    return [`${label} · ${values.join(' / ')}`];
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    updateViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateViewport);

      return () => {
        mediaQuery.removeEventListener('change', updateViewport);
      };
    }

    mediaQuery.addListener(updateViewport);

    return () => {
      mediaQuery.removeListener(updateViewport);
    };
  }, []);

  function handleFieldChange(
    windowKey: WindowKey,
    field: WindowField,
    value: string,
  ) {
    setFilters((current) => ({
      ...current,
      [windowKey]: {
        ...current[windowKey],
        [field]: value,
      },
    }));
  }

  async function fetchScreening(
    nextPage: number,
    nextFilters: MarketScreenFilters,
  ) {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/market-screen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: normalizeFilters(nextFilters),
          page: nextPage,
          pageSize: 50,
        }),
      });

      let payload: MarketScreenApiResponse | null = null;

      try {
        payload = (await response.json()) as MarketScreenApiResponse;
      } catch {
        payload = null;
      }

      if (!payload || !response.ok || isApiErrorResponse(payload)) {
        setResult(null);
        setError(payload && isApiErrorResponse(payload) ? payload.error : createFallbackError());

        return;
      }

      setAppliedFilters(nextFilters);
      setError(null);
      setResult(payload);
    } catch {
      setResult(null);
      setError(createFallbackError());
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasActiveFilters(filters)) {
      setResult(null);
      setError({
        code: ERROR_CODES.MARKET_FILTER_REQUIRED,
        message: getErrorMessage(ERROR_CODES.MARKET_FILTER_REQUIRED),
      });
      return;
    }

    await fetchScreening(1, filters);
  }

  async function handlePageChange(nextPage: number) {
    if (!appliedFilters || isSubmitting) {
      return;
    }

    await fetchScreening(nextPage, appliedFilters);
  }

  async function handleLaunchClick(stockCode: string) {
    if (isLaunchingStock) {
      return;
    }

    await onLaunchStock(stockCode);
  }

  return (
    <section
      className="mystic-panel overflow-hidden px-5 py-5 sm:px-6 sm:py-6"
      data-testid="market-screen-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-5">
        <div className="max-w-3xl">
          <p className="mystic-section-label">三千用神筛盘</p>
          <h2 className="mt-2 text-[1.9rem] text-[var(--text-primary)] sm:text-[2.2rem]">
            辅助筛盘系统
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            这部分只做辅助筛选，不抢主盘视觉。先锁定时、日、月三干用神，再从命中结果里直接起局。
          </p>
        </div>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 xl:grid-cols-3">
          {WINDOW_CONFIGS.map(({ key, label }) => (
            <FilterCard
              expanded={expandedWindowKey === key}
              isMobile={isMobileViewport}
              key={key}
              label={label}
              onToggle={() => setExpandedWindowKey(key)}
            >
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                    {label} 门
                  </span>
                  <select
                    aria-label={`${label} 门`}
                    className="mystic-select w-full"
                    onChange={(event) => handleFieldChange(key, 'door', event.target.value)}
                    value={filters[key].door ?? ''}
                  >
                    <option value="">不限门象</option>
                    {QIMEN_DOOR_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                    {label} 星
                  </span>
                  <select
                    aria-label={`${label} 星`}
                    className="mystic-select w-full"
                    onChange={(event) => handleFieldChange(key, 'star', event.target.value)}
                    value={filters[key].star ?? ''}
                  >
                    <option value="">不限星曜</option>
                    {QIMEN_STAR_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                    {label} 神
                  </span>
                  <select
                    aria-label={`${label} 神`}
                    className="mystic-select w-full"
                    onChange={(event) => handleFieldChange(key, 'god', event.target.value)}
                    value={filters[key].god ?? ''}
                  >
                    <option value="">不限八神</option>
                    {QIMEN_GOD_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </FilterCard>
          ))}
        </div>

        <div className="rounded-[1.35rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <p className="text-[15px] leading-7 text-[var(--text-secondary)]">
                至少选择 1 个条件后再筛选。结果按股票代码升序返回，每页 50 条。
              </p>
              <div className="flex flex-wrap gap-2">
                {activeFilterSummary.length > 0 ? (
                  activeFilterSummary.map((item) => (
                    <span className="mystic-chip" key={item}>
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="mystic-chip">尚未选择筛选条件</span>
                )}
              </div>
            </div>
            <button
              className="mystic-button-secondary w-full xl:w-auto"
              disabled={!filterEnabled || isSubmitting}
              type="submit"
            >
              {isSubmitting ? '筛盘中...' : '开始筛盘'}
            </button>
          </div>
        </div>
      </form>

      {error ? (
        <div className="mt-5">
          <ErrorNotice error={error} title="筛盘异常" />
        </div>
      ) : null}

      {result ? (
        <section className="mt-5 rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] pb-4">
            <div>
              <p className="mystic-section-label">命中结果</p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                共筛得 {result.total} 只标的
              </h3>
            </div>
            <div className="mystic-chip">
              第 {result.page} / {Math.max(1, Math.ceil(result.total / result.pageSize))} 页
            </div>
          </div>

          {result.items.length > 0 ? (
            <>
              {isMobileViewport ? (
                <div className="mt-4 space-y-3" data-testid="market-screen-mobile-list">
                  {result.items.map((item) => {
                    const isLaunchingCurrentStock =
                      isLaunchingStock && launchingStockCode === item.stock.code;

                    return (
                      <article
                        className="rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-overlay)] px-4 py-4"
                        key={item.stock.code}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-[var(--text-primary)]">
                              {item.stock.name}
                            </p>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                              {item.stock.code} · {getMarketLabel(item.stock.market)}
                            </p>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                              上市日期 {item.stock.listingDate}
                            </p>
                          </div>
                          <button
                            className="mystic-button-secondary px-4 py-2 text-sm"
                            disabled={isLaunchingStock}
                            onClick={() => void handleLaunchClick(item.stock.code)}
                            type="button"
                          >
                            {isLaunchingCurrentStock ? '起局中...' : '直接起局'}
                          </button>
                        </div>
                        <div className="mt-4 space-y-3 border-t border-[var(--border-soft)] pt-3">
                          <div>
                            <p className="mystic-section-label">时干用神</p>
                            <div className="mt-2">
                              <WindowSummary item={item.hourWindow} />
                            </div>
                          </div>
                          <div>
                            <p className="mystic-section-label">日干用神</p>
                            <div className="mt-2">
                              <WindowSummary item={item.dayWindow} />
                            </div>
                          </div>
                          <div>
                            <p className="mystic-section-label">月干用神</p>
                            <div className="mt-2">
                              <WindowSummary item={item.monthWindow} />
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto" data-testid="market-screen-table">
                  <table className="w-full min-w-[1120px] border-separate border-spacing-y-2 text-left">
                    <thead>
                      <tr className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                        <th className="px-3 py-2">起局</th>
                        <th className="px-3 py-2">代码</th>
                        <th className="px-3 py-2">名称</th>
                        <th className="px-3 py-2">市场</th>
                        <th className="px-3 py-2">上市日期</th>
                        <th className="px-3 py-2">时干用神</th>
                        <th className="px-3 py-2">日干用神</th>
                        <th className="px-3 py-2">月干用神</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.items.map((item) => {
                        const isLaunchingCurrentStock =
                          isLaunchingStock && launchingStockCode === item.stock.code;

                        return (
                          <tr
                            className="rounded-[1.2rem] bg-[var(--surface-overlay)] text-[var(--text-primary)]"
                            key={item.stock.code}
                          >
                            <td className="rounded-l-[1.2rem] px-3 py-3">
                              <button
                                className="mystic-button-secondary px-4 py-2 text-sm"
                                disabled={isLaunchingStock}
                                onClick={() => void handleLaunchClick(item.stock.code)}
                                type="button"
                              >
                                {isLaunchingCurrentStock ? '起局中...' : '直接起局'}
                              </button>
                            </td>
                            <td className="px-3 py-3 text-base font-semibold">{item.stock.code}</td>
                            <td className="px-3 py-3 text-base font-semibold">{item.stock.name}</td>
                            <td className="px-3 py-3 text-sm text-[var(--text-secondary)]">
                              {getMarketLabel(item.stock.market)}
                            </td>
                            <td className="px-3 py-3 text-sm text-[var(--text-secondary)]">
                              {item.stock.listingDate}
                            </td>
                            <td className="px-3 py-3">
                              <WindowSummary item={item.hourWindow} />
                            </td>
                            <td className="px-3 py-3">
                              <WindowSummary item={item.dayWindow} />
                            </td>
                            <td className="rounded-r-[1.2rem] px-3 py-3">
                              <WindowSummary item={item.monthWindow} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {result.total > result.pageSize ? (
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button
                    className="mystic-chip disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={result.page <= 1 || isSubmitting}
                    onClick={() => void handlePageChange(result.page - 1)}
                    type="button"
                  >
                    上一页
                  </button>
                  <button
                    className="mystic-chip disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={
                      result.page >= Math.ceil(result.total / result.pageSize) ||
                      isSubmitting
                    }
                    onClick={() => void handlePageChange(result.page + 1)}
                    type="button"
                  >
                    下一页
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-4 rounded-[1.25rem] border border-dashed border-[var(--border-strong)] px-4 py-5 text-sm text-[var(--text-secondary)]">
              当前条件下暂无命中标的，可适当放宽星、门、神条件再试。
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}

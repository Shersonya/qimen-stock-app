'use client';

import { useEffect, useState } from 'react';

import { ErrorNotice } from '@/components/ErrorNotice';
import {
  ERROR_CODES,
  QIMEN_DOOR_OPTIONS,
  QIMEN_GOD_OPTIONS,
  QIMEN_STAR_OPTIONS,
  getErrorMessage,
  isApiErrorResponse,
  type ApiError,
  type Market,
  type MarketScreenApiResponse,
  type MarketScreenFilters,
  type MarketScreenResultItem,
  type MarketScreenSuccessResponse,
  type MarketScreenWindowFilter,
} from '@/lib/contracts/qimen';

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

type MarketScreenPanelProps = {
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

function getMarketLabel(market: Market) {
  switch (market) {
    case 'SH':
      return '沪市主板';
    case 'SZ':
      return '深市主板';
    case 'CYB':
      return '创业板';
    default:
      return market;
  }
}

function WindowSummary({
  item,
}: {
  item: MarketScreenResultItem['hourWindow'];
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-ink">
        {item.stem}干落{item.palaceName}宫
      </p>
      <p className="text-xs leading-5 text-ink/68">
        洛书 {item.position} · {item.door} / {item.star} / {item.god}
      </p>
    </div>
  );
}

export function MarketScreenPanel({
  isLaunchingStock,
  launchingStockCode,
  onLaunchStock,
}: MarketScreenPanelProps) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<MarketScreenFilters | null>(null);
  const [result, setResult] = useState<MarketScreenSuccessResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

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

    if (!filterEnabled) {
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
      className="mt-4 overflow-hidden rounded-[1.9rem] border border-gold/18 bg-[linear-gradient(180deg,rgba(31,18,14,0.98),rgba(76,44,29,0.95))] shadow-[inset_0_1px_0_rgba(252,233,203,0.1)]"
      data-testid="market-screen-panel"
    >
      <div className="border-b border-gold/14 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.38em] text-[#e0b56d]">
              全市场筛选
            </p>
            <h2 className="mt-2 font-serif text-[1.9rem] text-[#fff3df] sm:text-[2.2rem]">
              三干用神筛盘
            </h2>
          </div>
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="overflow-hidden rounded-[1.5rem] border border-gold/16 bg-[linear-gradient(180deg,rgba(16,10,9,0.86),rgba(41,25,19,0.82))] shadow-[inset_0_1px_0_rgba(252,233,203,0.08)]">
            <div className="hidden grid-cols-[130px_repeat(3,minmax(0,1fr))] gap-0 border-b border-gold/12 px-4 py-3 lg:grid">
              <div />
              {['门', '星', '神'].map((heading) => (
                <div
                  key={heading}
                  className="px-3 text-sm uppercase tracking-[0.24em] text-[#e4bb75]"
                >
                  {heading}
                </div>
              ))}
            </div>
            <div className="divide-y divide-gold/10">
              {WINDOW_CONFIGS.map(({ key, label }) => (
                <div
                  key={key}
                  className="grid gap-3 px-4 py-4 lg:grid-cols-[130px_repeat(3,minmax(0,1fr))] lg:items-center"
                >
                  <div className="pr-2">
                    <p className="font-serif text-[1.45rem] text-[#fff0d6]">{label}</p>
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-sm uppercase tracking-[0.24em] text-[#e4bb75] lg:sr-only">
                      {label} 门
                    </span>
                    <select
                      aria-label={`${label} 门`}
                      className="w-full rounded-[1rem] border border-gold/14 bg-[linear-gradient(180deg,rgba(250,241,223,0.98),rgba(234,216,180,0.9))] px-3 py-3 text-sm text-ink outline-none transition focus:border-vermilion focus:bg-white"
                      onChange={(event) =>
                        handleFieldChange(key, 'door', event.target.value)
                      }
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
                    <span className="mb-2 block text-sm uppercase tracking-[0.24em] text-[#e4bb75] lg:sr-only">
                      {label} 星
                    </span>
                    <select
                      aria-label={`${label} 星`}
                      className="w-full rounded-[1rem] border border-gold/14 bg-[linear-gradient(180deg,rgba(250,241,223,0.98),rgba(234,216,180,0.9))] px-3 py-3 text-sm text-ink outline-none transition focus:border-vermilion focus:bg-white"
                      onChange={(event) =>
                        handleFieldChange(key, 'star', event.target.value)
                      }
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
                    <span className="mb-2 block text-sm uppercase tracking-[0.24em] text-[#e4bb75] lg:sr-only">
                      {label} 神
                    </span>
                    <select
                      aria-label={`${label} 神`}
                      className="w-full rounded-[1rem] border border-gold/14 bg-[linear-gradient(180deg,rgba(250,241,223,0.98),rgba(234,216,180,0.9))] px-3 py-3 text-sm text-ink outline-none transition focus:border-vermilion focus:bg-white"
                      onChange={(event) =>
                        handleFieldChange(key, 'god', event.target.value)
                      }
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
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-[1.35rem] border border-gold/14 bg-[#1a110e]/72 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-[15px] leading-7 text-[#f0d8b0]/86">
                至少选择 1 个条件后再筛选。结果按股票代码升序返回，每页 50 条。
              </p>
              <div className="flex flex-wrap gap-2">
                {activeFilterSummary.length > 0 ? (
                  activeFilterSummary.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-gold/18 bg-[#fff2db]/10 px-3 py-1 text-sm text-[#f3ddb7]"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-dashed border-gold/18 px-3 py-1 text-sm text-[#eacb97]/82">
                    尚未选择筛选条件
                  </span>
                )}
              </div>
            </div>
            <button
              className="rounded-[1.15rem] border border-[#c18d3e] bg-[linear-gradient(135deg,#8d2d21,#5f1913)] px-5 py-3 text-sm font-semibold text-[#fff5e2] shadow-[0_16px_34px_rgba(19,10,8,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              disabled={!filterEnabled || isSubmitting}
              type="submit"
            >
              {isSubmitting ? '筛盘中...' : '开始筛盘'}
            </button>
          </div>
        </form>

        {error ? (
          <div className="mt-5">
            <ErrorNotice error={error} title="筛盘异常" />
          </div>
        ) : null}

        {result ? (
          <section className="mt-5 rounded-[1.55rem] border border-gold/16 bg-[linear-gradient(180deg,rgba(18,11,10,0.92),rgba(57,33,24,0.9))] p-3 shadow-[inset_0_1px_0_rgba(252,233,203,0.08)] sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/12 px-2 pb-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.34em] text-[#d8b067]">
                  命中结果
                </p>
                <h3 className="mt-1 font-serif text-2xl text-[#fff2dc]">
                  共筛得 {result.total} 只标的
                </h3>
              </div>
              <div className="rounded-full border border-gold/18 bg-[#fff3df]/8 px-4 py-2 text-xs tracking-[0.18em] text-[#f0d7ae]">
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
                          key={item.stock.code}
                          className="rounded-[1.3rem] border border-gold/16 bg-[linear-gradient(180deg,rgba(248,237,214,0.98),rgba(225,202,160,0.92))] p-4 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold">{item.stock.name}</p>
                              <p className="mt-1 text-sm text-ink/72">
                                {item.stock.code} · {getMarketLabel(item.stock.market)}
                              </p>
                              <p className="mt-1 text-sm text-ink/72">
                                上市日期 {item.stock.listingDate}
                              </p>
                            </div>
                            <button
                              className="rounded-[1rem] border border-[#c18d3e] bg-[linear-gradient(135deg,#8d2d21,#5f1913)] px-4 py-2 text-sm font-semibold text-[#fff5e2] shadow-[0_12px_28px_rgba(19,10,8,0.18)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                              disabled={isLaunchingStock}
                              onClick={() => void handleLaunchClick(item.stock.code)}
                              type="button"
                            >
                              {isLaunchingCurrentStock ? '起局中...' : '直接起局'}
                            </button>
                          </div>
                          <div className="mt-4 space-y-3 border-t border-gold/14 pt-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.28em] text-gold/90">
                                时干用神
                              </p>
                              <div className="mt-2">
                                <WindowSummary item={item.hourWindow} />
                              </div>
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.28em] text-gold/90">
                                日干用神
                              </p>
                              <div className="mt-2">
                                <WindowSummary item={item.dayWindow} />
                              </div>
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.28em] text-gold/90">
                                月干用神
                              </p>
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
                        <tr className="text-xs uppercase tracking-[0.22em] text-[#cfab6d]">
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
                              key={item.stock.code}
                              className="overflow-hidden rounded-[1.2rem] bg-[linear-gradient(180deg,rgba(248,237,214,0.98),rgba(225,202,160,0.92))] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                            >
                              <td className="rounded-l-[1.2rem] px-3 py-3">
                                <button
                                  className="rounded-[1rem] border border-[#c18d3e] bg-[linear-gradient(135deg,#8d2d21,#5f1913)] px-4 py-2 text-sm font-semibold text-[#fff5e2] shadow-[0_12px_28px_rgba(19,10,8,0.18)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                                  disabled={isLaunchingStock}
                                  onClick={() => void handleLaunchClick(item.stock.code)}
                                  type="button"
                                >
                                  {isLaunchingCurrentStock ? '起局中...' : '直接起局'}
                                </button>
                              </td>
                              <td className="px-3 py-3 text-base font-semibold">
                                {item.stock.code}
                              </td>
                              <td className="px-3 py-3 text-base font-semibold">
                                {item.stock.name}
                              </td>
                              <td className="px-3 py-3 text-sm text-ink/72">
                                {getMarketLabel(item.stock.market)}
                              </td>
                              <td className="px-3 py-3 text-sm text-ink/72">
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
              </>
            ) : (
              <div className="mt-4 rounded-[1.3rem] border border-dashed border-gold/20 bg-[#fff9ee]/6 px-4 py-5">
                <p className="font-serif text-2xl text-[#fff2dc]">暂无命中</p>
                <p className="mt-2 text-sm leading-6 text-[#ead4ae]/74">
                  当前条件下没有筛到符合三窗组合的标的，可以放宽门、星、神中的任一项后重试。
                </p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-end gap-3 px-1">
              <button
                className="rounded-full border border-gold/18 bg-[#fff2db]/8 px-4 py-2 text-sm text-[#f0d7ae] transition hover:border-gold/32 hover:bg-[#fff2db]/12 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={isSubmitting || result.page <= 1}
                onClick={() => void handlePageChange(result.page - 1)}
                type="button"
              >
                上一页
              </button>
              <button
                className="rounded-full border border-gold/18 bg-[#fff2db]/8 px-4 py-2 text-sm text-[#f0d7ae] transition hover:border-gold/32 hover:bg-[#fff2db]/12 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={
                  isSubmitting ||
                  result.page >= Math.max(1, Math.ceil(result.total / result.pageSize))
                }
                onClick={() => void handlePageChange(result.page + 1)}
                type="button"
              >
                下一页
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}

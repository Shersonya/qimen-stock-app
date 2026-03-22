'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ERROR_CODES,
  QIMEN_AUSPICIOUS_PATTERN_OPTIONS,
  QIMEN_DOOR_OPTIONS,
  QIMEN_GOD_OPTIONS,
  QIMEN_STAR_OPTIONS,
  getErrorMessage,
  isApiErrorResponse,
  type ApiError,
  type MarketScreenApiResponse,
  type MarketScreenFilters,
  type MarketScreenPatternFilter,
  type MarketScreenResultItem,
  type MarketScreenSuccessResponse,
  type MarketScreenWindowFilter,
} from '@/lib/contracts/qimen';
import {
  getDemoMarketScreenResponse,
  isDemoAutoplay,
  isDemoMode,
} from '@/lib/demo-fixtures';
import { MarketReportPanel } from '@/components/MarketReportPanel';
import { ErrorNotice } from '@/components/ErrorNotice';
import { getMarketLabel } from '@/lib/ui';

const INITIAL_FILTERS: MarketScreenFilters = {
  hour: { door: '', star: '', god: '' },
  day: { door: '', star: '', god: '' },
  month: { door: '', star: '', god: '' },
  pattern: {
    names: [],
    minScore: undefined,
    bullishOnly: false,
    hourOnly: false,
    palacePositions: [],
  },
};

function getInitialFilters(): MarketScreenFilters {
  if (typeof window === 'undefined' || !isDemoAutoplay()) {
    return INITIAL_FILTERS;
  }

  return {
    ...INITIAL_FILTERS,
    hour: {
      ...INITIAL_FILTERS.hour,
      door: '开门',
    },
  };
}

const WINDOW_CONFIGS = [
  { key: 'hour', label: '时干用神' },
  { key: 'day', label: '日干用神' },
  { key: 'month', label: '月干用神' },
] as const;

type WindowKey = (typeof WINDOW_CONFIGS)[number]['key'];
type ExpandableCardKey = WindowKey | 'pattern';
type WindowField = keyof MarketScreenWindowFilter;
type PatternField = keyof MarketScreenPatternFilter;

export type BoardFilterPreset = {
  key: number;
  patternNames?: string[];
  palacePositions?: number[];
  sourceLabel: string;
};

type FilterPanelProps = {
  isLaunchingStock: boolean;
  launchingStockCode: string | null;
  onLaunchStock: (stockCode: string) => Promise<void>;
  boardFilterPreset?: BoardFilterPreset | null;
};

function createFallbackError(): ApiError {
  return {
    code: ERROR_CODES.API_ERROR,
    message: getErrorMessage(ERROR_CODES.API_ERROR),
  };
}

function normalizePatternFilter(
  pattern: MarketScreenPatternFilter | undefined,
): MarketScreenPatternFilter | undefined {
  if (!pattern) {
    return undefined;
  }

  const names = pattern.names?.map((name) => name.trim()).filter(Boolean);
  const palacePositions = pattern.palacePositions
    ?.map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 9);

  return {
    names: names && names.length > 0 ? Array.from(new Set(names)) : undefined,
    minScore:
      Number.isFinite(pattern.minScore) && Number(pattern.minScore) > 0
        ? Number(pattern.minScore)
        : undefined,
    bullishOnly: pattern.bullishOnly ? true : undefined,
    hourOnly: pattern.hourOnly ? true : undefined,
    palacePositions:
      palacePositions && palacePositions.length > 0
        ? Array.from(new Set(palacePositions))
        : undefined,
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
    pattern: normalizePatternFilter(filters.pattern),
  };
}

function hasPatternFilters(pattern: MarketScreenPatternFilter | undefined) {
  return Boolean(
    pattern &&
      ((pattern.names && pattern.names.length > 0) ||
        pattern.minScore ||
        pattern.bullishOnly ||
        pattern.hourOnly ||
        (pattern.palacePositions && pattern.palacePositions.length > 0)),
  );
}

function hasActiveFilters(filters: MarketScreenFilters): boolean {
  const hasWindowFilters = WINDOW_CONFIGS.some(({ key }) => {
    const window = filters[key];

    return Boolean(window.door || window.star || window.god);
  });

  return hasWindowFilters || hasPatternFilters(filters.pattern);
}

export function applyBoardFilterPreset(
  filters: MarketScreenFilters,
  boardFilterPreset: BoardFilterPreset,
): MarketScreenFilters {
  return {
    ...filters,
    pattern: {
      ...filters.pattern,
      names: boardFilterPreset.patternNames
        ? [...boardFilterPreset.patternNames]
        : filters.pattern?.names ?? [],
      palacePositions: boardFilterPreset.palacePositions
        ? [...boardFilterPreset.palacePositions]
        : filters.pattern?.palacePositions ?? [],
    },
  };
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
  boardFilterPreset,
}: FilterPanelProps) {
  const [filters, setFilters] = useState(getInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState<MarketScreenFilters | null>(null);
  const [presetLabel, setPresetLabel] = useState<string | null>(null);
  const [result, setResult] = useState<MarketScreenSuccessResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [expandedWindowKey, setExpandedWindowKey] = useState<ExpandableCardKey>('hour');
  const filtersRef = useRef(filters);
  const appliedPresetKeyRef = useRef<number | null>(null);
  const demoAutoplayRef = useRef(false);

  const filterEnabled = hasActiveFilters(filters);
  const activeFilterSummary = [
    ...WINDOW_CONFIGS.flatMap(({ key, label }) => {
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
    }),
    ...(filters.pattern?.names && filters.pattern.names.length > 0
      ? [`吉格 · ${filters.pattern.names.join('、')}`]
      : []),
    ...(filters.pattern?.palacePositions && filters.pattern.palacePositions.length > 0
      ? [`宫位 · ${filters.pattern.palacePositions.join('、')}宫`]
      : []),
    ...(filters.pattern?.minScore ? [`最低分 · ${filters.pattern.minScore}`] : []),
    ...(filters.pattern?.bullishOnly ? ['仅看多'] : []),
    ...(filters.pattern?.hourOnly ? ['仅匹配时干宫'] : []),
    ...(presetLabel ? [`联动来源 · ${presetLabel}`] : []),
  ];

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

  const fetchScreening = useCallback(async (
    nextPage: number,
    nextFilters: MarketScreenFilters,
  ) => {
    setIsSubmitting(true);

    try {
      let payload: MarketScreenApiResponse | null = null;
      let ok = true;

      if (isDemoMode()) {
        payload = getDemoMarketScreenResponse();
      } else {
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

        ok = response.ok;

        try {
          payload = (await response.json()) as MarketScreenApiResponse;
        } catch {
          payload = null;
        }
      }

      if (!payload || !ok || isApiErrorResponse(payload)) {
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
  }, []);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    if (
      !boardFilterPreset ||
      appliedPresetKeyRef.current === boardFilterPreset.key
    ) {
      return;
    }
    // 只对同一个 preset key 应用一次，避免 setFilters 触发的 rerender
    // 再次进入这个 effect 时重复写回，形成联动更新回环。
    appliedPresetKeyRef.current = boardFilterPreset.key;

    const nextFilters = applyBoardFilterPreset(
      filtersRef.current,
      boardFilterPreset,
    );

    setPresetLabel(boardFilterPreset.sourceLabel);
    setFilters(nextFilters);
    void fetchScreening(1, nextFilters);
  }, [boardFilterPreset, fetchScreening]);

  useEffect(() => {
    if (demoAutoplayRef.current || !isDemoAutoplay()) {
      return;
    }

    demoAutoplayRef.current = true;
    void fetchScreening(1, getInitialFilters());
  }, [fetchScreening]);

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

  function handlePatternFieldChange(
    field: PatternField,
    value: string | boolean | number[] | number | undefined,
  ) {
    setFilters((current) => ({
      ...current,
      pattern: {
        ...current.pattern,
        [field]: value,
      },
    }));
  }

  function togglePatternName(name: string) {
    setFilters((current) => {
      const nextNames = current.pattern?.names ?? [];

      return {
        ...current,
        pattern: {
          ...current.pattern,
          names: nextNames.includes(name)
            ? nextNames.filter((item) => item !== name)
            : [...nextNames, name],
        },
      };
    });
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
            现在支持时、日、月三干与吉格联合筛选，也可以从上方盘面点击吉格或框选宫位后自动联动筛全市场。
          </p>
        </div>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 xl:grid-cols-4">
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
          <FilterCard
            expanded={expandedWindowKey === 'pattern'}
            isMobile={isMobileViewport}
            label="吉格筛选"
            onToggle={() => setExpandedWindowKey('pattern')}
          >
            <div className="space-y-4">
              <div>
                <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                  吉格条件
                </span>
                <div className="flex flex-wrap gap-2">
                  {QIMEN_AUSPICIOUS_PATTERN_OPTIONS.map((name) => {
                    const active = filters.pattern?.names?.includes(name);

                    return (
                      <button
                        aria-pressed={active}
                        className={`rounded-full border px-3 py-2 text-sm transition ${
                          active
                            ? 'border-[var(--accent-strong)] bg-[var(--surface-raised)] text-[var(--text-primary)]'
                            : 'border-[var(--border-soft)] bg-[var(--surface-overlay)] text-[var(--text-secondary)] hover:border-[var(--accent-soft)] hover:text-[var(--text-primary)]'
                        }`}
                        key={name}
                        onClick={() => togglePatternName(name)}
                        type="button"
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                  最低分
                </span>
                <input
                  aria-label="最低分"
                  className="mystic-input"
                  inputMode="numeric"
                  min={0}
                  onChange={(event) =>
                    handlePatternFieldChange(
                      'minScore',
                      event.target.value ? Number(event.target.value) : undefined,
                    )
                  }
                  placeholder="例如 20"
                  type="number"
                  value={filters.pattern?.minScore ?? ''}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    checked={filters.pattern?.bullishOnly ?? false}
                    onChange={(event) =>
                      handlePatternFieldChange('bullishOnly', event.target.checked)
                    }
                    type="checkbox"
                  />
                  仅看多
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    checked={filters.pattern?.hourOnly ?? false}
                    onChange={(event) =>
                      handlePatternFieldChange('hourOnly', event.target.checked)
                    }
                    type="checkbox"
                  />
                  仅匹配时干宫
                </label>
              </div>
              <div>
                <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                  联动宫位
                </span>
                <div className="flex flex-wrap gap-2">
                  {filters.pattern?.palacePositions && filters.pattern.palacePositions.length > 0 ? (
                    filters.pattern.palacePositions.map((position) => (
                      <span className="mystic-chip" key={position}>
                        {position}宫
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[var(--text-muted)]">
                      可从上方九宫盘框选后自动写入。
                    </span>
                  )}
                </div>
              </div>
            </div>
          </FilterCard>
        </div>

        <div className="rounded-[1.35rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <p className="text-[15px] leading-7 text-[var(--text-secondary)]">
                至少选择 1 个条件后再筛选。结果优先按吉格总分、复合格数量和 A/B 级动力排序。
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
        <>
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
                    {result.items.map((item, index) => {
                      const isLaunchingCurrentStock =
                        isLaunchingStock && launchingStockCode === item.stock.code;

                      return (
                        <article
                          className="rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-overlay)] px-4 py-4"
                          key={item.stock.code}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm text-[var(--text-muted)]">#{index + 1}</p>
                              <p className="text-lg font-semibold text-[var(--text-primary)]">
                                {item.stock.name}
                              </p>
                              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                {item.stock.code} · {getMarketLabel(item.stock.market)}
                                {item.stock.sector ? ` · ${item.stock.sector}` : ''}
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
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="mystic-chip">
                              {item.patternSummary?.rating ?? 'C'}级 · {item.patternSummary?.totalScore ?? 0} 分
                            </span>
                            <span className="mystic-chip">
                              预测 {item.patternSummary?.predictedDirection ?? '观望'}
                            </span>
                            {item.patternSummary?.matchedPatternNames.slice(0, 2).map((name) => (
                              <span className="mystic-chip" key={`${item.stock.code}-${name}`}>
                                {name}
                              </span>
                            ))}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                            {item.patternSummary?.summary ?? '当前暂无吉格摘要。'}
                          </p>
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
                    <table className="w-full min-w-[1480px] border-separate border-spacing-y-2 text-left">
                      <thead>
                        <tr className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                          <th className="px-3 py-2">排名</th>
                          <th className="px-3 py-2">起局</th>
                          <th className="px-3 py-2">代码</th>
                          <th className="px-3 py-2">名称</th>
                          <th className="px-3 py-2">市场/板块</th>
                          <th className="px-3 py-2">吉格评分</th>
                          <th className="px-3 py-2">预测</th>
                          <th className="px-3 py-2">核心吉格</th>
                          <th className="px-3 py-2">时干用神</th>
                          <th className="px-3 py-2">日干用神</th>
                          <th className="px-3 py-2">月干用神</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.items.map((item, index) => {
                          const isLaunchingCurrentStock =
                            isLaunchingStock && launchingStockCode === item.stock.code;

                          return (
                            <tr
                              className="rounded-[1.2rem] bg-[var(--surface-overlay)] text-[var(--text-primary)]"
                              key={item.stock.code}
                            >
                              <td className="rounded-l-[1.2rem] px-3 py-3 text-base font-semibold">
                                {index + 1}
                              </td>
                              <td className="px-3 py-3">
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
                                {item.stock.sector ? ` / ${item.stock.sector}` : ''}
                              </td>
                              <td className="px-3 py-3">
                                <div className="space-y-1">
                                  <p className="text-base font-semibold text-[var(--text-primary)]">
                                    {item.patternSummary?.rating ?? 'C'}级 · {item.patternSummary?.totalScore ?? 0} 分
                                  </p>
                                  <p className="text-xs text-[var(--text-secondary)]">
                                    {item.patternSummary?.energyLabel ?? '未识别'}
                                  </p>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm text-[var(--text-secondary)]">
                                {item.patternSummary?.predictedDirection ?? '观望'}
                              </td>
                              <td className="px-3 py-3 text-sm text-[var(--text-secondary)]">
                                {item.patternSummary?.corePatternsLabel || item.patternSummary?.matchedPatternNames.join('、') || '--'}
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

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border-soft)] pt-4">
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
                      result.page >= Math.max(1, Math.ceil(result.total / result.pageSize)) ||
                      isSubmitting
                    }
                    onClick={() => void handlePageChange(result.page + 1)}
                    type="button"
                  >
                    下一页
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-[1.2rem] border border-dashed border-[var(--border-soft)] px-4 py-5 text-sm text-[var(--text-secondary)]">
                当前条件未筛出标的，可以放宽吉格或窗口限制后再试。
              </div>
            )}
          </section>

          <MarketReportPanel filters={appliedFilters} items={result.items} />
        </>
      ) : null}
    </section>
  );
}

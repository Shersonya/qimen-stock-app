'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EstimatedProgressNotice } from '@/components/EstimatedProgressNotice';
import { ErrorNotice } from '@/components/ErrorNotice';
import { MarketReportPanel } from '@/components/MarketReportPanel';
import { MobilePalaceExplorer } from '@/components/MobilePalaceExplorer';
import { PalaceCard } from '@/components/PalaceCard';
import { useWorkspaceSettings } from '@/components/providers/WorkspaceSettingsProvider';
import { requestMarketDashboard, requestMarketScreen, requestQimenAnalysis } from '@/lib/client-api';
import { useToast } from '@/lib/hooks/use-toast';
import type {
  ApiError,
  MarketScreenFilters,
  MarketScreenSuccessResponse,
  QimenAuspiciousPatternName,
  QimenApiSuccessResponse,
} from '@/lib/contracts/qimen';
import { QIMEN_PATTERN_LIBRARY } from '@/lib/contracts/qimen';
import { getMarketLabel } from '@/lib/ui';
import { toApiError } from '@/lib/utils/api-error';

type PreviewState = {
  stockCode: string;
  patternName: string;
  palacePosition?: number;
};

type PageProps = {
  autostart?: boolean;
};

const ROW_HEIGHT = 108;
const VIEWPORT_HEIGHT = 540;
const MOBILE_VIEWPORT_QUERY = '(max-width: 767px)';

export function ScreenPageClient({ autostart = false }: PageProps) {
  const {
    patternConfigOverride,
    riskConfigOverride,
    settings,
    setSettings,
  } = useWorkspaceSettings();
  const [selectedPatternNames, setSelectedPatternNames] = useState<QimenAuspiciousPatternName[]>(
    autostart
      ? QIMEN_PATTERN_LIBRARY.filter((item) => settings.patternMap[item.name].enabled).map(
          (item) => item.name,
        )
      : [],
  );
  const [minScore, setMinScore] = useState<number | undefined>(undefined);
  const [minRating, setMinRating] = useState<'ALL' | 'S' | 'A' | 'B' | 'C'>(
    settings.risk.minRatingDefault,
  );
  const [bullishOnly, setBullishOnly] = useState(false);
  const [onlyEligible, setOnlyEligible] = useState(settings.risk.onlyEligibleDefault);
  const [marketEnvironmentRequired, setMarketEnvironmentRequired] = useState(
    settings.risk.marketEnvironmentRequired,
  );
  const [excludeInvalidCorePalaces, setExcludeInvalidCorePalaces] = useState(
    settings.risk.excludeInvalidCorePalaces,
  );
  const [excludeTopEvilPatterns, setExcludeTopEvilPatterns] = useState(
    settings.risk.excludeTopEvilPatterns,
  );
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [result, setResult] = useState<MarketScreenSuccessResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useToast();
  const [pageSize, setPageSize] = useState(50);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewPayload, setPreviewPayload] = useState<QimenApiSuccessResponse | null>(null);
  const [previewError, setPreviewError] = useState<ApiError | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [marketDashboardState, setMarketDashboardState] = useState<Awaited<
    ReturnType<typeof requestMarketDashboard>
  > | null>(null);
  const [isAdvancedDrawerOpen, setIsAdvancedDrawerOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [virtualStart, setVirtualStart] = useState(0);
  const previewCacheRef = useRef<Record<string, QimenApiSuccessResponse>>({});

  const groupedPatterns = useMemo(() => {
    return {
      COMPOSITE: QIMEN_PATTERN_LIBRARY.filter(
        (item) => settings.patternMap[item.name].level === 'COMPOSITE',
      ),
      A: QIMEN_PATTERN_LIBRARY.filter(
        (item) => settings.patternMap[item.name].level === 'A',
      ),
      B: QIMEN_PATTERN_LIBRARY.filter(
        (item) => settings.patternMap[item.name].level === 'B',
      ),
      C: QIMEN_PATTERN_LIBRARY.filter(
        (item) => settings.patternMap[item.name].level === 'C',
      ),
    };
  }, [settings.patternMap]);

  const apiFilters = useMemo<MarketScreenFilters>(() => {
    return {
      hour: {},
      day: {},
      month: {},
      pattern: {
        names: selectedPatternNames,
        minScore,
        bullishOnly,
      },
    };
  }, [bullishOnly, minScore, selectedPatternNames]);

  const visibleItems = useMemo(() => {
    if (!result) {
      return [];
    }

    if (pageSize <= 50) {
      return result.items.map((item, index) => ({
        item,
        index,
      }));
    }

    const overscan = 4;
    const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + overscan * 2;
    const startIndex = Math.max(0, virtualStart - overscan);
    const endIndex = Math.min(result.items.length, startIndex + visibleCount);

    return result.items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
    }));
  }, [pageSize, result, virtualStart]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const dashboard = await requestMarketDashboard({
          patternConfigOverride,
          riskConfigOverride,
        });

        if (!cancelled) {
          setMarketDashboardState(dashboard);
        }
      } catch {
        if (!cancelled) {
          setMarketDashboardState(null);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [patternConfigOverride, riskConfigOverride]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_VIEWPORT_QUERY);
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

  function updatePatternSetting(
    name: (typeof QIMEN_PATTERN_LIBRARY)[number]['name'],
    patch: Partial<(typeof settings.patternMap)[typeof name]>,
  ) {
    setSettings({
      ...settings,
      patternMap: {
        ...settings.patternMap,
        [name]: {
          ...settings.patternMap[name],
          ...patch,
        },
      },
    });
  }

  function togglePatternName(name: QimenAuspiciousPatternName) {
    setSelectedPatternNames((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  }

  function toggleGroup(level: keyof typeof groupedPatterns) {
    const names = groupedPatterns[level].map((item) => item.name);
    const allSelected = names.every((name) => selectedPatternNames.includes(name));

    setSelectedPatternNames((current) => {
      if (allSelected) {
        return current.filter((name) => !names.includes(name));
      }

      return Array.from(new Set([...current, ...names]));
    });
  }

  const handleSearch = useCallback(async (nextPage: number) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = await requestMarketScreen({
        filters: apiFilters,
        marketSignal: marketEnvironmentRequired
          ? {
              hasBAboveGE: marketDashboardState?.marketSignal.hasBAboveGE ?? true,
            }
          : undefined,
        minRating,
        onlyEligible,
        page: nextPage,
        pageSize,
        patternConfigOverride,
        riskConfigOverride: {
          ...riskConfigOverride,
          excludeInvalidCorePalaces,
          excludeTopEvilPatterns,
        },
      });

      setResult(payload);
      setToastMessage(`扫描完成，共命中 ${payload.total} 只标的。`);
      setSelectedRows([]);
    } catch (nextError) {
      setResult(null);
      setError(toApiError(nextError, 'API_ERROR', '筛选失败，请稍后重试。'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    apiFilters,
    excludeInvalidCorePalaces,
    excludeTopEvilPatterns,
    marketDashboardState?.marketSignal.hasBAboveGE,
    marketEnvironmentRequired,
    minRating,
    onlyEligible,
    pageSize,
    patternConfigOverride,
    riskConfigOverride,
    setToastMessage,
  ]);

  useEffect(() => {
    if (!autostart) {
      return;
    }

    void handleSearch(1);
  }, [autostart, handleSearch]);

  async function handleOpenPreview(state: PreviewState) {
    setPreview(state);
    setPreviewError(null);

    if (previewCacheRef.current[state.stockCode]) {
      setPreviewPayload(previewCacheRef.current[state.stockCode] ?? null);
      return;
    }

    setIsPreviewLoading(true);

    try {
      const payload = await requestQimenAnalysis({
        stockCode: state.stockCode,
        patternConfigOverride,
      });

      previewCacheRef.current[state.stockCode] = payload;
      setPreviewPayload(payload);
    } catch (nextError) {
      setPreviewPayload(null);
      setPreviewError(toApiError(nextError, 'API_ERROR', '排盘预览失败，请稍后重试。'));
    } finally {
      setIsPreviewLoading(false);
    }
  }

  const previewSelectedPalaceIndex = useMemo(() => {
    const previewPalaces = previewPayload?.qimen.palaces ?? [];

    if (!preview || previewPalaces.length === 0) {
      return null;
    }

    return previewPalaces.find((palace) => palace.position === preview.palacePosition)?.index ?? null;
  }, [preview, previewPayload]);

  const filterPanel = (
    <aside
      className={`workbench-card ${isMobileViewport ? '' : 'workbench-sticky-panel'}`}
      data-testid="screen-filter-panel"
    >
      <div className="space-y-6">
        <section>
          <p className="mystic-section-label">第一层</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
            市场环境
          </h3>
          <label className="mt-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              checked={marketEnvironmentRequired}
              onChange={(event) => setMarketEnvironmentRequired(event.target.checked)}
              type="checkbox"
            />
            仅在市场存在 B 级以上吉气时执行
          </label>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            当前状态:
            {' '}
            {marketDashboardState?.marketSignal.statusLabel ?? '读取中...'}
          </p>
        </section>

        <section>
          <p className="mystic-section-label">第二层</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
            资金规则
          </h3>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                最低分
              </span>
              <input
                className="mystic-input"
                inputMode="numeric"
                onChange={(event) =>
                  setMinScore(event.target.value ? Number(event.target.value) : undefined)
                }
                placeholder="例如 20"
                type="number"
                value={minScore ?? ''}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                最低评级
              </span>
              <select
                className="mystic-select w-full"
                onChange={(event) =>
                  setMinRating(event.target.value as 'ALL' | 'S' | 'A' | 'B' | 'C')
                }
                value={minRating}
              >
                <option value="ALL">不限</option>
                <option value="S">S</option>
                <option value="A">A 及以上</option>
                <option value="B">B 及以上</option>
                <option value="C">C 及以上</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                checked={bullishOnly}
                onChange={(event) => setBullishOnly(event.target.checked)}
                type="checkbox"
              />
              仅看多信号
            </label>
          </div>
        </section>

        <section>
          <p className="mystic-section-label">第三层</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
            风控规则
          </h3>
          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                checked={onlyEligible}
                onChange={(event) => setOnlyEligible(event.target.checked)}
                type="checkbox"
              />
              仅保留可执行标的
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                checked={excludeInvalidCorePalaces}
                onChange={(event) => setExcludeInvalidCorePalaces(event.target.checked)}
                type="checkbox"
              />
              剔除失效核心宫
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                checked={excludeTopEvilPatterns}
                onChange={(event) => setExcludeTopEvilPatterns(event.target.checked)}
                type="checkbox"
              />
              剔除顶级凶格
            </label>
          </div>
        </section>

        <section>
          <p className="mystic-section-label">第四层</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
            吉格选择器
          </h3>
          <div className="mt-4 space-y-4">
            {(['COMPOSITE', 'A', 'B', 'C'] as const).map((level) => (
              <div key={level}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <strong className="text-sm text-[var(--text-primary)]">{level} 组</strong>
                  <button
                    className="mystic-chip"
                    onClick={() => toggleGroup(level)}
                    type="button"
                  >
                    全选 / 反选
                  </button>
                </div>
                <div className="space-y-2">
                  {groupedPatterns[level].map((item) => (
                    <label className="workbench-pattern-checkbox" key={item.name}>
                      <span className="flex items-center gap-2">
                        <input
                          checked={selectedPatternNames.includes(item.name)}
                          onChange={() => togglePatternName(item.name)}
                          type="checkbox"
                        />
                        <span>{item.name}</span>
                      </span>
                      <span className="text-[var(--text-muted)]">
                        [{settings.patternMap[item.name].weight}]
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );

  const feedbackSection = (
    <section className="workbench-card" data-testid="screen-feedback-panel">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mystic-section-label">扫描反馈</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            这里会显示预计等待时间、已等待时长和异常状态，帮助用户判断这次全量筛选还要多久。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="mystic-chip">预计 6-12 秒</span>
          <label className="text-sm text-[var(--text-secondary)]">
            每页
            {' '}
            <select
              className="mystic-select ml-2"
              onChange={(event) => setPageSize(Number(event.target.value))}
              value={pageSize}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </label>
        </div>
      </div>

      {isSubmitting ? (
        <EstimatedProgressNotice
          className="mt-4"
          description="正在执行四层滤网全量筛选，结果会在服务端完成本页计算后一次性返回。"
          expectedDurationMs={9000}
          expectedRangeLabel="6-12 秒"
          testId="screen-progress"
          title="全市场筛选进行中"
        />
      ) : null}

      {!isSubmitting && !result && !error ? (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          点击“执行筛选”后，这里会显示预计进度和等待时长。
        </p>
      ) : null}

      {error ? (
        <div className="mt-4">
          <ErrorNotice error={error} title="筛选异常" />
        </div>
      ) : null}
    </section>
  );

  const resultsSection = result ? (
    <>
      <section className="workbench-card" data-testid={isMobileViewport ? 'screen-result-mobile-list' : 'screen-result-table'}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mystic-section-label">结果区</p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              共筛得 {result.total} 只标的
            </h3>
          </div>
          <div className="mystic-chip">
            第 {result.page} / {Math.max(1, Math.ceil(result.total / result.pageSize))} 页
          </div>
        </div>

        {result.meta?.notice ? (
          <div className="mt-4 rounded-2xl border border-[rgba(216,179,90,0.35)] bg-[rgba(216,179,90,0.12)] p-4 text-sm text-[var(--text-primary)]">
            {result.meta.notice}
          </div>
        ) : null}

        {isMobileViewport ? (
          <div className="mt-5 space-y-3">
            {result.items.map((item, index) => {
              const primaryMatch = item.patternSummary?.matches[0];

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
                    <input
                      checked={selectedRows.includes(item.stock.code)}
                      onChange={(event) =>
                        setSelectedRows((current) =>
                          event.target.checked
                            ? [...current, item.stock.code]
                            : current.filter((code) => code !== item.stock.code),
                        )
                      }
                      type="checkbox"
                    />
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
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="workbench-link-button"
                      onClick={() =>
                        void handleOpenPreview({
                          stockCode: item.stock.code,
                          patternName:
                            primaryMatch?.name ?? item.patternSummary?.corePatternsLabel ?? '未识别',
                          palacePosition: primaryMatch?.palaceId,
                        })
                      }
                      title={
                        primaryMatch?.meaning ?? item.patternSummary?.summary ?? '当前暂无说明'
                      }
                      type="button"
                    >
                      {item.patternSummary?.corePatternsLabel || '--'}
                    </button>
                    <Link
                      className="mystic-button-secondary"
                      href={`/diagnosis/${item.stock.code}`}
                      target="_blank"
                    >
                      深度诊断
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="workbench-table mt-5" role="table">
            <div className="workbench-table-header" role="rowgroup">
              <div className="workbench-table-row is-header" role="row">
                <div>选择</div>
                <div>代码 / 名称</div>
                <div>吉格总分</div>
                <div>评级</div>
                <div>核心吉格</div>
                <div>操作</div>
              </div>
            </div>
            <div
              className="workbench-table-body"
              onScroll={(event) => {
                if (pageSize <= 50) {
                  return;
                }

                setVirtualStart(
                  Math.floor(event.currentTarget.scrollTop / ROW_HEIGHT),
                );
              }}
              role="rowgroup"
              style={{
                height: pageSize > 50 ? VIEWPORT_HEIGHT : 'auto',
              }}
            >
              <div
                style={{
                  height:
                    pageSize > 50 ? result.items.length * ROW_HEIGHT : 'auto',
                  position: 'relative',
                }}
              >
                {visibleItems.map(({ item, index }) => {
                  const primaryMatch = item.patternSummary?.matches[0];

                  return (
                    <div
                      className="workbench-table-row"
                      key={item.stock.code}
                      role="row"
                      style={{
                        background:
                          settings.visual.ratingColors[item.patternSummary?.rating ?? 'C'],
                        position: pageSize > 50 ? 'absolute' : 'relative',
                        top: pageSize > 50 ? index * ROW_HEIGHT : 'auto',
                        left: 0,
                        right: 0,
                        minHeight: ROW_HEIGHT - 8,
                      }}
                    >
                      <div>
                        <input
                          checked={selectedRows.includes(item.stock.code)}
                          onChange={(event) =>
                            setSelectedRows((current) =>
                              event.target.checked
                                ? [...current, item.stock.code]
                                : current.filter((code) => code !== item.stock.code),
                            )
                          }
                          type="checkbox"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">
                          {item.stock.code} / {item.stock.name}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {item.stock.sector || item.stock.market}
                        </p>
                      </div>
                      <div className="font-semibold text-[var(--text-primary)]">
                        {item.patternSummary?.totalScore ?? 0}
                      </div>
                      <div>
                        <span className="mystic-chip">{item.patternSummary?.rating ?? 'C'}</span>
                      </div>
                      <div>
                        <button
                          className="workbench-link-button"
                          onClick={() =>
                            void handleOpenPreview({
                              stockCode: item.stock.code,
                              patternName:
                                primaryMatch?.name ??
                                item.patternSummary?.corePatternsLabel ??
                                '未识别',
                              palacePosition: primaryMatch?.palaceId,
                            })
                          }
                          title={
                            primaryMatch?.meaning ?? item.patternSummary?.summary ?? '当前暂无说明'
                          }
                          type="button"
                        >
                          {item.patternSummary?.corePatternsLabel || '--'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          className="mystic-button-secondary"
                          href={`/diagnosis/${item.stock.code}`}
                          target="_blank"
                        >
                          深度诊断
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            className="mystic-chip"
            disabled={result.page <= 1 || isSubmitting}
            onClick={() => void handleSearch(result.page - 1)}
            type="button"
          >
            上一页
          </button>
          <button
            className="mystic-chip"
            disabled={
              result.page >= Math.max(1, Math.ceil(result.total / result.pageSize)) ||
              isSubmitting
            }
            onClick={() => void handleSearch(result.page + 1)}
            type="button"
          >
            下一页
          </button>
        </div>
      </section>
    </>
  ) : null;

  const reportSection = result ? (
    <details className="workbench-card">
      <summary className="workbench-details-summary">策略验证</summary>
      <div className="mt-5">
        <MarketReportPanel filters={apiFilters} items={result.items} />
      </div>
    </details>
  ) : null;

  return (
    <section className="workbench-page">
      <header className="workbench-page-header">
        <div>
          <p className="mystic-section-label">吉格筛选</p>
          <h2>四层滤网控制台</h2>
          <p>先判断市场环境，再叠加资金和风控规则，最后用吉格等级与权重控制筛选结果的质量和可执行性。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="mystic-button-secondary"
            onClick={() => setIsAdvancedDrawerOpen(true)}
            type="button"
          >
            高级权重设置
          </button>
          <button
            className="mystic-button-primary"
            data-hotkey-primary="true"
            onClick={() => void handleSearch(1)}
            type="button"
          >
            {isSubmitting ? '扫描中...' : '执行筛选'}
          </button>
        </div>
      </header>

      {isMobileViewport ? (
        <div className="mt-6 space-y-6">
          {feedbackSection}
          {resultsSection}
          {reportSection}
          {filterPanel}
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          {filterPanel}
          <div className="space-y-6">
            {feedbackSection}
            {resultsSection}
            {reportSection}
          </div>
        </div>
      )}

      {preview ? (
        <div className="workbench-overlay workbench-side-overlay">
          <aside className="workbench-drawer" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mystic-section-label">看图筛选</p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  {preview.patternName}
                </h3>
              </div>
              <button
                className="mystic-chip"
                data-hotkey-dismiss="true"
                onClick={() => setPreview(null)}
                type="button"
              >
                关闭
              </button>
            </div>

            {previewError ? (
              <div className="mt-5">
                <ErrorNotice error={previewError} title="排盘预览失败" />
              </div>
            ) : null}

            {isPreviewLoading ? (
              <EstimatedProgressNotice
                className="mt-5"
                description="正在生成该股的奇门盘与宫位注释，预览会在分析完成后自动展开。"
                expectedDurationMs={2500}
                expectedRangeLabel="1-3 秒"
                testId="screen-preview-progress"
                title="奇门盘预览加载中"
              />
            ) : null}

            {previewPayload ? (
              <div className="mt-5 space-y-5">
                <MobilePalaceExplorer
                  className="sm:hidden"
                  detailCardTestId="screen-preview-mobile-detail-card"
                  detailStatus={isPreviewLoading ? 'loading' : 'ready'}
                  detailTestId="screen-preview-mobile-detail"
                  getAnnotation={(palace) =>
                    previewPayload.patternAnalysis.palaceAnnotations.find(
                      (item) => item.palacePosition === palace.position,
                    )
                  }
                  layoutTestId="screen-preview-mobile-layout"
                  onOverviewPointerLeave={() => {}}
                  onOverviewPointerUp={() => {}}
                  onSelectPalace={(palaceIndex) => {
                    const selectedPalace = previewPayload.qimen.palaces.find(
                      (palace) => palace.index === palaceIndex,
                    );

                    if (!selectedPalace) {
                      return;
                    }

                    setPreview((current) =>
                      current
                        ? {
                            ...current,
                            palacePosition: selectedPalace.position,
                          }
                        : current,
                    );
                  }}
                  overviewTestId="screen-preview-mobile-overview"
                  palaceTestId="screen-preview-mobile-palace"
                  palaces={previewPayload.qimen.palaces}
                  selectedFilterPositions={
                    preview.palacePosition ? [preview.palacePosition] : []
                  }
                  selectedPalaceIndex={previewSelectedPalaceIndex}
                  selectionMode={false}
                  status={isPreviewLoading ? 'loading' : 'ready'}
                />
                <div className="hidden sm:block">
                  <div className="grid gap-3 [grid-template-columns:repeat(3,minmax(0,1fr))] [grid-template-rows:repeat(3,minmax(10rem,auto))]">
                    {previewPayload.qimen.palaces.map((palace) => (
                      <PalaceCard
                        annotation={previewPayload.patternAnalysis.palaceAnnotations.find(
                          (item) => item.palacePosition === palace.position,
                        )}
                        detailMode="compact"
                        isFilterSelected={preview.palacePosition === palace.position}
                        isSelected={preview.palacePosition === palace.position}
                        key={`${palace.index}-${palace.position}`}
                        onPatternClick={() => {}}
                        onSelect={() => {}}
                        onSelectionDragStart={() => {}}
                        onSelectionEnter={() => {}}
                        onSelectionToggle={() => {}}
                        palace={palace}
                        selectionMode={false}
                        status="ready"
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm leading-7 text-[var(--text-secondary)]">
                  当前高亮宫位会与点击的核心吉格保持同步，方便从结果列表直接回看该股的原始盘面定位。
                </p>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}

      {isAdvancedDrawerOpen ? (
        <div className="workbench-overlay workbench-side-overlay">
          <aside className="workbench-drawer" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mystic-section-label">高级权重设置</p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  权重与等级覆盖
                </h3>
              </div>
              <button
                className="mystic-chip"
                data-hotkey-dismiss="true"
                onClick={() => setIsAdvancedDrawerOpen(false)}
                type="button"
              >
                关闭
              </button>
            </div>
            <div className="mt-5 overflow-x-auto">
              {isMobileViewport ? (
                <div className="space-y-4" data-testid="screen-advanced-mobile-list">
                  {QIMEN_PATTERN_LIBRARY.map((item) => (
                    <article
                      className="rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-overlay)] px-4 py-4"
                      key={item.name}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="mystic-section-label">{item.name}</p>
                          <p className="mt-2 text-base leading-6 text-[var(--text-secondary)]">
                            {item.meaning}
                          </p>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                          <input
                            checked={settings.patternMap[item.name].enabled}
                            onChange={(event) =>
                              updatePatternSetting(item.name, {
                                enabled: event.target.checked,
                              })
                            }
                            type="checkbox"
                          />
                          启用
                        </label>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <label className="block">
                          <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                            权重
                          </span>
                          <input
                            className="mystic-input workbench-mini-input"
                            inputMode="numeric"
                            onChange={(event) =>
                              updatePatternSetting(item.name, {
                                weight: Number(event.target.value) || 0,
                              })
                            }
                            type="number"
                            value={settings.patternMap[item.name].weight}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                            等级
                          </span>
                          <select
                            className="mystic-select w-full"
                            onChange={(event) =>
                              updatePatternSetting(item.name, {
                                level: event.target.value as
                                  | 'COMPOSITE'
                                  | 'A'
                                  | 'B'
                                  | 'C',
                              })
                            }
                            value={settings.patternMap[item.name].level}
                          >
                            <option value="COMPOSITE">COMPOSITE</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                          </select>
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <table className="workbench-settings-table">
                  <thead>
                    <tr>
                      <th>启用</th>
                      <th>吉格</th>
                      <th>权重</th>
                      <th>等级</th>
                    </tr>
                  </thead>
                  <tbody>
                    {QIMEN_PATTERN_LIBRARY.map((item) => (
                      <tr key={item.name}>
                        <td>
                          <input
                            checked={settings.patternMap[item.name].enabled}
                            onChange={(event) =>
                              updatePatternSetting(item.name, {
                                enabled: event.target.checked,
                              })
                            }
                            type="checkbox"
                          />
                        </td>
                        <td>{item.name}</td>
                        <td>
                          <input
                            className="mystic-input workbench-mini-input"
                            inputMode="numeric"
                            onChange={(event) =>
                              updatePatternSetting(item.name, {
                                weight: Number(event.target.value) || 0,
                              })
                            }
                            type="number"
                            value={settings.patternMap[item.name].weight}
                          />
                        </td>
                        <td>
                          <select
                            className="mystic-select"
                            onChange={(event) =>
                              updatePatternSetting(item.name, {
                                level: event.target.value as
                                  | 'COMPOSITE'
                                  | 'A'
                                  | 'B'
                                  | 'C',
                              })
                            }
                            value={settings.patternMap[item.name].level}
                          >
                            <option value="COMPOSITE">COMPOSITE</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="mt-4">
              <Link className="mystic-chip" href="/settings">
                前往系统设置查看完整配置
              </Link>
            </div>
          </aside>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="workbench-toast" role="status">
          {toastMessage}
        </div>
      ) : null}
    </section>
  );
}

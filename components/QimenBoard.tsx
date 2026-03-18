'use client';

import { useMemo, useState } from 'react';

import type {
  ApiError,
  Market,
  PlumStage,
  QimenApiSuccessResponse,
  QimenPalace,
  QimenPatternAnalysis,
} from '@/lib/contracts/qimen';
import {
  buildInsightBlocks,
  getSelectedPalaceHeadline,
  getSelectedPalaceSummary,
} from '@/lib/qimen-insights';
import type { BoardViewState } from '@/lib/ui';
import { getMarketLabel, getMarketShortLabel } from '@/lib/ui';
import { ErrorNotice } from '@/components/ErrorNotice';
import { PalaceCard } from '@/components/PalaceCard';

type BoardSummary = {
  stockName: string;
  stockCode: string;
  market: Market;
  listingDate: string;
  listingTime: string;
  yinYang: string;
  ju: string;
  valueStar: string;
  valueDoor: string;
  synopsis: string;
};

export type ResultTab = 'qimen' | 'plum';

type QimenBoardProps = {
  palaces: QimenPalace[];
  status: BoardViewState;
  selectedPalaceIndex: number | null;
  onSelectPalace: (palaceIndex: number) => void;
  market: Market;
  title: string;
  subtitle: string;
  headerBadge: string;
  valuePair?: string;
  summary: BoardSummary | null;
  result: QimenApiSuccessResponse | null;
  patternAnalysis: QimenPatternAnalysis | null;
  error: ApiError | null;
  activeTab: ResultTab;
  onTabChange: (tab: ResultTab) => void;
  onApplyPatternFilter: (patternName: string, palacePosition?: number) => void;
  onApplyPalaceFilter: (palacePositions: number[]) => void;
};

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
      <p className="mystic-section-label">{label}</p>
      <p className="mt-3 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
        {value}
      </p>
    </article>
  );
}

function InsightCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-[1.35rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
      <h4 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h4>
      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{body}</p>
    </article>
  );
}

function StageCard({
  label,
  stage,
}: {
  label: string;
  stage: PlumStage;
}) {
  return (
    <article className="rounded-[1.35rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border-soft)] pb-3">
        <div>
          <p className="mystic-section-label">{label}</p>
          <h4 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            {stage.name}
          </h4>
        </div>
        <span className="mystic-chip">{stage.code}</span>
      </div>
      <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-secondary)]">
        <div>
          <p className="mystic-section-label">卦辞</p>
          <p className="mt-2 text-[var(--text-primary)]">{stage.words}</p>
          <p className="mt-2">{stage.whiteWords}</p>
        </div>
        <div>
          <p className="mystic-section-label">象辞</p>
          <p className="mt-2 text-[var(--text-primary)]">{stage.picture}</p>
          <p className="mt-2">{stage.whitePicture}</p>
        </div>
        <div>
          <p className="mystic-section-label">卦股及策略</p>
          <p className="mt-2 whitespace-pre-line">{stage.stockSuggestion}</p>
        </div>
        <div>
          <p className="mystic-section-label">爻辞</p>
          <p className="mt-2 whitespace-pre-line">{stage.yaoci}</p>
        </div>
      </div>
    </article>
  );
}

function PlaceholderPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.45rem] border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] px-5 py-6">
      <h3 className="text-3xl text-[var(--text-primary)]">{title}</h3>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
  );
}

function LegendChip({
  label,
  colorClass,
}: {
  label: string;
  colorClass: string;
}) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs ${colorClass}`}>
      {label}
    </span>
  );
}

function renderBooleanLabel(value: boolean, positiveLabel: string, negativeLabel: string) {
  return value ? positiveLabel : negativeLabel;
}

function formatDetailValue(
  primary: string | null | undefined,
  secondary: string | null | undefined,
) {
  if (!primary) {
    return '';
  }

  return secondary ? `${primary}/${secondary}` : primary;
}

export function QimenBoard({
  palaces,
  status,
  selectedPalaceIndex,
  onSelectPalace,
  market,
  title,
  subtitle,
  headerBadge,
  valuePair,
  summary,
  result,
  patternAnalysis,
  error,
  activeTab,
  onTabChange,
  onApplyPatternFilter,
  onApplyPalaceFilter,
}: QimenBoardProps) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [draggingSelection, setDraggingSelection] = useState(false);
  const [selectedFilterPositions, setSelectedFilterPositions] = useState<number[]>([]);
  const selectedPalace =
    palaces.find((palace) => palace.index === selectedPalaceIndex) ?? null;
  const insightBlocks = result ? buildInsightBlocks(result, selectedPalace) : [];
  const placeholderTitle =
    status === 'loading' ? '阵盘聚势中' : error ? '请重新起局' : '等待起局';
  const placeholderDescription =
    status === 'loading'
      ? '系统正在按上市日期与默认 09:30 时辰起局，局眼与盘势会在几息之后一并显现。'
      : error
        ? '这次起局未成功，可修正股票代码后重试，或从下方筛盘结果中直接起局。'
        : '输入股票代码后，这里会直接呈现标的摘要、九宫阵盘与同区解读，不再拆成两块结果面板。';
  const patternAnnotationMap = useMemo(() => {
    return new Map(
      (patternAnalysis?.palaceAnnotations ?? []).map((annotation) => [
        annotation.palacePosition,
        annotation,
      ]),
    );
  }, [patternAnalysis?.palaceAnnotations]);
  const chartMetaItems = result?.qimen.meta
    ? [
        ['旬首', result.qimen.meta.xunHead],
        ['旬首六仪', result.qimen.meta.xunHeadGan],
        ['日干支', result.qimen.meta.dayGanzhi],
        ['时干支', result.qimen.meta.hourGanzhi],
        ['日空', result.qimen.meta.rikong],
        ['时空', result.qimen.meta.shikong],
        [
          '格局',
          [
            renderBooleanLabel(result.qimen.meta.isFuyin, '伏吟', '非伏吟'),
            renderBooleanLabel(result.qimen.meta.isFanyin, '反吟', '非反吟'),
            renderBooleanLabel(result.qimen.meta.isWubuyushi, '五不遇时', '非五不遇时'),
          ].join(' / '),
        ],
      ]
    : [];
  const selectedPalaceMetaItems = selectedPalace
    ? [
        selectedPalace.skyGan
          ? `天盘 ${formatDetailValue(selectedPalace.skyGan, selectedPalace.skyExtraGan)}`
          : null,
        selectedPalace.groundGan
          ? `地盘 ${formatDetailValue(selectedPalace.groundGan, selectedPalace.groundExtraGan)}`
          : null,
        selectedPalace.outGan
          ? `外盘 ${formatDetailValue(selectedPalace.outGan, selectedPalace.outExtraGan)}`
          : null,
        selectedPalace.wuxing ? `五行 ${selectedPalace.wuxing}` : null,
        selectedPalace.branches?.length
          ? `地支 ${selectedPalace.branches.join(' / ')}`
          : null,
        selectedPalace.emptyMarkers?.length
          ? `空亡 ${selectedPalace.emptyMarkers.join('/')}`
          : null,
      ].filter((item): item is string => Boolean(item))
    : [];

  function upsertSelection(palacePosition: number) {
    setSelectedFilterPositions((current) => {
      return current.includes(palacePosition)
        ? current
        : [...current, palacePosition].sort((left, right) => left - right);
    });
  }

  function toggleSelection(palacePosition: number) {
    setSelectedFilterPositions((current) => {
      return current.includes(palacePosition)
        ? current.filter((item) => item !== palacePosition)
        : [...current, palacePosition].sort((left, right) => left - right);
    });
  }

  function handleSelectionEnter(palacePosition: number) {
    if (!selectionMode || !draggingSelection) {
      return;
    }

    upsertSelection(palacePosition);
  }

  return (
    <section
      className="mystic-panel-strong relative overflow-hidden px-4 py-4 sm:px-5 sm:py-5"
      data-testid="qimen-result-section"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,214,132,0.09),transparent_54%),radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_42%)]" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="mystic-section-label">核心九宫阵盘</p>
            <h2 className="mt-2 text-[1.7rem] text-[var(--text-primary)] sm:text-[2.15rem]">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
              {subtitle}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <span className="mystic-chip-strong">{headerBadge}</span>
            <span className="mystic-chip">
              {getMarketShortLabel(market)}参考: {getMarketLabel(market)}
            </span>
            {valuePair ? <span className="mystic-chip">{valuePair}</span> : null}
          </div>
        </div>

        {summary ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <article className="rounded-[1.5rem] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-5 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-3xl text-[var(--text-primary)]">
                  {summary.stockName} ({summary.stockCode})
                </h3>
                <span className="mystic-chip">起局标的</span>
              </div>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                {getMarketLabel(summary.market)}
              </p>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                上市时间 {summary.listingDate} {summary.listingTime}
              </p>
              <p className="mt-3 rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm leading-7 text-[var(--text-secondary)]">
                {summary.synopsis}
              </p>
              {chartMetaItems.length > 0 ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {chartMetaItems.map(([label, value]) => (
                    <div
                      className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-overlay)] px-3 py-3"
                      key={label}
                    >
                      <p className="mystic-section-label">{label}</p>
                      <p className="mt-2 text-sm text-[var(--text-primary)]">{value}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>

            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
                <p className="mystic-section-label">阴阳遁</p>
                <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                  {summary.yinYang}
                </p>
              </article>
              <article className="rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
                <p className="mystic-section-label">局数</p>
                <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                  {summary.ju}
                </p>
              </article>
              <article className="rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
                <p className="mystic-section-label">值符星</p>
                <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                  {summary.valueStar}
                </p>
              </article>
              <article className="rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
                <p className="mystic-section-label">值使门</p>
                <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                  {summary.valueDoor}
                </p>
              </article>
            </div>
          </div>
        ) : null}

        {patternAnalysis ? (
          <div
            className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
            data-testid="pattern-analysis-panel"
          >
            <article className="rounded-[1.4rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="mystic-section-label">吉格专项分析</p>
                  <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    {patternAnalysis.rating}级 · {patternAnalysis.totalScore} 分
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="mystic-chip">{patternAnalysis.energyLabel}</span>
                  <span className="mystic-chip">
                    预测 {patternAnalysis.predictedDirection}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                {patternAnalysis.summary}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <MetricCard label="复合格" value={`${patternAnalysis.counts.COMPOSITE}`} />
                <MetricCard label="A级" value={`${patternAnalysis.counts.A}`} />
                <MetricCard label="B级" value={`${patternAnalysis.counts.B}`} />
                <MetricCard label="C级" value={`${patternAnalysis.counts.C}`} />
              </div>
              <div className="mt-4">
                <p className="mystic-section-label">点击吉格联动筛盘</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {patternAnalysis.matchedPatternNames.length > 0 ? (
                    patternAnalysis.matchedPatternNames.map((name) => (
                      <button
                        className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] transition hover:border-[var(--accent-soft)]"
                        key={name}
                        onClick={() => onApplyPatternFilter(name)}
                        type="button"
                      >
                        {name}
                      </button>
                    ))
                  ) : (
                    <span className="text-sm text-[var(--text-muted)]">当前未识别到可联动吉格。</span>
                  )}
                </div>
              </div>
              {patternAnalysis.invalidPalaces.length > 0 ? (
                <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
                  <p className="mystic-section-label">失效宫位</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {patternAnalysis.invalidPalaces.map((item) => (
                      <span className="mystic-chip" key={item.palaceLabel}>
                        {item.palaceLabel} · {item.reasons.join('/')}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>

            <article className="rounded-[1.4rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="mystic-section-label">看图联动</p>
                  <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                    宫位框选筛全市场
                  </h3>
                </div>
                <button
                  className={`w-full rounded-full border px-3 py-2 text-sm transition sm:w-auto ${
                    selectionMode
                      ? 'border-[var(--accent-strong)] bg-[var(--surface-raised)] text-[var(--text-primary)]'
                      : 'border-[var(--border-soft)] bg-[var(--surface-overlay)] text-[var(--text-secondary)] hover:border-[var(--accent-soft)]'
                  }`}
                  onClick={() => setSelectionMode((current) => !current)}
                  type="button"
                >
                  {selectionMode ? '退出框选' : '框选宫位'}
                </button>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                金色代表 A 级/复合吉格，橙色代表 B 级趋势共振，蓝色代表 C 级结构机会，灰色表示宫位失效。进入框选模式后，点击或拖过九宫即可加入筛盘条件。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <LegendChip
                  colorClass="border-[#e5be68] text-[#f4d796]"
                  label="A级 / 复合格"
                />
                <LegendChip
                  colorClass="border-[#d98a3b] text-[#f1bb82]"
                  label="B级"
                />
                <LegendChip
                  colorClass="border-[#6ba4c8] text-[#a7d2ef]"
                  label="C级"
                />
                <LegendChip
                  colorClass="border-[#6e675d] text-[#bfb8ad]"
                  label="失效宫"
                />
              </div>
              <div className="mt-4 rounded-[1.15rem] border border-[var(--border-soft)] bg-[var(--surface-overlay)] px-4 py-4">
                <p className="mystic-section-label">已选宫位</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedFilterPositions.length > 0 ? (
                    selectedFilterPositions.map((position) => (
                      <span className="mystic-chip" key={position}>
                        {position}宫
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[var(--text-muted)]">
                      暂未选中宫位。
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="mystic-button-secondary w-full sm:w-auto"
                    disabled={selectedFilterPositions.length === 0}
                    onClick={() => onApplyPalaceFilter(selectedFilterPositions)}
                    type="button"
                  >
                    以所选宫位筛全市场
                  </button>
                  <button
                    className="mystic-chip w-full justify-center sm:w-auto"
                    disabled={selectedFilterPositions.length === 0}
                    onClick={() => setSelectedFilterPositions([])}
                    type="button"
                  >
                    清空选择
                  </button>
                </div>
              </div>
            </article>
          </div>
        ) : null}

        <div
          className="board-shell relative mt-5 aspect-[0.76] overflow-hidden rounded-[1.9rem] border border-[var(--border-soft)] p-2 sm:aspect-auto sm:p-4"
          data-testid="qimen-grid"
          onPointerLeave={() => setDraggingSelection(false)}
          onPointerUp={() => setDraggingSelection(false)}
        >
          <div className="pointer-events-none absolute inset-3 z-0 rounded-[1.55rem] border border-[var(--border-strong)] opacity-80" />
          <div className="pointer-events-none absolute left-1/2 top-4 z-0 h-[calc(100%-2rem)] w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,var(--line-strong),transparent)]" />
          <div className="pointer-events-none absolute top-1/2 left-4 z-0 h-px w-[calc(100%-2rem)] -translate-y-1/2 bg-[linear-gradient(90deg,transparent,var(--line-strong),transparent)]" />
          <div className="pointer-events-none absolute left-1/3 top-4 z-0 h-[calc(100%-2rem)] w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,var(--line-soft),transparent)]" />
          <div className="pointer-events-none absolute left-2/3 top-4 z-0 h-[calc(100%-2rem)] -translate-x-1/2 w-px bg-[linear-gradient(180deg,transparent,var(--line-soft),transparent)]" />
          <div className="pointer-events-none absolute top-1/3 left-4 z-0 h-px w-[calc(100%-2rem)] -translate-y-1/2 bg-[linear-gradient(90deg,transparent,var(--line-soft),transparent)]" />
          <div className="pointer-events-none absolute top-2/3 left-4 z-0 h-px w-[calc(100%-2rem)] -translate-y-1/2 bg-[linear-gradient(90deg,transparent,var(--line-soft),transparent)]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--border-strong)] bg-[radial-gradient(circle,rgba(255,217,143,0.14),transparent_65%)] blur-sm sm:h-36 sm:w-36" />

          <div className="relative z-10 grid h-full grid-cols-3 grid-rows-3 gap-2 sm:h-auto sm:gap-3 sm:[grid-template-rows:repeat(3,minmax(22rem,auto))]">
            {palaces.map((palace) => (
              <PalaceCard
                annotation={patternAnnotationMap.get(palace.position)}
                isFilterSelected={selectedFilterPositions.includes(palace.position)}
                isSelected={selectedPalace?.index === palace.index}
                key={`${palace.index}-${palace.position}`}
                onPatternClick={onApplyPatternFilter}
                onSelect={onSelectPalace}
                onSelectionDragStart={() => setDraggingSelection(true)}
                onSelectionEnter={handleSelectionEnter}
                onSelectionToggle={toggleSelection}
                palace={palace}
                selectionMode={selectionMode}
                status={status}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-[1.4rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mystic-section-label">宫位焦点</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                {getSelectedPalaceHeadline(selectedPalace)}
              </h3>
            </div>
            <div className="rounded-full border border-[var(--border-strong)] px-3 py-1 text-xs tracking-[0.18em] text-[var(--accent-strong)]">
              {status === 'loading'
                ? '排盘生成中'
                : status === 'ready'
                  ? selectionMode
                    ? '框选模式'
                    : '结果已生成'
                  : '待起局'}
            </div>
          </div>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            {status === 'loading'
              ? '阵盘正在聚势，中心局眼会先被点亮，宫位信息随后逐步显现。'
              : selectionMode
                ? '当前处于框选模式，点击或拖过宫位即可把该宫加入筛盘条件。'
                : getSelectedPalaceSummary(selectedPalace)}
          </p>
          {selectedPalaceMetaItems.length > 0 && !selectionMode ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedPalaceMetaItems.map((item) => (
                <span className="mystic-chip" key={item}>
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {result ? (
          <div className="mt-5 border-t border-[var(--border-soft)] pt-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="mystic-section-label">盘面解读</p>
                <h3 className="mt-2 text-[1.7rem] text-[var(--text-primary)] sm:text-[2rem]">
                  奇门与梅花同区解读
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  九宫盘始终留在上方主视图，下面只切换解读层，避免来回跳读。
                </p>
              </div>
              <div className="mystic-chip-strong">
                {result.plum.status === 'ready'
                  ? '双引擎已就绪'
                  : `${result.qimen.yinYang}遁 ${result.qimen.ju}局`}
              </div>
            </div>

            <div aria-label="盘面解读标签" className="mt-5 flex flex-wrap gap-2" role="tablist">
              <button
                aria-controls="qimen-board-tabpanel-qimen"
                aria-selected={activeTab === 'qimen'}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeTab === 'qimen'
                    ? 'border-[var(--accent-strong)] bg-[var(--surface-raised)] text-[var(--text-primary)]'
                    : 'border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:border-[var(--accent-soft)] hover:text-[var(--text-primary)]'
                }`}
                id="qimen-board-tab-qimen"
                onClick={() => onTabChange('qimen')}
                role="tab"
                type="button"
              >
                奇门盘
              </button>
              <button
                aria-controls="qimen-board-tabpanel-plum"
                aria-selected={activeTab === 'plum'}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeTab === 'plum'
                    ? 'border-[var(--accent-strong)] bg-[var(--surface-raised)] text-[var(--text-primary)]'
                    : 'border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:border-[var(--accent-soft)] hover:text-[var(--text-primary)]'
                }`}
                id="qimen-board-tab-plum"
                onClick={() => onTabChange('plum')}
                role="tab"
                type="button"
              >
                梅花易数
              </button>
            </div>

            {activeTab === 'qimen' ? (
              <section
                aria-labelledby="qimen-board-tab-qimen"
                className="mt-5"
                id="qimen-board-tabpanel-qimen"
                role="tabpanel"
              >
                <div className="grid gap-4 lg:grid-cols-3">
                  {insightBlocks.map((item) => (
                    <InsightCard body={item.body} key={item.title} title={item.title} />
                  ))}
                </div>
                {result.deepDiagnosis ? (
                  <div
                    className="mt-5 space-y-4"
                    data-testid="deep-diagnosis-panel"
                  >
                    <article className="rounded-[1.4rem] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="mystic-section-label">深度诊断</p>
                          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
                            {result.deepDiagnosis.actionLabel}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="mystic-chip">成功率 {result.deepDiagnosis.successProbability}%</span>
                          <span className="mystic-chip">风险 {result.deepDiagnosis.riskLevel}</span>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                        {result.deepDiagnosis.coreConclusion}
                      </p>
                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {result.deepDiagnosis.useShen.map((item) => (
                          <article
                            className="rounded-[1.1rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4"
                            key={`${item.kind}-${item.palacePosition}`}
                          >
                            <p className="mystic-section-label">{item.label}</p>
                            <h4 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                              {item.value} · {item.palaceName}{item.palacePosition}宫
                            </h4>
                            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                              {item.summary}
                            </p>
                          </article>
                        ))}
                      </div>
                    </article>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                      <article className="rounded-[1.4rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
                        <p className="mystic-section-label">五步推演</p>
                        <div className="mt-4 space-y-4">
                          {result.deepDiagnosis.palaceReadings.map((item) => (
                            <article
                              className="rounded-[1.15rem] border border-[var(--border-soft)] bg-[var(--surface-overlay)] px-4 py-4"
                              key={`${item.title}-${item.palacePosition}`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="text-lg font-semibold text-[var(--text-primary)]">
                                  {item.title} · {item.palaceName}{item.palacePosition}宫
                                </h4>
                                <span className="mystic-chip">{item.role}</span>
                              </div>
                              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                                {item.summary}
                              </p>
                              <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                                <p><span className="text-[var(--text-primary)]">天时：</span>{item.tianShi}</p>
                                <p><span className="text-[var(--text-primary)]">地利：</span>{item.diLi}</p>
                                <p><span className="text-[var(--text-primary)]">人和：</span>{item.renHe}</p>
                                <p><span className="text-[var(--text-primary)]">神助：</span>{item.shenZhu}</p>
                                <p><span className="text-[var(--text-primary)]">干盘：</span>{item.stemPattern}</p>
                              </div>
                            </article>
                          ))}
                        </div>
                      </article>

                      <div className="space-y-4">
                        <article className="rounded-[1.4rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
                          <p className="mystic-section-label">综合判断</p>
                          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                            {result.deepDiagnosis.firstImpression}
                          </p>
                          <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                            {result.deepDiagnosis.decisionRationale.map((item) => (
                              <p key={item}>{item}</p>
                            ))}
                          </div>
                        </article>

                        <article className="rounded-[1.4rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
                          <p className="mystic-section-label">走势推演</p>
                          <div className="mt-4 space-y-3">
                            {result.deepDiagnosis.outlooks.map((item) => (
                              <div
                                className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-overlay)] px-4 py-3"
                                key={item.horizon}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                                    {item.horizon}
                                  </p>
                                  <span className="mystic-chip">{item.trend}</span>
                                </div>
                                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                                  {item.detail}
                                </p>
                              </div>
                            ))}
                          </div>
                        </article>

                        <article className="rounded-[1.4rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
                          <p className="mystic-section-label">行动指南</p>
                          <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                            {result.deepDiagnosis.actionGuide.map((item) => (
                              <p key={item}>{item}</p>
                            ))}
                          </div>
                          {result.deepDiagnosis.keyTimingHints.length > 0 ? (
                            <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
                              <p className="mystic-section-label">关键节点</p>
                              <div className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                                {result.deepDiagnosis.keyTimingHints.map((item) => (
                                  <p key={item}>{item}</p>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          <p className="mt-4 text-xs leading-6 text-[var(--text-muted)]">
                            {result.deepDiagnosis.note}
                          </p>
                        </article>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : (
              <section
                aria-labelledby="qimen-board-tab-plum"
                className="mt-5"
                id="qimen-board-tabpanel-plum"
                role="tabpanel"
              >
                {result.plum.status === 'ready' ? (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="mystic-section-label">梅花三卦</p>
                        <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                          开盘价起卦结果
                        </h3>
                      </div>
                      <span className="mystic-chip">
                        上卦 {result.plum.upperTrigram} / 下卦 {result.plum.lowerTrigram}
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                      <MetricCard label="起卦依据" value="当日开盘价" />
                      <MetricCard label="开盘价" value={result.plum.priceValue} />
                      <MetricCard label="上卦数" value={`${result.plum.upperNumber}`} />
                      <MetricCard
                        label="下卦数"
                        value={String(result.plum.lowerNumber).padStart(2, '0')}
                      />
                      <MetricCard label="动爻" value={`${result.plum.movingLine}爻`} />
                      <MetricCard
                        label="本卦"
                        value={`${result.plum.upperTrigram}${result.plum.lowerTrigram}`}
                      />
                    </div>
                    <div className="grid gap-4 xl:grid-cols-3">
                      <StageCard label="本卦" stage={result.plum.original} />
                      <StageCard label="互卦" stage={result.plum.mutual} />
                      <StageCard label="变卦" stage={result.plum.changed} />
                    </div>
                  </div>
                ) : (
                  <div data-testid="plum-unavailable">
                    <ErrorNotice error={result.plum} title="梅花暂不可用" />
                  </div>
                )}
              </section>
            )}
          </div>
        ) : (
          <div className="mt-5 border-t border-[var(--border-soft)] pt-5">
            {error && status !== 'loading' ? (
              <div className="mb-4">
                <ErrorNotice error={error} title="起局失败" />
              </div>
            ) : null}
            <PlaceholderPanel
              description={placeholderDescription}
              title={placeholderTitle}
            />
          </div>
        )}
      </div>
    </section>
  );
}

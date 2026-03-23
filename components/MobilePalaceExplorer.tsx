'use client';

import type {
  QimenPalace,
  QimenPatternPalaceAnnotation,
} from '@/lib/contracts/qimen';
import {
  getSelectedPalaceHeadline,
  getSelectedPalaceSummary,
} from '@/lib/qimen-insights';
import type { BoardViewState } from '@/lib/ui';

type MobilePalaceExplorerProps = {
  palaces: QimenPalace[];
  selectedPalaceIndex: number | null;
  onSelectPalace: (palaceIndex: number) => void;
  status: BoardViewState;
  detailStatus?: BoardViewState;
  selectionMode?: boolean;
  selectedFilterPositions?: number[];
  getAnnotation?: (
    palace: QimenPalace,
  ) => QimenPatternPalaceAnnotation | undefined;
  onApplyPatternFilter?: (patternName: string, palacePosition?: number) => void;
  onSelectionToggle?: (palacePosition: number) => void;
  onSelectionEnter?: (palacePosition: number) => void;
  onSelectionDragStart?: () => void;
  onOverviewPointerLeave?: () => void;
  onOverviewPointerUp?: () => void;
  className?: string;
  layoutTestId: string;
  overviewTestId: string;
  palaceTestId: string;
  detailTestId: string;
  detailCardTestId: string;
};

function noop() {}

type PalaceOverviewRow = {
  label: string;
  value: string;
};

function getOverviewToneClass(annotation: QimenPatternPalaceAnnotation | undefined) {
  switch (annotation?.tone) {
    case 'gold':
      return 'border-[#d8b35a] bg-[radial-gradient(circle_at_top,rgba(216,179,90,0.2),transparent_60%),linear-gradient(180deg,rgba(58,42,26,0.98),rgba(28,20,15,0.96))]';
    case 'orange':
      return 'border-[#d98a3b] bg-[radial-gradient(circle_at_top,rgba(217,138,59,0.18),transparent_60%),linear-gradient(180deg,rgba(53,33,24,0.98),rgba(28,20,15,0.96))]';
    case 'blue':
      return 'border-[#6ba4c8] bg-[radial-gradient(circle_at_top,rgba(107,164,200,0.16),transparent_60%),linear-gradient(180deg,rgba(29,39,51,0.98),rgba(20,22,31,0.96))]';
    case 'muted':
      return 'border-[rgba(120,146,177,0.16)] bg-[linear-gradient(180deg,rgba(35,39,47,0.98),rgba(18,21,28,0.96))]';
    case 'none':
    default:
      return 'border-[rgba(120,146,177,0.16)] bg-[linear-gradient(180deg,rgba(34,28,23,0.98),rgba(20,17,15,0.96))]';
  }
}

function formatOverviewValue(
  primary: string | null | undefined,
  secondary: string | null | undefined,
) {
  if (!primary) {
    return '--';
  }

  return secondary ? `${primary}/${secondary}` : primary;
}

function buildOverviewRows(palace: QimenPalace): PalaceOverviewRow[] {
  return [
    { label: '门', value: palace.door || '--' },
    { label: '神', value: palace.god || '--' },
    {
      label: '天',
      value: formatOverviewValue(palace.skyGan, palace.skyExtraGan),
    },
    {
      label: '地',
      value: formatOverviewValue(palace.groundGan, palace.groundExtraGan),
    },
    {
      label: '外',
      value: formatOverviewValue(palace.outGan, palace.outExtraGan),
    },
    { label: '五', value: palace.wuxing || '--' },
    {
      label: '支',
      value: palace.branches && palace.branches.length > 0 ? palace.branches.join('/') : '--',
    },
    {
      label: '空',
      value:
        palace.emptyMarkers && palace.emptyMarkers.length > 0
          ? palace.emptyMarkers.join('/')
          : '--',
    },
  ];
}

export function MobilePalaceExplorer({
  palaces,
  selectedPalaceIndex,
  onSelectPalace,
  status,
  detailStatus = status,
  selectionMode = false,
  selectedFilterPositions = [],
  getAnnotation,
  onApplyPatternFilter = noop,
  onSelectionToggle = noop,
  onSelectionEnter = noop,
  onSelectionDragStart = noop,
  onOverviewPointerLeave,
  onOverviewPointerUp,
  className = '',
  layoutTestId,
  overviewTestId,
  palaceTestId,
  detailTestId,
  detailCardTestId,
}: MobilePalaceExplorerProps) {
  const selectedPalace =
    palaces.find((palace) => palace.index === selectedPalaceIndex) ?? null;
  const selectedPalaceAnnotation = selectedPalace
    ? getAnnotation?.(selectedPalace)
    : undefined;

  return (
    <div
      className={`${className} space-y-4 sm:hidden`}
      data-mobile-layout="palace-explorer"
      data-testid={layoutTestId}
    >
      <div
        className="board-shell relative overflow-hidden rounded-[1.75rem] border border-[var(--border-soft)] p-2"
        data-testid={overviewTestId}
        onPointerLeave={onOverviewPointerLeave}
        onPointerUp={onOverviewPointerUp}
      >
        <div className="pointer-events-none absolute inset-3 z-0 rounded-[1.35rem] border border-[var(--border-strong)] opacity-80" />
        <div className="pointer-events-none absolute left-1/2 top-3 z-0 h-[calc(100%-1.5rem)] w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,var(--line-strong),transparent)]" />
        <div className="pointer-events-none absolute top-1/2 left-3 z-0 h-px w-[calc(100%-1.5rem)] -translate-y-1/2 bg-[linear-gradient(90deg,transparent,var(--line-strong),transparent)]" />
        <div className="pointer-events-none absolute left-1/3 top-3 z-0 h-[calc(100%-1.5rem)] w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,var(--line-soft),transparent)]" />
        <div className="pointer-events-none absolute left-2/3 top-3 z-0 h-[calc(100%-1.5rem)] -translate-x-1/2 w-px bg-[linear-gradient(180deg,transparent,var(--line-soft),transparent)]" />
        <div className="pointer-events-none absolute top-1/3 left-3 z-0 h-px w-[calc(100%-1.5rem)] -translate-y-1/2 bg-[linear-gradient(90deg,transparent,var(--line-soft),transparent)]" />
        <div className="pointer-events-none absolute top-2/3 left-3 z-0 h-px w-[calc(100%-1.5rem)] -translate-y-1/2 bg-[linear-gradient(90deg,transparent,var(--line-soft),transparent)]" />

        <div className="relative z-10 grid grid-cols-3 gap-2 [grid-template-rows:repeat(3,minmax(15rem,auto))]">
          {palaces.map((palace) => {
            const annotation = getAnnotation?.(palace);
            const isSelected = selectedPalace?.index === palace.index;
            const isFilterSelected = selectedFilterPositions.includes(palace.position);
            const overviewRows = buildOverviewRows(palace);
            const badgeLabels = [
              annotation?.isHourPalace ? '时干' : null,
              annotation?.isValueDoorPalace ? '值使' : null,
              palace.position === 5 ? '局眼' : null,
            ].filter((item): item is string => Boolean(item));
            const selectionLabel = selectionMode
              ? isFilterSelected
                ? '已纳入筛选'
                : '点选加入'
              : isSelected
                ? '当前聚焦'
                : '点按聚焦';

            return (
              <button
                aria-label={`${palace.name}宫 ${palace.star}`}
                aria-pressed={isSelected}
                className={`relative flex min-h-[15rem] flex-col rounded-[1.05rem] border px-2 py-2.5 text-left transition ${
                  status === 'loading' ? 'animate-pulse opacity-90' : ''
                } ${
                  isSelected
                    ? 'ring-2 ring-[var(--accent-strong)] shadow-[0_10px_30px_rgba(0,0,0,0.22)]'
                    : ''
                } ${
                  isFilterSelected ? 'ring-2 ring-[#f0d59a]' : ''
                } ${getOverviewToneClass(annotation)}`}
                data-mobile-overview-card="true"
                data-testid={palaceTestId}
                key={`${palace.index}-${palace.position}-mobile`}
                onClick={() => {
                  if (selectionMode) {
                    onSelectionToggle(palace.position);
                    return;
                  }

                  onSelectPalace(palace.index);
                }}
                onPointerDown={() => selectionMode && onSelectionDragStart()}
                onPointerEnter={() => selectionMode && onSelectionEnter(palace.position)}
                type="button"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {palace.name}宫
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                      洛书 {palace.position}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {badgeLabels.slice(0, 2).map((badgeLabel) => (
                      <span
                        className="rounded-full border border-[rgba(255,255,255,0.12)] bg-black/10 px-1.5 py-0.5 text-[9px] text-[var(--text-secondary)]"
                        key={badgeLabel}
                      >
                        {badgeLabel}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-2">
                  <p className="text-[1.02rem] font-semibold leading-[1.15] text-[var(--text-primary)]">
                    {palace.star}
                  </p>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-1">
                  {overviewRows.slice(0, 2).map((item) => (
                    <div
                      className="rounded-[0.75rem] border border-[rgba(255,255,255,0.08)] bg-black/10 px-2 py-1.5"
                      key={`${palace.index}-${item.label}`}
                    >
                      <p className="text-[9px] leading-none text-[var(--text-muted)]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-[10px] font-medium leading-none text-[var(--text-primary)]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <dl className="mt-2 space-y-1">
                  {overviewRows.slice(2).map((item) => (
                    <div
                      className="flex items-start justify-between gap-2 rounded-[0.75rem] border border-[rgba(255,255,255,0.06)] bg-black/10 px-2 py-1"
                      key={`${palace.index}-${item.label}`}
                    >
                      <dt className="shrink-0 text-[9px] leading-5 text-[var(--text-muted)]">
                        {item.label}
                      </dt>
                      <dd className="text-right text-[10px] leading-5 text-[var(--text-primary)] break-words">
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-2 space-y-1.5 border-t border-[rgba(255,255,255,0.08)] pt-2">
                  <div className="rounded-full border border-[rgba(255,255,255,0.08)] bg-black/10 px-2 py-1 text-[10px] leading-none text-[var(--text-secondary)]">
                    {selectionLabel}
                  </div>

                  {annotation?.patternNames && annotation.patternNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {annotation.patternNames.map((patternName) => (
                        <span
                          className="rounded-full border border-[rgba(229,190,104,0.28)] bg-[rgba(229,190,104,0.08)] px-1.5 py-0.5 text-[9px] leading-none text-[var(--text-primary)]"
                          key={`${palace.index}-${patternName}`}
                        >
                          {patternName}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {annotation?.invalidReasons && annotation.invalidReasons.length > 0 ? (
                    <p className="rounded-[0.75rem] border border-[rgba(217,138,59,0.24)] bg-[rgba(217,138,59,0.08)] px-2 py-1 text-[9px] leading-4 text-[var(--text-secondary)]">
                      失效: {annotation.invalidReasons.join('/')}
                    </p>
                  ) : null}

                  {annotation?.topEvilPatterns && annotation.topEvilPatterns.length > 0 ? (
                    <p className="rounded-[0.75rem] border border-[rgba(189,87,87,0.24)] bg-[rgba(189,87,87,0.08)] px-2 py-1 text-[9px] leading-4 text-[var(--text-secondary)]">
                      凶格: {annotation.topEvilPatterns.join('/')}
                    </p>
                  ) : null}

                  {!annotation?.patternNames?.length &&
                  !annotation?.invalidReasons?.length &&
                  !annotation?.topEvilPatterns?.length ? (
                    <p className="text-[9px] leading-4 text-[var(--text-muted)]">
                      常规宫位，无额外格局提示。
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`rounded-[1.45rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4 ${
          detailStatus === 'loading' ? 'animate-pulse' : ''
        }`}
        data-testid={detailTestId}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mystic-section-label">当前宫位补充说明</p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
              {getSelectedPalaceHeadline(selectedPalace)}
            </h3>
          </div>
          <div className="rounded-full border border-[var(--border-strong)] px-3 py-1 text-xs tracking-[0.18em] text-[var(--accent-strong)]">
            {selectionMode ? '框选模式' : '辅助摘要'}
          </div>
        </div>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          {selectionMode
            ? '当前处于框选模式，点击上方九宫概览即可加入或移除筛选宫位。'
            : getSelectedPalaceSummary(selectedPalace)}
        </p>
        {selectedPalace ? (
          <div
            className="mt-4 rounded-[1.15rem] border border-[var(--border-soft)] bg-black/10 px-3 py-3"
            data-testid={detailCardTestId}
          >
            <div className="flex flex-wrap gap-2">
              <span className="mystic-chip">主星 {selectedPalace.star}</span>
              <span className="mystic-chip">八门 {selectedPalace.door || '--'}</span>
              <span className="mystic-chip">八神 {selectedPalace.god || '--'}</span>
              {selectedPalaceAnnotation?.isHourPalace ? (
                <span className="mystic-chip">时干宫</span>
              ) : null}
              {selectedPalaceAnnotation?.isValueDoorPalace ? (
                <span className="mystic-chip">值使宫</span>
              ) : null}
              {selectedPalace.position === 5 ? (
                <span className="mystic-chip">中宫局眼</span>
              ) : null}
            </div>

            {selectedPalaceAnnotation?.patternNames &&
            selectedPalaceAnnotation.patternNames.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedPalaceAnnotation.patternNames.map((patternName) => (
                  <button
                    className="rounded-full border border-[var(--border-strong)] bg-black/10 px-2.5 py-1 text-xs text-[var(--text-primary)] transition hover:border-[var(--accent-soft)]"
                    key={`${selectedPalace.index}-${patternName}`}
                    onClick={() => onApplyPatternFilter(patternName, selectedPalace.position)}
                    type="button"
                  >
                    {patternName}
                  </button>
                ))}
              </div>
            ) : null}

            {selectedPalaceAnnotation?.invalidReasons &&
            selectedPalaceAnnotation.invalidReasons.length > 0 ? (
              <p className="mt-3 rounded-[0.95rem] border border-[rgba(217,138,59,0.3)] bg-[rgba(217,138,59,0.08)] px-3 py-2 text-[11px] leading-6 text-[var(--text-secondary)]">
                失效: {selectedPalaceAnnotation.invalidReasons.join('/')}
              </p>
            ) : null}

            {selectedPalaceAnnotation?.topEvilPatterns &&
            selectedPalaceAnnotation.topEvilPatterns.length > 0 ? (
              <p className="mt-3 rounded-[0.95rem] border border-[rgba(189,87,87,0.32)] bg-[rgba(189,87,87,0.08)] px-3 py-2 text-[11px] leading-6 text-[var(--text-secondary)]">
                凶格: {selectedPalaceAnnotation.topEvilPatterns.join('/')}
              </p>
            ) : null}
          </div>
        ) : null}

        {!selectedPalace && detailStatus !== 'loading' ? (
          <div
            className="mt-4 rounded-[1.15rem] border border-[var(--border-soft)] bg-black/10 px-3 py-3 text-sm text-[var(--text-muted)]"
            data-testid={detailCardTestId}
          >
            起局后可点按任一宫位，查看当前聚焦的补充说明。
          </div>
        ) : null}
      </div>
    </div>
  );
}

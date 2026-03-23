'use client';

import type { KeyboardEvent } from 'react';

import type {
  QimenPalace,
  QimenPatternPalaceAnnotation,
} from '@/lib/contracts/qimen';
import type { BoardViewState } from '@/lib/ui';

type PalaceCardProps = {
  palace: QimenPalace;
  annotation?: QimenPatternPalaceAnnotation;
  status: BoardViewState;
  isSelected: boolean;
  interactive?: boolean;
  detailMode?: 'compact' | 'expanded' | 'adaptive';
  selectionMode: boolean;
  isFilterSelected: boolean;
  onSelect: (palaceIndex: number) => void;
  onPatternClick: (patternName: string, palacePosition: number) => void;
  onSelectionToggle: (palacePosition: number) => void;
  onSelectionDragStart: () => void;
  onSelectionEnter: (palacePosition: number) => void;
  testId?: string;
  className?: string;
};

type PalaceDetailChip = {
  label: string;
  value: string;
};

function LoadingLines({ emphasize = false }: { emphasize?: boolean }) {
  return (
    <div className="space-y-2">
      <div className={`h-3 rounded-full bg-white/12 ${emphasize ? 'w-16' : 'w-12'}`} />
      <div className={`h-8 rounded-full bg-white/14 ${emphasize ? 'w-20' : 'w-16'}`} />
      <div className="h-3 w-14 rounded-full bg-white/10" />
      <div className="h-3 w-12 rounded-full bg-white/10" />
    </div>
  );
}

function resolveToneClass(annotation: QimenPatternPalaceAnnotation | undefined) {
  switch (annotation?.tone) {
    case 'gold':
      return 'border-[#e5be68] bg-[radial-gradient(circle_at_top,rgba(229,190,104,0.18),transparent_55%),linear-gradient(180deg,rgba(53,37,24,0.96),rgba(32,22,16,0.92))] shadow-[0_0_0_1px_rgba(229,190,104,0.16),0_18px_34px_rgba(0,0,0,0.28)]';
    case 'orange':
      return 'border-[#d98a3b] bg-[radial-gradient(circle_at_top,rgba(217,138,59,0.16),transparent_55%),linear-gradient(180deg,rgba(53,33,24,0.96),rgba(31,21,16,0.92))]';
    case 'blue':
      return 'border-[#6ba4c8] bg-[radial-gradient(circle_at_top,rgba(107,164,200,0.16),transparent_55%),linear-gradient(180deg,rgba(32,40,50,0.96),rgba(23,20,26,0.92))]';
    case 'muted':
      return 'border-[#6e675d] bg-[linear-gradient(180deg,rgba(42,36,33,0.96),rgba(24,20,19,0.92))] opacity-90';
    case 'none':
    default:
      return 'border-[var(--border-soft)]';
  }
}

function formatPalaceDetails(palace: QimenPalace): PalaceDetailChip[] {
  const chips: PalaceDetailChip[] = [];

  if (palace.skyGan) {
    chips.push({
      label: '天盘',
      value: palace.skyExtraGan ? `${palace.skyGan}/${palace.skyExtraGan}` : palace.skyGan,
    });
  }

  if (palace.groundGan) {
    chips.push({
      label: '地盘',
      value: palace.groundExtraGan
        ? `${palace.groundGan}/${palace.groundExtraGan}`
        : palace.groundGan,
    });
  }

  if (palace.emptyMarkers && palace.emptyMarkers.length > 0) {
    chips.push({
      label: '空亡',
      value: palace.emptyMarkers.join('/'),
    });
  }

  if (palace.wuxing) {
    chips.push({
      label: '五行',
      value: palace.wuxing,
    });
  }

  if (palace.outGan) {
    chips.push({
      label: '外盘',
      value: palace.outExtraGan ? `${palace.outGan}/${palace.outExtraGan}` : palace.outGan,
    });
  }

  if (palace.branches && palace.branches.length > 0) {
    chips.push({
      label: '地支',
      value: palace.branches.join(''),
    });
  }

  return chips.slice(0, 3);
}

function formatPalaceDetailValue(
  primary: string | null | undefined,
  secondary: string | null | undefined,
) {
  if (!primary) {
    return '';
  }

  return secondary ? `${primary}/${secondary}` : primary;
}

function buildExpandedDetailRows(palace: QimenPalace): PalaceDetailChip[] {
  return [
    { label: '八门', value: palace.door || '--' },
    { label: '八神', value: palace.god || '--' },
    {
      label: '天盘',
      value: formatPalaceDetailValue(palace.skyGan, palace.skyExtraGan) || '--',
    },
    {
      label: '地盘',
      value: formatPalaceDetailValue(palace.groundGan, palace.groundExtraGan) || '--',
    },
    {
      label: '外盘',
      value: formatPalaceDetailValue(palace.outGan, palace.outExtraGan) || '--',
    },
    { label: '五行', value: palace.wuxing || '--' },
    {
      label: '地支',
      value: palace.branches && palace.branches.length > 0 ? palace.branches.join(' / ') : '--',
    },
    {
      label: '空亡',
      value:
        palace.emptyMarkers && palace.emptyMarkers.length > 0
          ? palace.emptyMarkers.join(' / ')
          : '--',
    },
  ];
}

export function PalaceCard({
  palace,
  annotation,
  status,
  isSelected,
  interactive,
  detailMode = 'adaptive',
  selectionMode,
  isFilterSelected,
  onSelect,
  onPatternClick,
  onSelectionToggle,
  onSelectionDragStart,
  onSelectionEnter,
  testId = 'qimen-palace',
  className = '',
}: PalaceCardProps) {
  const isCenterPalace = palace.position === 5;
  const isInteractive = interactive ?? status === 'ready';
  const layoutMinHeightClass =
    detailMode === 'compact'
      ? 'min-h-[10.5rem] sm:min-h-[12rem]'
      : detailMode === 'expanded'
        ? 'min-h-[18rem] sm:min-h-[22rem]'
        : 'min-h-[10.5rem] sm:min-h-[22rem]';
  const patternNames = annotation?.patternNames ?? [];
  const invalidReasonLabel = annotation?.invalidReasons.join('/') ?? '';
  const topEvilPatternLabel = annotation?.topEvilPatterns.join('/') ?? '';
  const detailChips = formatPalaceDetails(palace);
  const compactDoorGodRows = [
    { label: '门', value: palace.door },
    { label: '神', value: palace.god },
  ];
  const expandedDetailRows = buildExpandedDetailRows(palace);
  const shouldRenderCompact = detailMode === 'compact' || detailMode === 'adaptive';
  const shouldRenderExpanded = detailMode === 'expanded' || detailMode === 'adaptive';
  const shouldShowExpandedAnnotationDetails = detailMode === 'expanded';
  const shouldUseComfortableDetailPanelLayout =
    detailMode === 'expanded' && !isInteractive;

  function handleCardClick() {
    if (!isInteractive) {
      return;
    }

    if (selectionMode) {
      onSelectionToggle(palace.position);
      return;
    }

    onSelect(palace.index);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    handleCardClick();
  }

  return (
    <article
      aria-label={`${palace.name}宫 ${palace.star}`}
      aria-pressed={isInteractive ? isSelected : undefined}
      className={`group relative h-full overflow-hidden rounded-[1.1rem] border px-2.5 py-2.5 text-left transition sm:rounded-[1.25rem] sm:px-4 sm:py-4 ${
        isCenterPalace
          ? 'palace-card-center'
          : 'palace-card-shell'
      } ${
        isInteractive
          ? 'cursor-pointer hover:-translate-y-0.5'
          : 'cursor-default'
      } ${
        status === 'loading'
          ? isCenterPalace
            ? 'animate-pulse'
            : 'opacity-90'
          : ''
      } ${
        isSelected && isInteractive
          ? 'ring-1 ring-[var(--accent-strong)] shadow-[var(--shadow-strong)]'
          : ''
      } ${
        isFilterSelected
          ? 'ring-2 ring-[#f0d59a] ring-offset-0'
          : ''
      } ${layoutMinHeightClass} ${resolveToneClass(annotation)} ${className}`}
      data-detail-mode={detailMode}
      data-pattern-tone={annotation?.tone ?? 'none'}
      data-testid={testId}
      onClick={isInteractive ? handleCardClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      onPointerDown={
        isInteractive ? () => selectionMode && onSelectionDragStart() : undefined
      }
      onPointerEnter={
        isInteractive ? () => selectionMode && onSelectionEnter(palace.position) : undefined
      }
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_62%)] opacity-60" />
      <div className="relative z-10 flex h-full flex-col gap-3 sm:gap-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-muted)] sm:tracking-[0.34em]">
              {palace.name}宫
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">洛书 {palace.position}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {annotation?.isHourPalace ? (
              <span className="rounded-full border border-[var(--accent-strong)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.2em] text-[var(--accent-strong)] sm:px-2 sm:py-1 sm:text-[10px] sm:tracking-[0.24em]">
                时干
              </span>
            ) : null}
            {annotation?.isValueDoorPalace ? (
              <span className="rounded-full border border-[var(--border-strong)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.2em] text-[var(--text-secondary)] sm:px-2 sm:py-1 sm:text-[10px] sm:tracking-[0.24em]">
                值使
              </span>
            ) : null}
            {isCenterPalace ? (
              <span className="rounded-full border border-[var(--border-strong)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.2em] text-[var(--accent-strong)] sm:px-2 sm:py-1 sm:text-[10px] sm:tracking-[0.24em]">
                局眼
              </span>
            ) : null}
          </div>
        </div>

        {status === 'loading' ? (
          <LoadingLines emphasize={isCenterPalace} />
        ) : (
          <>
            <div className="space-y-1.5">
              <p className={`font-semibold leading-none text-[var(--text-primary)] ${
                isCenterPalace
                  ? 'text-[1.12rem] sm:text-[2rem]'
                  : 'text-[0.94rem] sm:text-[1.55rem]'
              } leading-[1.05]`}>
                {palace.star}
              </p>
              <p className={`hidden text-xs text-[var(--text-muted)] sm:block ${
                detailMode !== 'compact' ? 'sm:hidden' : ''
              }`}>
                {selectionMode
                  ? isFilterSelected
                    ? '已纳入宫位筛选'
                    : '点击或拖过即可加入筛选'
                  : isCenterPalace
                    ? '中宫核心星'
                    : '主星显化'}
              </p>
            </div>

            {detailMode === 'compact' && detailChips.length > 0 ? (
              <div className="hidden flex-wrap gap-1.5 sm:flex">
                {detailChips.map((item) => (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--border-soft)] bg-black/10 px-2 py-1 text-[10px] leading-none text-[var(--text-secondary)]"
                    key={`${item.label}-${item.value}`}
                  >
                    <span className="text-[var(--text-muted)]">{item.label}</span>
                    <span className="text-[var(--text-primary)]">{item.value}</span>
                  </span>
                ))}
              </div>
            ) : null}

            {shouldRenderCompact ? (
              <div className={`${detailMode === 'adaptive' ? 'flex sm:hidden' : 'flex'} flex-wrap gap-1`}>
                {palace.skyGan ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-soft)] bg-black/10 px-2 py-1 text-[10px] leading-none text-[var(--text-secondary)]">
                    <span className="text-[var(--text-muted)]">天盘</span>
                    <span className="text-[var(--text-primary)]">
                      {formatPalaceDetailValue(palace.skyGan, palace.skyExtraGan)}
                    </span>
                  </span>
                ) : null}
                {palace.emptyMarkers && palace.emptyMarkers.length > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-soft)] bg-black/10 px-2 py-1 text-[10px] leading-none text-[var(--text-secondary)]">
                    <span className="text-[var(--text-muted)]">空亡</span>
                    <span className="text-[var(--text-primary)]">
                      {palace.emptyMarkers.join('/')}
                    </span>
                  </span>
                ) : null}
              </div>
            ) : null}

            {shouldRenderCompact ? (
              <dl
                className={`grid grid-cols-2 gap-1.5 border-t border-[var(--border-soft)] pt-3 text-[11px] sm:text-sm ${
                  detailMode === 'adaptive' ? 'sm:hidden' : 'sm:block sm:space-y-2'
                }`}
              >
                {compactDoorGodRows.map((item) => (
                  <div
                    className="rounded-full border border-[var(--border-soft)] bg-black/10 px-2 py-1 sm:flex sm:items-center sm:justify-between sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0"
                    key={item.label}
                  >
                    <dt className="text-[var(--text-muted)]">{item.label}</dt>
                    <dd className="font-medium text-[var(--text-primary)]">{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <></>
            )}

            {shouldRenderExpanded ? (
              <dl
                className={`border-t border-[var(--border-soft)] ${
                  shouldUseComfortableDetailPanelLayout
                    ? 'grid grid-cols-1 gap-2.5 pt-4 text-xs sm:grid-cols-2 sm:gap-2 sm:pt-4 sm:text-[11px]'
                    : 'grid grid-cols-2 gap-2 pt-3 text-[10px] sm:pt-4 sm:text-[11px]'
                } ${
                  detailMode === 'adaptive' ? 'hidden sm:grid' : ''
                }`}
                data-testid={
                  shouldUseComfortableDetailPanelLayout
                    ? `${testId}-expanded-details`
                    : undefined
                }
              >
                {expandedDetailRows.map((item) => (
                  <div
                    className={`rounded-[0.95rem] border border-[var(--border-soft)] bg-black/10 ${
                      shouldUseComfortableDetailPanelLayout
                        ? 'flex items-start justify-between gap-3 px-3 py-2.5 sm:min-h-[4.4rem] sm:flex-col sm:justify-between sm:px-2 sm:py-1.5'
                        : 'flex min-h-[4.4rem] flex-col justify-between px-2 py-1.5'
                    }`}
                    key={item.label}
                  >
                    <dt
                      className={`text-[var(--text-muted)] ${
                        shouldUseComfortableDetailPanelLayout
                          ? 'shrink-0 text-[11px] uppercase tracking-[0.16em]'
                          : ''
                      }`}
                    >
                      {item.label}
                    </dt>
                    <dd
                      className={`font-medium text-[var(--text-primary)] ${
                        shouldUseComfortableDetailPanelLayout
                          ? 'text-right text-sm leading-6 break-words sm:mt-1.5 sm:text-left sm:text-[13px] sm:leading-5'
                          : 'mt-1.5 leading-5'
                      }`}
                    >
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {patternNames.length > 0 ? (
              <div
                className={`flex-wrap border-t border-[var(--border-soft)] ${
                  shouldUseComfortableDetailPanelLayout ? 'gap-2.5 pt-3' : 'gap-2 pt-2'
                } ${
                  shouldShowExpandedAnnotationDetails ? 'flex' : 'hidden sm:flex'
                }`}
              >
                {patternNames.map((patternName) => (
                  <button
                    className={`rounded-full border border-[var(--border-strong)] bg-black/10 text-[var(--text-primary)] transition hover:border-[var(--accent-soft)] ${
                      shouldUseComfortableDetailPanelLayout
                        ? 'px-3 py-1.5 text-[11px] leading-none'
                        : 'px-2.5 py-1 text-xs'
                    }`}
                    key={`${palace.index}-${patternName}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onPatternClick(patternName, palace.position);
                    }}
                    type="button"
                  >
                    {patternName}
                  </button>
                ))}
              </div>
            ) : null}

            {invalidReasonLabel ? (
              <p
                className={`text-[var(--text-muted)] ${
                  shouldUseComfortableDetailPanelLayout
                    ? 'rounded-[0.95rem] border border-[rgba(217,138,59,0.3)] bg-[rgba(217,138,59,0.08)] px-3 py-2.5 text-[11px] leading-6'
                    : 'border-t border-[var(--border-soft)] pt-2 text-xs leading-6'
                } ${
                  shouldShowExpandedAnnotationDetails ? 'block' : 'hidden sm:block'
                }`}
              >
                失效: {invalidReasonLabel}
              </p>
            ) : null}

            {topEvilPatternLabel ? (
              <p
                className={`text-[var(--text-muted)] ${
                  shouldUseComfortableDetailPanelLayout
                    ? 'rounded-[0.95rem] border border-[rgba(189,87,87,0.32)] bg-[rgba(189,87,87,0.08)] px-3 py-2.5 text-[11px] leading-6'
                    : 'border-t border-[var(--border-soft)] pt-2 text-xs leading-6'
                } ${
                  shouldShowExpandedAnnotationDetails ? 'block' : 'hidden sm:block'
                }`}
              >
                凶格: {topEvilPatternLabel}
              </p>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

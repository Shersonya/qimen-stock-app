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
  selectionMode: boolean;
  isFilterSelected: boolean;
  onSelect: (palaceIndex: number) => void;
  onPatternClick: (patternName: string, palacePosition: number) => void;
  onSelectionToggle: (palacePosition: number) => void;
  onSelectionDragStart: () => void;
  onSelectionEnter: (palacePosition: number) => void;
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

export function PalaceCard({
  palace,
  annotation,
  status,
  isSelected,
  selectionMode,
  isFilterSelected,
  onSelect,
  onPatternClick,
  onSelectionToggle,
  onSelectionDragStart,
  onSelectionEnter,
}: PalaceCardProps) {
  const isCenterPalace = palace.position === 5;
  const interactive = status === 'ready';
  const patternNames = annotation?.patternNames ?? [];
  const invalidReasonLabel = annotation?.invalidReasons.join('/') ?? '';
  const detailChips = formatPalaceDetails(palace);

  function handleCardClick() {
    if (!interactive) {
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
      aria-pressed={interactive ? isSelected : undefined}
      className={`group relative h-full overflow-hidden rounded-[1.1rem] border px-3 py-3 text-left transition sm:rounded-[1.25rem] sm:px-4 sm:py-4 ${
        isCenterPalace
          ? 'palace-card-center'
          : 'palace-card-shell'
      } ${
        interactive
          ? 'cursor-pointer hover:-translate-y-0.5'
          : 'cursor-default'
      } ${
        status === 'loading'
          ? isCenterPalace
            ? 'animate-pulse'
            : 'opacity-90'
          : ''
      } ${
        isSelected && interactive
          ? 'ring-1 ring-[var(--accent-strong)] shadow-[var(--shadow-strong)]'
          : ''
      } ${
        isFilterSelected
          ? 'ring-2 ring-[#f0d59a] ring-offset-0'
          : ''
      } ${resolveToneClass(annotation)}`}
      data-pattern-tone={annotation?.tone ?? 'none'}
      data-testid="qimen-palace"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      onPointerDown={() => selectionMode && onSelectionDragStart()}
      onPointerEnter={() => selectionMode && onSelectionEnter(palace.position)}
      role="button"
      tabIndex={interactive ? 0 : -1}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_62%)] opacity-60" />
      <div className="relative flex h-full flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--text-muted)]">
              {palace.name}宫
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">洛书 {palace.position}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {annotation?.isHourPalace ? (
              <span className="rounded-full border border-[var(--accent-strong)] px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-[var(--accent-strong)]">
                时干
              </span>
            ) : null}
            {annotation?.isValueDoorPalace ? (
              <span className="rounded-full border border-[var(--border-strong)] px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                值使
              </span>
            ) : null}
            {isCenterPalace ? (
              <span className="rounded-full border border-[var(--border-strong)] px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-[var(--accent-strong)]">
                局眼
              </span>
            ) : null}
          </div>
        </div>

        {status === 'loading' ? (
          <LoadingLines emphasize={isCenterPalace} />
        ) : (
          <>
            <div className="space-y-1">
              <p className={`font-semibold leading-none text-[var(--text-primary)] ${
                isCenterPalace
                  ? 'text-[1.3rem] sm:text-[2rem]'
                  : 'text-[1.02rem] sm:text-[1.55rem]'
              }`}>
                {palace.star}
              </p>
              <p className="hidden text-xs text-[var(--text-muted)] sm:block">
                {selectionMode
                  ? isFilterSelected
                    ? '已纳入宫位筛选'
                    : '点击或拖过即可加入筛选'
                  : isCenterPalace
                    ? '中宫核心星'
                    : '主星显化'}
              </p>
            </div>

            {detailChips.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
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

            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2 border-t border-[var(--border-soft)] pt-2">
                <dt className="text-[var(--text-muted)]">门</dt>
                <dd className="font-medium text-[var(--text-primary)]">{palace.door}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[var(--text-muted)]">神</dt>
                <dd className="font-medium text-[var(--text-primary)]">{palace.god}</dd>
              </div>
            </dl>

            {patternNames.length > 0 ? (
              <div className="flex flex-wrap gap-2 border-t border-[var(--border-soft)] pt-2">
                {patternNames.map((patternName) => (
                  <button
                    className="rounded-full border border-[var(--border-strong)] bg-black/10 px-2.5 py-1 text-xs text-[var(--text-primary)] transition hover:border-[var(--accent-soft)]"
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
              <p className="border-t border-[var(--border-soft)] pt-2 text-xs leading-6 text-[var(--text-muted)]">
                失效: {invalidReasonLabel}
              </p>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

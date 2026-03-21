'use client';

import { PalaceCard } from '@/components/PalaceCard';
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

        <div className="relative z-10 grid grid-cols-3 gap-2 [grid-template-rows:repeat(3,minmax(8.8rem,auto))]">
          {palaces.map((palace) => (
            <PalaceCard
              annotation={getAnnotation?.(palace)}
              className="min-h-[8.8rem]"
              detailMode="compact"
              interactive
              isFilterSelected={selectedFilterPositions.includes(palace.position)}
              isSelected={selectedPalace?.index === palace.index}
              key={`${palace.index}-${palace.position}-mobile`}
              onPatternClick={onApplyPatternFilter}
              onSelect={onSelectPalace}
              onSelectionDragStart={onSelectionDragStart}
              onSelectionEnter={onSelectionEnter}
              onSelectionToggle={onSelectionToggle}
              palace={palace}
              selectionMode={selectionMode}
              status={status}
              testId={palaceTestId}
            />
          ))}
        </div>
      </div>

      <div
        className="rounded-[1.45rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4"
        data-testid={detailTestId}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mystic-section-label">当前宫位完整信息</p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
              {getSelectedPalaceHeadline(selectedPalace)}
            </h3>
          </div>
          <div className="rounded-full border border-[var(--border-strong)] px-3 py-1 text-xs tracking-[0.18em] text-[var(--accent-strong)]">
            {selectionMode ? '框选模式' : '完整字段'}
          </div>
        </div>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          {selectionMode
            ? '当前处于框选模式，点击上方九宫概览即可加入或移除筛选宫位。'
            : getSelectedPalaceSummary(selectedPalace)}
        </p>
        {selectedPalace ? (
          <div className="mt-4">
            <PalaceCard
              annotation={selectedPalaceAnnotation}
              className="min-h-0"
              detailMode="expanded"
              interactive={false}
              isFilterSelected={selectedFilterPositions.includes(selectedPalace.position)}
              isSelected={false}
              onPatternClick={onApplyPatternFilter}
              onSelect={noop}
              onSelectionDragStart={noop}
              onSelectionEnter={noop}
              onSelectionToggle={noop}
              palace={selectedPalace}
              selectionMode={false}
              status={detailStatus}
              testId={detailCardTestId}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

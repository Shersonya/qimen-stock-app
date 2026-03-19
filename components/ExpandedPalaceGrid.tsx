'use client';

import { PalaceCard } from '@/components/PalaceCard';
import type {
  QimenPalace,
  QimenPatternPalaceAnnotation,
} from '@/lib/contracts/qimen';
import type { BoardViewState } from '@/lib/ui';

type ExpandedPalaceGridProps = {
  palaces: QimenPalace[];
  status?: BoardViewState;
  interactive?: boolean;
  selectedPalaceIndex?: number | null;
  selectionMode?: boolean;
  className?: string;
  testId?: string;
  palaceTestId?: string;
  getAnnotation?: (
    palace: QimenPalace,
  ) => QimenPatternPalaceAnnotation | undefined;
  isFilterSelected?: (palacePosition: number) => boolean;
  onSelect?: (palaceIndex: number) => void;
  onPatternClick?: (patternName: string, palacePosition: number) => void;
  onSelectionToggle?: (palacePosition: number) => void;
  onSelectionEnter?: (palacePosition: number) => void;
  onSelectionDragStart?: () => void;
};

function noop() {}

export function ExpandedPalaceGrid({
  palaces,
  status = 'ready',
  interactive,
  selectedPalaceIndex = null,
  selectionMode = false,
  className = '',
  testId,
  palaceTestId,
  getAnnotation,
  isFilterSelected,
  onSelect = noop,
  onPatternClick = noop,
  onSelectionToggle = noop,
  onSelectionEnter = noop,
  onSelectionDragStart = noop,
}: ExpandedPalaceGridProps) {
  return (
    <div
      className={`grid gap-3 [grid-template-columns:repeat(3,minmax(0,1fr))] [grid-template-rows:repeat(3,minmax(14rem,auto))] ${className}`}
      data-grid-layout="expanded-palace-grid"
      data-testid={testId}
    >
      {palaces.map((palace) => (
        <PalaceCard
          annotation={getAnnotation?.(palace)}
          detailMode="expanded"
          interactive={interactive}
          isFilterSelected={isFilterSelected?.(palace.position) ?? false}
          isSelected={selectedPalaceIndex === palace.index}
          key={`${palace.index}-${palace.position}`}
          onPatternClick={onPatternClick}
          onSelect={onSelect}
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
  );
}

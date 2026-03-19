'use client';

import { useState } from 'react';

import { ExpandedPalaceGrid } from '@/components/ExpandedPalaceGrid';
import { PalaceCard } from '@/components/PalaceCard';
import type { Market } from '@/lib/contracts/qimen';
import { referenceBoards } from '@/lib/reference-boards';
import {
  MARKET_OPTIONS,
  getDefaultPalaceIndex,
  getReferenceBoardKeyFromMarket,
} from '@/lib/ui';

type ReferenceBoardPanelProps = {
  selectedMarket: Market;
  onMarketChange: (market: Market) => void;
};

export function ReferenceBoardPanel({
  selectedMarket,
  onMarketChange,
}: ReferenceBoardPanelProps) {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const reference =
    referenceBoards.find(
      (item) => item.key === getReferenceBoardKeyFromMarket(selectedMarket),
    ) ?? referenceBoards[0] ?? null;
  const [selectedPalaceIndex, setSelectedPalaceIndex] = useState<number | null>(
    getDefaultPalaceIndex(reference?.qimen.palaces ?? []),
  );

  if (!reference) {
    return null;
  }

  const selectedPalace =
    reference.qimen.palaces.find((palace) => palace.index === selectedPalaceIndex) ??
    reference.qimen.palaces[getDefaultPalaceIndex(reference.qimen.palaces)] ??
    null;

  return (
    <aside
      className="mystic-panel overflow-hidden px-4 py-4 sm:px-5 sm:py-5"
      data-testid="reference-board-panel"
    >
      <div className="hidden items-start justify-between gap-3 md:flex">
        <div>
          <p className="mystic-section-label">市场镇盘参考</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
            {reference.title}
          </h3>
        </div>
        <span className="mystic-chip">{reference.datetimeLabel}</span>
      </div>

      <button
        className="flex w-full items-center justify-between gap-3 md:hidden"
        onClick={() => setIsMobileExpanded((current) => !current)}
        type="button"
      >
        <div className="text-left">
          <p className="mystic-section-label">市场镇盘参考</p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            {reference.title}
          </h3>
        </div>
        <span className="mystic-chip">{isMobileExpanded ? '收起' : '展开'}</span>
      </button>

      <div className={`mt-4 ${isMobileExpanded ? 'block' : 'hidden md:block'}`}>
        <div aria-label="市场切换" className="mb-4 grid grid-cols-3 gap-2.5" role="tablist">
          {MARKET_OPTIONS.map((option) => {
            const isActive = option.value === selectedMarket;

            return (
              <button
                aria-selected={isActive}
                className={`rounded-[1rem] border px-3 py-2.5 text-sm font-medium transition xl:py-3 ${
                  isActive
                    ? 'border-[var(--accent-strong)] bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[var(--shadow-strong)]'
                    : 'border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:border-[var(--accent-soft)] hover:text-[var(--text-primary)]'
                }`}
                key={option.value}
                onClick={() => onMarketChange(option.value)}
                role="tab"
                type="button"
              >
                {option.shortLabel}
              </button>
            );
          })}
        </div>
        <div className="md:hidden">
          <span className="mystic-chip">{reference.datetimeLabel}</span>
        </div>
        <div className="mt-4 space-y-4 sm:hidden" data-testid="reference-mobile-layout">
          <div
            className="board-shell relative overflow-hidden rounded-[1.75rem] border border-[var(--border-soft)] p-2"
            data-testid="reference-mobile-overview"
          >
            <div className="pointer-events-none absolute inset-3 rounded-[1.35rem] border border-[var(--border-strong)] opacity-70" />
            <div className="relative grid grid-cols-3 gap-2 [grid-template-rows:repeat(3,minmax(8.8rem,auto))]">
              {reference.qimen.palaces.map((palace) => (
                <PalaceCard
                  annotation={undefined}
                  className="min-h-[8.8rem]"
                  detailMode="compact"
                  interactive
                  isFilterSelected={false}
                  isSelected={selectedPalace?.index === palace.index}
                  key={`${reference.key}-${palace.index}-${palace.position}-mobile`}
                  onPatternClick={() => {}}
                  onSelect={setSelectedPalaceIndex}
                  onSelectionDragStart={() => {}}
                  onSelectionEnter={() => {}}
                  onSelectionToggle={() => {}}
                  palace={palace}
                  selectionMode={false}
                  status="ready"
                  testId="reference-mobile-palace"
                />
              ))}
            </div>
          </div>

          <div
            className="rounded-[1.45rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4"
            data-testid="reference-mobile-detail"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mystic-section-label">当前参考宫位</p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  {selectedPalace ? `${selectedPalace.name}宫 · 洛书 ${selectedPalace.position}` : '待选宫位'}
                </h3>
              </div>
              <span className="mystic-chip">完整字段</span>
            </div>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              点击上方九宫概览，可切换下方参考宫位的完整字段信息。
            </p>
            {selectedPalace ? (
              <div className="mt-4">
                <PalaceCard
                  annotation={undefined}
                  className="min-h-0"
                  detailMode="expanded"
                  interactive={false}
                  isFilterSelected={false}
                  isSelected={false}
                  onPatternClick={() => {}}
                  onSelect={() => {}}
                  onSelectionDragStart={() => {}}
                  onSelectionEnter={() => {}}
                  onSelectionToggle={() => {}}
                  palace={selectedPalace}
                  selectionMode={false}
                  status="idle"
                  testId="reference-mobile-detail-card"
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="hidden sm:block" data-testid="reference-desktop-layout">
          <ExpandedPalaceGrid
            className="mt-4"
            interactive={false}
            palaceTestId="reference-palace"
            palaces={reference.qimen.palaces}
            status="idle"
            testId="reference-desktop-grid"
          />
        </div>
      </div>
    </aside>
  );
}

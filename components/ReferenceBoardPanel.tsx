'use client';

import { useState } from 'react';

import { PalaceCard } from '@/components/PalaceCard';
import type { Market } from '@/lib/contracts/qimen';
import { referenceBoards } from '@/lib/reference-boards';
import { MARKET_OPTIONS, getReferenceBoardKeyFromMarket } from '@/lib/ui';

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
    ) ?? referenceBoards[0];

  if (!reference) {
    return null;
  }

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
        <div
          className="-mx-4 overflow-x-auto pb-2 pl-4 pr-4 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0"
          data-testid="reference-board-scroll"
        >
          <div
            className="board-shell relative mt-4 min-w-[50rem] overflow-hidden rounded-[1.8rem] border border-[var(--border-soft)] p-2.5 sm:min-w-0 sm:p-3"
            data-testid="reference-board-grid"
          >
            <div className="pointer-events-none absolute inset-3 rounded-[1.45rem] border border-[var(--border-strong)] opacity-70" />
            <div className="relative grid grid-cols-3 gap-2 [grid-template-rows:repeat(3,minmax(18rem,auto))] sm:gap-2.5 sm:[grid-template-rows:repeat(3,minmax(22rem,auto))]">
              {reference.qimen.palaces.map((palace) => (
                <PalaceCard
                  annotation={undefined}
                  className="min-h-[18rem] sm:min-h-[22rem]"
                  detailMode="expanded"
                  interactive={false}
                  isFilterSelected={false}
                  isSelected={false}
                  key={`${reference.key}-${palace.index}-${palace.position}`}
                  onPatternClick={() => {}}
                  onSelect={() => {}}
                  onSelectionDragStart={() => {}}
                  onSelectionEnter={() => {}}
                  onSelectionToggle={() => {}}
                  palace={palace}
                  selectionMode={false}
                  status="idle"
                  testId="reference-palace"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

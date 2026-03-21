'use client';

import { useState } from 'react';

import { ExpandedPalaceGrid } from '@/components/ExpandedPalaceGrid';
import { MobilePalaceExplorer } from '@/components/MobilePalaceExplorer';
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
  const [mobileSelection, setMobileSelection] = useState<{
    palaceIndex: number | null;
    referenceKey: string | null;
  }>({
    palaceIndex: getDefaultPalaceIndex(reference?.qimen.palaces ?? []),
    referenceKey: reference?.key ?? null,
  });

  if (!reference) {
    return null;
  }

  const defaultPalaceIndex = getDefaultPalaceIndex(reference.qimen.palaces);
  const selectedPalaceIndex =
    mobileSelection.referenceKey === reference.key
      ? mobileSelection.palaceIndex
      : defaultPalaceIndex;

  function handleMarketChange(market: Market) {
    const nextReference =
      referenceBoards.find(
        (item) => item.key === getReferenceBoardKeyFromMarket(market),
      ) ?? null;

    setMobileSelection({
      palaceIndex: getDefaultPalaceIndex(nextReference?.qimen.palaces ?? []),
      referenceKey: nextReference?.key ?? null,
    });
    onMarketChange(market);
  }

  function handlePalaceSelect(palaceIndex: number | null) {
    setMobileSelection({
      palaceIndex,
      referenceKey: reference.key,
    });
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

      <div
        className={`mt-4 ${isMobileExpanded ? 'block' : 'hidden md:block'}`}
        data-testid="reference-content-panel"
      >
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
                onClick={() => handleMarketChange(option.value)}
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
        <MobilePalaceExplorer
          className="mt-4"
          detailCardTestId="reference-mobile-detail-card"
          detailStatus="idle"
          detailTestId="reference-mobile-detail"
          layoutTestId="reference-mobile-layout"
          onSelectPalace={handlePalaceSelect}
          overviewTestId="reference-mobile-overview"
          palaceTestId="reference-mobile-palace"
          palaces={reference.qimen.palaces}
          selectedPalaceIndex={selectedPalaceIndex}
          status="ready"
        />

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

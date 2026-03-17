'use client';

import Image from 'next/image';
import { useState } from 'react';

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
        <p className="text-sm leading-7 text-[var(--text-secondary)]">
          {reference.description}
        </p>
        <div className="mt-4 overflow-hidden rounded-[1.4rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] p-2">
          <figure className="overflow-hidden rounded-[1.2rem]">
            <Image
              alt={reference.title}
              className="h-auto w-full rounded-[1.2rem]"
              height={1040}
              loading="eager"
              sizes="(min-width: 1280px) 36vw, 100vw"
              src={reference.image}
              width={1200}
            />
          </figure>
        </div>
        <p className="mt-3 text-xs leading-6 tracking-[0.12em] text-[var(--text-muted)]">
          镇盘时间: {reference.datetimeLabel}
        </p>
      </div>
    </aside>
  );
}

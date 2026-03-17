'use client';

import Image from 'next/image';
import { useState } from 'react';

import { referenceBoards } from '@/lib/reference-boards';

export function ReferenceCharts() {
  type ReferenceBoardKey = (typeof referenceBoards)[number]['key'];

  const [activeKey, setActiveKey] = useState<ReferenceBoardKey>(
    referenceBoards[0]?.key ?? 'sh',
  );
  const activeReference =
    referenceBoards.find((reference) => reference.key === activeKey) ??
    referenceBoards[0];

  if (!activeReference) {
    return null;
  }

  return (
    <aside className="space-y-2 xl:sticky xl:top-6">
      <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(20,13,10,0.44),rgba(69,39,27,0.18))] p-2 shadow-[0_18px_34px_rgba(15,10,8,0.16)]">
        <div
          aria-label="参考盘切换"
          className="mb-3 grid grid-cols-3 gap-1.5 rounded-[1.3rem] bg-[rgba(12,8,6,0.24)] p-1.5"
          role="tablist"
        >
          {referenceBoards.map((reference) => {
            const isActive = reference.key === activeReference.key;

            return (
              <button
                key={reference.key}
                aria-controls={`reference-panel-${reference.key}`}
                aria-selected={isActive}
                className={`min-w-0 rounded-full border px-3 py-2.5 text-sm font-semibold tracking-[0.08em] transition ${
                  isActive
                    ? 'border-[#f3dfbd]/48 bg-[linear-gradient(135deg,rgba(255,247,234,0.22),rgba(255,214,142,0.14))] text-[#fff8ef] shadow-[inset_0_1px_0_rgba(255,244,220,0.22),0_10px_20px_rgba(12,8,6,0.18)]'
                    : 'border-transparent bg-transparent text-[#f2e2c4]/82 hover:border-[#f3dfbd]/18 hover:bg-[rgba(255,247,234,0.06)] hover:text-[#fff4df]'
                }`}
                id={`reference-tab-${reference.key}`}
                onClick={() => setActiveKey(reference.key)}
                role="tab"
                type="button"
              >
                {reference.tabLabel}
              </button>
            );
          })}
        </div>
        <figure
          className="overflow-hidden rounded-[1.4rem]"
          id={`reference-panel-${activeReference.key}`}
          role="tabpanel"
        >
          <Image
            alt={activeReference.title}
            className="h-auto w-full rounded-[1.4rem] contrast-[1.02] saturate-[0.9]"
            height={1040}
            loading="eager"
            sizes="(min-width: 1280px) 420px, 100vw"
            src={activeReference.image}
            width={1200}
          />
        </figure>
      </div>
    </aside>
  );
}

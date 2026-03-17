'use client';

import type { QimenPalace } from '@/lib/contracts/qimen';
import type { BoardViewState } from '@/lib/ui';

type PalaceCardProps = {
  palace: QimenPalace;
  status: BoardViewState;
  isSelected: boolean;
  onSelect: (palaceIndex: number) => void;
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

export function PalaceCard({
  palace,
  status,
  isSelected,
  onSelect,
}: PalaceCardProps) {
  const isCenterPalace = palace.position === 5;
  const interactive = status === 'ready';

  return (
    <button
      aria-label={`${palace.name}宫 ${palace.star}`}
      aria-pressed={interactive ? isSelected : undefined}
      className={`group relative h-full overflow-hidden rounded-[1.1rem] border px-3 py-3 text-left transition sm:rounded-[1.25rem] sm:px-4 sm:py-4 ${
        isCenterPalace
          ? 'palace-card-center'
          : 'palace-card-shell'
      } ${
        isSelected && interactive
          ? 'border-[var(--accent-strong)] shadow-[var(--shadow-strong)]'
          : 'border-[var(--border-soft)]'
      } ${
        interactive
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-[var(--accent-soft)]'
          : 'cursor-default'
      } ${
        status === 'loading'
          ? isCenterPalace
            ? 'animate-pulse'
            : 'opacity-90'
          : ''
      }`}
      data-testid="qimen-palace"
      onClick={() => interactive && onSelect(palace.index)}
      type="button"
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
          {isCenterPalace ? (
            <span className="rounded-full border border-[var(--border-strong)] px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-[var(--accent-strong)]">
              局眼
            </span>
          ) : null}
        </div>

        {status === 'loading' ? (
          <LoadingLines emphasize={isCenterPalace} />
        ) : (
          <>
            <div className="space-y-1">
              <p className={`font-semibold leading-none text-[var(--text-primary)] ${
                isCenterPalace
                  ? 'text-[1.7rem] sm:text-[2rem]'
                  : 'text-[1.3rem] sm:text-[1.55rem]'
              }`}>
                {palace.star}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {isCenterPalace ? '中宫核心星' : '主星显化'}
              </p>
            </div>

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
          </>
        )}
      </div>
    </button>
  );
}

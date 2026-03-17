import type { QimenPalace } from '@/api/qimen';

type QimenGridProps = {
  palaces: QimenPalace[];
};

export function QimenGrid({ palaces }: QimenGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3" data-testid="qimen-grid">
      {palaces.map((palace) => (
        <article
          key={`${palace.index}-${palace.position}`}
          className="rounded-3xl border border-vermilion/15 bg-paper p-4 shadow-sm backdrop-blur-sm"
          data-testid="qimen-palace"
        >
          <div className="flex items-baseline justify-between text-ink/70">
            <span className="font-serif text-lg">{palace.name}宫</span>
            <span className="text-xs tracking-[0.22em]">洛书 {palace.position}</span>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl bg-white/70 px-3 py-2">
              <dt className="text-xs uppercase tracking-[0.22em] text-gold">星</dt>
              <dd className="mt-1 text-base font-semibold text-ink">{palace.star}</dd>
            </div>
            <div className="rounded-2xl bg-white/70 px-3 py-2">
              <dt className="text-xs uppercase tracking-[0.22em] text-gold">门</dt>
              <dd className="mt-1 text-base font-semibold text-ink">{palace.door}</dd>
            </div>
            <div className="rounded-2xl bg-white/70 px-3 py-2">
              <dt className="text-xs uppercase tracking-[0.22em] text-gold">神</dt>
              <dd className="mt-1 text-base font-semibold text-ink">{palace.god}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

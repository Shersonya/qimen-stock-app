import type { QimenPalace } from '@/lib/contracts/qimen';

type QimenGridProps = {
  palaces: QimenPalace[];
};

export function QimenGrid({ palaces }: QimenGridProps) {
  return (
    <div
      className="rounded-[1.85rem] border border-gold/22 bg-[linear-gradient(180deg,rgba(31,18,14,0.96),rgba(90,56,31,0.92))] p-2 shadow-[inset_0_1px_0_rgba(252,233,203,0.1)] sm:p-3"
      data-testid="qimen-grid"
    >
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {palaces.map((palace) => (
          <article
            key={`${palace.index}-${palace.position}`}
            className={`min-h-[122px] rounded-[1.3rem] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)] sm:min-h-[136px] sm:p-3.5 ${
              palace.position === 5
                ? 'border-gold/24 bg-[linear-gradient(180deg,rgba(205,170,110,0.5),rgba(125,89,44,0.42))] text-[#f6e6c6]'
                : 'border-gold/20 bg-[linear-gradient(180deg,rgba(251,242,226,0.98),rgba(235,217,182,0.92))] text-ink'
            }`}
            data-testid="qimen-palace"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-serif text-2xl leading-none">{palace.name}</span>
                <span className="ml-1 font-serif text-sm text-current/70">宫</span>
              </div>
              <span className="rounded-full border border-gold/16 bg-black/5 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-gold/90">
                洛书 {palace.position}
              </span>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3 border-b border-gold/14 pb-1.5">
                <dt className="text-[10px] uppercase tracking-[0.28em] text-gold/80">门</dt>
                <dd className="text-[15px] font-semibold tracking-[0.04em]">{palace.door}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-gold/14 pb-1.5">
                <dt className="text-[10px] uppercase tracking-[0.28em] text-gold/80">星</dt>
                <dd className="text-[15px] font-semibold tracking-[0.04em]">{palace.star}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[10px] uppercase tracking-[0.28em] text-gold/80">神</dt>
                <dd className="text-[15px] font-semibold tracking-[0.04em]">{palace.god}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

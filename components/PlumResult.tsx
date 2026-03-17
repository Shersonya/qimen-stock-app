import { ErrorNotice } from '@/components/ErrorNotice';
import type { PlumResult, PlumStage } from '@/lib/contracts/qimen';

type PlumResultProps = {
  plum: PlumResult;
};

function getMovingLineLabel(movingLine: 1 | 2 | 3 | 4 | 5 | 6) {
  switch (movingLine) {
    case 1:
      return '初爻';
    case 2:
      return '二爻';
    case 3:
      return '三爻';
    case 4:
      return '四爻';
    case 5:
      return '五爻';
    case 6:
    default:
      return '上爻';
  }
}

function StageCard({
  label,
  stage,
}: {
  label: string;
  stage: PlumStage;
}) {
  return (
    <article className="rounded-[1.45rem] border border-gold/18 bg-[linear-gradient(180deg,rgba(251,242,226,0.98),rgba(235,217,182,0.92))] p-4 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gold/14 pb-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-gold/90">{label}</p>
          <h3 className="mt-2 font-serif text-2xl text-ink">{stage.name}</h3>
        </div>
        <span className="rounded-full border border-gold/18 bg-vermilion/8 px-3 py-1 text-xs tracking-[0.18em] text-vermilion">
          {stage.code}
        </span>
      </div>
      <dl className="mt-4 space-y-4">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.28em] text-gold/85">卦辞</dt>
          <dd className="mt-2 text-sm leading-7 text-ink/90">
            {stage.words}
          </dd>
          <dd className="mt-2 text-sm leading-7 text-ink/68">
            {stage.whiteWords}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.28em] text-gold/85">象辞</dt>
          <dd className="mt-2 text-sm leading-7 text-ink/90">
            {stage.picture}
          </dd>
          <dd className="mt-2 text-sm leading-7 text-ink/68">
            {stage.whitePicture}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.28em] text-gold/85">卦股及策略</dt>
          <dd className="mt-2 text-sm leading-7 text-ink/82 whitespace-pre-line">
            {stage.stockSuggestion}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.28em] text-gold/85">爻辞</dt>
          <dd className="mt-2 text-sm leading-7 text-ink/82 whitespace-pre-line">
            {stage.yaoci}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function PlumResult({ plum }: PlumResultProps) {
  if (plum.status === 'unavailable') {
    return (
      <div data-testid="plum-unavailable">
        <ErrorNotice
          error={plum}
          title="梅花暂不可用"
        />
      </div>
    );
  }

  const summaryFields = [
    ['起卦依据', '当日开盘价'],
    ['开盘价', plum.priceValue],
    ['上卦数', `${plum.upperNumber}`],
    ['下卦数', `${String(plum.lowerNumber).padStart(2, '0')}`],
    ['动爻', getMovingLineLabel(plum.movingLine)],
    ['本卦', `${plum.upperTrigram}${plum.lowerTrigram}`],
  ] as const;

  return (
    <div className="space-y-5" data-testid="plum-result">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {summaryFields.map(([label, value]) => (
          <article
            key={label}
            className="rounded-[1.35rem] border border-gold/16 bg-[linear-gradient(180deg,rgba(251,242,226,0.98),rgba(235,217,182,0.92))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
          >
            <p className="text-[11px] uppercase tracking-[0.32em] text-gold/90">
              {label}
            </p>
            <p className="mt-3 font-serif text-xl text-ink sm:text-2xl">{value}</p>
          </article>
        ))}
      </div>
      <section className="space-y-4">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-gold/90">
              梅花三卦
            </p>
            <h3 className="mt-1 font-serif text-2xl text-ink">
              开盘价起卦结果
            </h3>
          </div>
          <div className="rounded-full border border-gold/18 bg-vermilion/10 px-3 py-1 text-xs tracking-[0.2em] text-vermilion">
            上卦 {plum.upperTrigram} / 下卦 {plum.lowerTrigram}
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <StageCard label="本卦" stage={plum.original} />
          <StageCard label="互卦" stage={plum.mutual} />
          <StageCard label="变卦" stage={plum.changed} />
        </div>
      </section>
    </div>
  );
}

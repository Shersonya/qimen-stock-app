import type { QimenApiSuccessResponse } from '@/lib/contracts/qimen';

type QimenSummaryProps = {
  result: QimenApiSuccessResponse;
};

function getMarketLabel(market: QimenApiSuccessResponse['stock']['market']) {
  switch (market) {
    case 'SH':
      return '沪市主板';
    case 'SZ':
      return '深市主板';
    case 'CYB':
      return '创业板';
    default:
      return market;
  }
}

const summaryFields = (result: QimenApiSuccessResponse) => [
  ['股票', `${result.stock.name} (${result.stock.code})`],
  ['市场', getMarketLabel(result.stock.market)],
  ['上市时间', `${result.stock.listingDate} ${result.stock.listingTime}`],
  ['时间来源', result.stock.timeSource],
  ['阴阳遁', result.qimen.yinYang],
  ['局数', `${result.qimen.ju}局`],
  ['值符星', result.qimen.valueStar],
  ['值使门', result.qimen.valueDoor],
] as const;

export function QimenSummary({ result }: QimenSummaryProps) {
  return (
    <section className="rounded-[2rem] border border-vermilion/10 bg-white/75 p-6 shadow-glow">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-gold">排盘结果</p>
          <h2 className="mt-2 font-serif text-3xl text-ink">上市时家奇门摘要</h2>
        </div>
        <div className="rounded-full border border-gold/30 px-4 py-2 text-sm font-medium text-vermilion">
          {result.qimen.valueStar} / {result.qimen.valueDoor}
        </div>
      </div>
      <dl className="mt-6 grid gap-4 md:grid-cols-2">
        {summaryFields(result).map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-sand bg-sand/35 px-4 py-3"
          >
            <dt className="text-xs uppercase tracking-[0.22em] text-gold">
              {label}
            </dt>
            <dd className="mt-2 text-lg font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

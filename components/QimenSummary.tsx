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

function getTimeSourceLabel(timeSource: QimenApiSuccessResponse['stock']['timeSource']) {
  switch (timeSource) {
    case 'actual':
      return '上市时刻来自真实数据';
    case 'default':
    default:
      return '上市时刻缺失，按默认 09:30 起盘';
  }
}

export function QimenSummary({ result }: QimenSummaryProps) {
  const summaryFields = [
    ['阴阳遁', result.qimen.yinYang],
    ['局数', `${result.qimen.ju}局`],
    ['值符星', result.qimen.valueStar],
    ['值使门', result.qimen.valueDoor],
  ] as const;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <article className="rounded-[1.45rem] border border-gold/22 bg-[linear-gradient(180deg,rgba(30,19,15,0.96),rgba(66,40,25,0.94))] p-4 text-[#f8eedb] shadow-[inset_0_1px_0_rgba(255,238,213,0.12)] xl:col-span-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-serif text-2xl text-[#fff6e7]">
            {result.stock.name} ({result.stock.code})
          </h3>
          <span className="rounded-full border border-gold/24 bg-vermilion/18 px-3 py-1 text-xs tracking-[0.18em] text-[#f6d9ae]">
            起局标的
          </span>
        </div>
        <p className="mt-2 text-sm text-[#f3dfbd]/76">
          {getMarketLabel(result.stock.market)}
        </p>
        <p className="mt-4 text-sm font-medium text-[#fff2d9]">
          上市时间 {result.stock.listingDate} {result.stock.listingTime}
        </p>
        <p className="mt-1 text-xs leading-5 text-[#e4c693]/72">
          {getTimeSourceLabel(result.stock.timeSource)}
        </p>
      </article>
      {summaryFields.map(([label, value]) => (
        <article
          key={label}
          className="rounded-[1.35rem] border border-gold/16 bg-[linear-gradient(180deg,rgba(247,236,214,0.98),rgba(227,203,159,0.9))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
        >
          <p className="text-[11px] uppercase tracking-[0.32em] text-gold/90">
            {label}
          </p>
          <p className="mt-3 font-serif text-xl text-ink sm:text-2xl">{value}</p>
        </article>
      ))}
    </div>
  );
}

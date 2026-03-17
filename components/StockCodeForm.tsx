'use client';

type StockCodeFormProps = {
  stockCode: string;
  recentStockCodes: string[];
  isSubmitting: boolean;
  onStockCodeChange: (stockCode: string) => void;
  onRecentStockCodeSelect: (stockCode: string) => void;
  onSubmit: (stockCode: string) => Promise<void>;
};

const sampleCodes = ['600519', '000001', '300750'] as const;

export function StockCodeForm({
  stockCode,
  recentStockCodes,
  isSubmitting,
  onStockCodeChange,
  onRecentStockCodeSelect,
  onSubmit,
}: StockCodeFormProps) {
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(stockCode);
  }

  return (
    <section className="rounded-[1.9rem] border border-gold/20 bg-[linear-gradient(180deg,rgba(250,242,226,0.95),rgba(236,217,180,0.86))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] sm:p-6">
      <div className="flex flex-col gap-4 border-b border-gold/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.42em] text-gold/90">
            启盘法坛
          </p>
          <h1 className="mt-3 font-serif text-[2.25rem] leading-none text-ink sm:text-[3.35rem]">
            股票奇门排盘
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink/72 sm:text-[15px]">
            输入 A 股代码，以真实上市日期起局，并与沪市、深市、创业板固定参考盘对照。
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-vermilion/20 bg-vermilion/10 px-4 py-2 text-xs tracking-[0.18em] text-vermilion sm:self-auto sm:text-sm">
          <span className="h-2 w-2 rounded-full bg-vermilion" />
          朱印时辰 09:30
        </div>
      </div>
      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
          <label className="block">
            <span className="text-sm font-medium text-ink/80">股票代码</span>
            <input
              className="mt-2 w-full rounded-[1.4rem] border border-gold/20 bg-[#fff8ed] px-4 py-4 text-lg tracking-[0.18em] text-ink outline-none transition focus:border-vermilion focus:bg-white focus:shadow-[0_0_0_4px_rgba(138,47,36,0.1)]"
              inputMode="numeric"
              maxLength={6}
              name="stockCode"
              onChange={(event) =>
                onStockCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder="请输入 6 位代码，例如 600519"
              value={stockCode}
            />
          </label>
          <button
            className="w-full rounded-[1.4rem] border border-[#c18d3e] bg-[linear-gradient(135deg,#8d2d21,#5f1913)] px-5 py-4 text-lg font-semibold text-[#fff5e2] shadow-[0_20px_44px_rgba(19,10,8,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? '排盘中...' : '开始奇门排盘'}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.32em] text-gold/85">
            常用样例
          </span>
          {sampleCodes.map((code) => (
            <button
              key={code}
              className="rounded-full border border-gold/20 bg-[#fff8ed]/80 px-4 py-2 text-sm text-ink transition hover:border-vermilion hover:bg-white hover:text-vermilion"
              onClick={() => onStockCodeChange(code)}
              type="button"
            >
              样例 {code}
            </button>
          ))}
        </div>
        {recentStockCodes.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-gold/12 pt-4">
            <span className="text-[11px] uppercase tracking-[0.32em] text-gold/85">
              最近查询
            </span>
            {recentStockCodes.map((code) => (
              <button
                key={code}
                className="rounded-full border border-vermilion/16 bg-vermilion/8 px-4 py-2 text-sm text-ink transition hover:border-vermilion hover:bg-white hover:text-vermilion disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                onClick={() => onRecentStockCodeSelect(code)}
                type="button"
              >
                {code}
              </button>
            ))}
          </div>
        ) : null}
      </form>
    </section>
  );
}

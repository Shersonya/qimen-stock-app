'use client';

import { useState } from 'react';

type StockCodeFormProps = {
  isSubmitting: boolean;
  onSubmit: (stockCode: string) => Promise<void>;
};

const sampleCodes = ['600519', '000001', '300750'] as const;

export function StockCodeForm({
  isSubmitting,
  onSubmit,
}: StockCodeFormProps) {
  const [stockCode, setStockCode] = useState('600519');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(stockCode);
  }

  return (
    <section className="rounded-[2rem] border border-vermilion/10 bg-white/80 p-6 shadow-glow">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-gold">输入区域</p>
          <h2 className="mt-2 font-serif text-3xl text-ink">股票代码起盘</h2>
        </div>
        <div className="rounded-full border border-gold/30 px-4 py-2 text-sm text-vermilion">
          默认按上市日 09:30 起盘
        </div>
      </div>
      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-ink/80">股票代码</span>
          <input
            className="mt-2 w-full rounded-2xl border border-sand bg-sand/30 px-4 py-4 text-lg tracking-[0.18em] text-ink outline-none transition focus:border-vermilion focus:bg-white"
            inputMode="numeric"
            maxLength={6}
            name="stockCode"
            onChange={(event) =>
              setStockCode(event.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder="请输入 6 位代码，例如 600519"
            value={stockCode}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          {sampleCodes.map((code) => (
            <button
              key={code}
              className="rounded-full border border-gold/25 px-4 py-2 text-sm text-ink transition hover:border-vermilion hover:text-vermilion"
              onClick={() => setStockCode(code)}
              type="button"
            >
              样例 {code}
            </button>
          ))}
        </div>
        <button
          className="w-full rounded-2xl bg-vermilion px-5 py-4 text-lg font-semibold text-white transition hover:bg-[#73271f] disabled:cursor-not-allowed disabled:bg-vermilion/60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? '排盘中...' : '开始奇门排盘'}
        </button>
      </form>
    </section>
  );
}

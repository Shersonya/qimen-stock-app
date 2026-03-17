'use client';

import type { Market } from '@/lib/contracts/qimen';
import { SAMPLE_CODES_BY_MARKET, getMarketDescription, getMarketShortLabel } from '@/lib/ui';

type QueryPanelProps = {
  stockCode: string;
  recentStockCodes: string[];
  selectedMarket: Market;
  isSubmitting: boolean;
  onStockCodeChange: (stockCode: string) => void;
  onRecentStockCodeSelect: (stockCode: string) => void;
  onSampleCodeSelect: (stockCode: string) => void;
  onSubmit: (stockCode: string) => Promise<void>;
};

export function QueryPanel({
  stockCode,
  recentStockCodes,
  selectedMarket,
  isSubmitting,
  onStockCodeChange,
  onRecentStockCodeSelect,
  onSampleCodeSelect,
  onSubmit,
}: QueryPanelProps) {
  const sampleCodes = SAMPLE_CODES_BY_MARKET[selectedMarket];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(stockCode);
  }

  return (
    <section
      className="mystic-panel-strong relative overflow-hidden px-5 py-5 sm:px-6 sm:py-6"
      data-testid="query-panel"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,217,143,0.18),transparent_72%)]" />
      <div className="relative">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-5">
          <div className="space-y-3">
            <p className="mystic-section-label">起局入口</p>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <h1 className="text-[2.2rem] leading-none text-[var(--text-primary)] sm:text-[3.1rem]">
                  股票奇门排盘分析
                </h1>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                  从 {getMarketShortLabel(selectedMarket)} 气场切入，输入 A 股代码后起奇门盘，再以梅花卦和镇盘参考辅助判断节奏。
                </p>
              </div>
              <div className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 py-2 text-sm text-[var(--accent-strong)]">
                朱印时辰 09:30
              </div>
            </div>
            <p className="text-xs leading-6 tracking-[0.08em] text-[var(--text-muted)]">
              当前市场提示: {getMarketDescription(selectedMarket)}
            </p>
          </div>
        </div>

        <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px] xl:items-end">
            <label className="block">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                股票代码
              </span>
              <input
                className="mystic-input mt-2"
                inputMode="numeric"
                maxLength={6}
                name="stockCode"
                onChange={(event) =>
                  onStockCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder={`输入 6 位 ${getMarketShortLabel(selectedMarket)} 股票代码`}
                value={stockCode}
              />
            </label>
            <button
              aria-label="开始排盘分析"
              className="mystic-button-primary w-full"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? '起局中...' : '开盘问局'}
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-[1.35rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
              <p className="mystic-section-label">市场样例</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sampleCodes.map((code) => (
                  <button
                    key={code}
                    className="mystic-chip"
                    onClick={() => onSampleCodeSelect(code)}
                    type="button"
                  >
                    样例 {code}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-4">
              <p className="mystic-section-label">最近查询</p>
              <div className="mt-3 flex min-h-[44px] flex-wrap gap-2">
                {recentStockCodes.length > 0 ? (
                  recentStockCodes.map((code) => (
                    <button
                      key={code}
                      className="mystic-chip"
                      disabled={isSubmitting}
                      onClick={() => onRecentStockCodeSelect(code)}
                      type="button"
                    >
                      {code}
                    </button>
                  ))
                ) : (
                  <span className="text-sm text-[var(--text-muted)]">
                    暂无历史记录，起局后会自动写入本地。
                  </span>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

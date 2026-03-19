'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type { StockSearchItem } from '@/data/stocks';
import { StockSearchInput } from '@/components/StockSearchInput';
import { SAMPLE_CODES_BY_MARKET } from '@/lib/ui';
import {
  findStockByCode,
  formatStockDisplay,
  resolveStock,
} from '@/lib/stockSearch';
import {
  prependRecentStockCode,
  readRecentStockCodes,
  writeRecentStockCodes,
} from '@/lib/recent-stocks';

export function DiagnosisSearchPageClient() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('600519');
  const [selectedStock, setSelectedStock] = useState<StockSearchItem | null>(null);
  const [searchErrorMessage, setSearchErrorMessage] = useState<string | null>(null);
  const [recentStockCodes, setRecentStockCodes] = useState<string[]>(() =>
    typeof window === 'undefined' ? [] : readRecentStockCodes(),
  );

  function openDiagnosis(stockCode: string) {
    const nextRecentCodes = prependRecentStockCode(recentStockCodes, stockCode);

    writeRecentStockCodes(nextRecentCodes);
    setRecentStockCodes(nextRecentCodes);
    router.push(`/diagnosis/${stockCode}`);
  }

  function handleLaunch(stockCode: string) {
    const matched = findStockByCode(stockCode);

    setSelectedStock(matched);
    setInputValue(matched ? formatStockDisplay(matched) : stockCode);
    setSearchErrorMessage(null);
    openDiagnosis(stockCode);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedStock) {
      openDiagnosis(selectedStock.code);
      return;
    }

    const resolution = resolveStock(inputValue);

    if (!resolution.isConfident) {
      setSearchErrorMessage(resolution.errorMessage);
      return;
    }

    setSelectedStock(resolution.stock);
    setInputValue(formatStockDisplay(resolution.stock));
    setSearchErrorMessage(null);
    openDiagnosis(resolution.stock.code);
  }

  return (
    <section className="workbench-page">
      <header className="workbench-page-header">
        <div>
          <p className="mystic-section-label">个股诊断</p>
          <h2>输入代码后进入完整报告</h2>
          <p>专注于五步推演链和交互式排盘，不再把筛选、参考盘和诊断入口堆叠在同一屏。</p>
        </div>
      </header>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="workbench-card">
          <p className="mystic-section-label">诊断入口</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            搜索个股并打开深度报告
          </h3>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                股票代码 / 名称
              </span>
              <StockSearchInput
                errorMessage={searchErrorMessage}
                inputValue={inputValue}
                onErrorMessageChange={setSearchErrorMessage}
                onInputValueChange={setInputValue}
                onSelectedStockChange={setSelectedStock}
                placeholder="输入股票代码、名称或简称"
                selectedStock={selectedStock}
              />
            </label>
            <button
              className="mystic-button-primary w-full"
              data-hotkey-primary="true"
              type="submit"
            >
              打开诊断报告
            </button>
          </form>
        </section>

        <section className="workbench-card">
          <p className="mystic-section-label">最近与样例</p>
          <div className="mt-4 space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">最近查询</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {recentStockCodes.length > 0 ? (
                  recentStockCodes.map((code) => (
                    <button
                      className="mystic-chip"
                      key={code}
                      onClick={() => handleLaunch(code)}
                      type="button"
                    >
                      {code}
                    </button>
                  ))
                ) : (
                  <span className="text-sm text-[var(--text-muted)]">还没有历史记录。</span>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">市场样例</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.values(SAMPLE_CODES_BY_MARKET)
                  .flat()
                  .slice(0, 6)
                  .map((code) => (
                    <button
                      className="mystic-chip"
                      key={code}
                      onClick={() => handleLaunch(code)}
                      type="button"
                    >
                      {code}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

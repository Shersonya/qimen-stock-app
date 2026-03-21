'use client';

import {
  getDemoComparisonTableData,
  getDemoStockPools,
} from '@/lib/demo-fixtures';

type StockPoolPageClientProps = {
  demoMode?: boolean;
};

export function StockPoolPageClient({
  demoMode = false,
}: StockPoolPageClientProps) {
  const pools = getDemoStockPools();
  const activePool = pools[0];
  const comparison = getDemoComparisonTableData();

  return (
    <section className="workbench-page" data-testid="stock-pool-foundation-page">
      <header className="workbench-page-header">
        <div>
          <p className="mystic-section-label">股票池</p>
          <h2>本地股票池与批量诊断占位页</h2>
          <p>
            这一页先固定浏览器本地持久化和诊断对比的契约数据，后续 issue 会把增删改查、
            导入导出和批量诊断交互补全。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="mystic-chip">
            {demoMode ? 'Demo 股票池已加载' : '等待后续 issue 接入'}
          </span>
        </div>
      </header>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <article className="workbench-card" data-testid="stock-pool-foundation-main">
          <p className="mystic-section-label">活跃池</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            {activePool?.name ?? '暂无股票池'}
          </h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="workbench-subcard">
              <p className="mystic-section-label">池内股票</p>
              <strong className="text-2xl text-[var(--text-primary)]">
                {activePool?.stocks.length ?? 0}
              </strong>
            </div>
            <div className="workbench-subcard">
              <p className="mystic-section-label">已剔除</p>
              <strong className="text-2xl text-[var(--text-primary)]">
                {activePool?.removedStocks.length ?? 0}
              </strong>
            </div>
            <div className="workbench-subcard">
              <p className="mystic-section-label">快照时间</p>
              <strong className="text-2xl text-[var(--text-primary)]">
                {comparison.generatedAt}
              </strong>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-3xl border border-white/10 bg-black/10">
            <table className="workbench-settings-table">
              <thead>
                <tr>
                  <th>代码</th>
                  <th>名称</th>
                  <th>来源</th>
                  <th>评级</th>
                </tr>
              </thead>
              <tbody>
                {activePool?.stocks.map((stock) => (
                  <tr key={stock.stockCode}>
                    <td>{stock.stockCode}</td>
                    <td>{stock.stockName}</td>
                    <td>{stock.addReason}</td>
                    <td>{stock.diagnosisResult?.rating ?? '未诊断'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="workbench-card" data-testid="stock-pool-foundation-side">
          <p className="mystic-section-label">诊断对比契约</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            已准备排序表结构
          </h3>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            后续对比表会直接消费这份结构，支持按得分、评级、成功率和风险等级排序。
          </p>
          <ul className="mt-5 space-y-3 text-sm text-[var(--text-secondary)]">
            {comparison.items.map((item) => (
              <li
                className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3"
                key={item.stockCode}
              >
                {item.stockCode} / {item.stockName} / {item.rating} / {item.totalScore} 分
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

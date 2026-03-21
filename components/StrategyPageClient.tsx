'use client';

import { getDemoLimitUpResponse, getDemoTdxScanResponse } from '@/lib/demo-fixtures';

type StrategyPageClientProps = {
  demoMode?: boolean;
};

export function StrategyPageClient({
  demoMode = false,
}: StrategyPageClientProps) {
  const tdxDemo = getDemoTdxScanResponse();
  const limitUpDemo = getDemoLimitUpResponse();

  return (
    <section className="workbench-page" data-testid="strategy-foundation-page">
      <header className="workbench-page-header">
        <div>
          <p className="mystic-section-label">策略选股</p>
          <h2>策略选股与股票池协同入口</h2>
          <p>
            当前阶段先交付共享契约、demo 数据和可验收占位页，后续 issue 会把扫描面板、双
            Tab 交互和实盘 API 逐步接入。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="mystic-chip">
            {demoMode ? 'Demo 验收已启用' : '等待后续 issue 接入'}
          </span>
        </div>
      </header>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="workbench-card" data-testid="strategy-foundation-tdx-card">
          <p className="mystic-section-label">TDX 契约</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            美柱 / 美阳阳扫描
          </h3>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            新增的共享类型已经约定了请求参数、分页响应和单股信号字段，供后续引擎与 API
            直接复用。
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="workbench-subcard">
              <p className="mystic-section-label">信号总数</p>
              <strong className="text-2xl text-[var(--text-primary)]">{tdxDemo.total}</strong>
            </div>
            <div className="workbench-subcard">
              <p className="mystic-section-label">扫描日期</p>
              <strong className="text-2xl text-[var(--text-primary)]">{tdxDemo.scanDate}</strong>
            </div>
            <div className="workbench-subcard">
              <p className="mystic-section-label">分页</p>
              <strong className="text-2xl text-[var(--text-primary)]">
                {tdxDemo.page}/{Math.ceil(tdxDemo.total / tdxDemo.pageSize)}
              </strong>
            </div>
          </div>
          <div className="mt-5 rounded-3xl border border-white/10 bg-black/10 p-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Demo 首条信号: {tdxDemo.items[0]?.stockCode} / {tdxDemo.items[0]?.stockName} /
              强度 {tdxDemo.items[0]?.signalStrength}
            </p>
          </div>
        </article>

        <article className="workbench-card" data-testid="strategy-foundation-limit-card">
          <p className="mystic-section-label">涨停契约</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            近 30 日涨停板筛选
          </h3>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            演示数据已经固定为可复现样本，后续筛选面板会沿用同一响应结构展示排序、分页和
            一键加入股票池动作。
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="workbench-subcard">
              <p className="mystic-section-label">样本数量</p>
              <strong className="text-2xl text-[var(--text-primary)]">{limitUpDemo.total}</strong>
            </div>
            <div className="workbench-subcard">
              <p className="mystic-section-label">回溯天数</p>
              <strong className="text-2xl text-[var(--text-primary)]">
                {limitUpDemo.lookbackDays}
              </strong>
            </div>
            <div className="workbench-subcard">
              <p className="mystic-section-label">筛选日期</p>
              <strong className="text-2xl text-[var(--text-primary)]">
                {limitUpDemo.filterDate}
              </strong>
            </div>
          </div>
          <div className="mt-5 rounded-3xl border border-white/10 bg-black/10 p-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Demo 首条样本: {limitUpDemo.items[0]?.stockCode} / {limitUpDemo.items[0]?.stockName}
              / 涨停 {limitUpDemo.items[0]?.limitUpCount} 次
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

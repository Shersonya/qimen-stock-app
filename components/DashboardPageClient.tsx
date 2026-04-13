'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { EstimatedProgressNotice } from '@/components/EstimatedProgressNotice';
import { ErrorNotice } from '@/components/ErrorNotice';
import { useWorkspaceSettings } from '@/components/providers/WorkspaceSettingsProvider';
import { requestMarketDashboard } from '@/lib/client-api';
import type {
  ApiError,
  MarketDashboardResponse,
} from '@/lib/contracts/qimen';
import { buildDiagnosisPath } from '@/lib/ui';
import { toApiError } from '@/lib/utils/api-error';

function StatusCard({
  data,
}: {
  data: MarketDashboardResponse['marketSignal'];
}) {
  return (
    <article className="workbench-card workbench-hero-card">
      <p className="mystic-section-label">今日市场吉气状态</p>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold text-[var(--text-primary)]">
            {data.statusLabel}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            {data.summary}
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-overlay)] px-4 py-4">
          <p className="mystic-section-label">参考评级</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
            {data.referenceRating}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.referencePatterns.length > 0 ? (
              data.referencePatterns.slice(0, 3).map((pattern, index) => (
                <span className="mystic-chip" key={`${pattern}-${index}`}>
                  {pattern}
                </span>
              ))
            ) : (
              <span className="mystic-chip">暂无 B 级以上吉格</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function DonutHeatChart({
  counts,
}: {
  counts: MarketDashboardResponse['patternHeat'];
}) {
  const actualTotal = counts.COMPOSITE + counts.A + counts.B + counts.C;
  const total = actualTotal || 1;
  const segments = [
    { key: 'COMPOSITE', label: '复合', value: counts.COMPOSITE, color: '#d8b35a' },
    { key: 'A', label: 'A', value: counts.A, color: '#75c6a3' },
    { key: 'B', label: 'B', value: counts.B, color: '#7baef0' },
    { key: 'C', label: 'C', value: counts.C, color: '#77829a' },
  ] as const;
  let accumulator = 0;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;

  return (
    <article className="workbench-card" data-testid="dashboard-heat-chart">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mystic-section-label">全市场吉格热度</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            A / B / C / 复合分布
          </h3>
        </div>
        <span className="mystic-chip">总计 {actualTotal}</span>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-6">
        <svg aria-label="全市场吉格热度环形图" className="h-40 w-40" viewBox="0 0 160 160">
          <circle cx="80" cy="80" fill="none" opacity="0.2" r={radius} stroke="#28313d" strokeWidth="16" />
          {segments.map((segment) => {
            const dashLength = (segment.value / total) * circumference;
            const strokeDasharray = `${dashLength} ${circumference - dashLength}`;
            const strokeDashoffset = -accumulator;

            accumulator += dashLength;

            return (
              <circle
                cx="80"
                cy="80"
                fill="none"
                key={segment.key}
                r={radius}
                stroke={segment.color}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                strokeWidth="16"
                transform="rotate(-90 80 80)"
              />
            );
          })}
          <text fill="#f5ebd7" fontSize="16" textAnchor="middle" x="80" y="76">
            吉格
          </text>
          <text fill="#f5ebd7" fontSize="26" fontWeight="700" textAnchor="middle" x="80" y="104">
            {actualTotal}
          </text>
        </svg>
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          {segments.map((segment) => (
            <div className="workbench-stat-tile" key={segment.key}>
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-sm text-[var(--text-secondary)]">{segment.label}</span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                {segment.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function SectorBarChart({
  items,
}: {
  items: MarketDashboardResponse['topSectors'];
}) {
  const maxValue = items[0]?.count ?? 1;

  return (
    <article className="workbench-card" data-testid="dashboard-sector-chart">
      <p className="mystic-section-label">热点板块分布</p>
      <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
        吉格出现最多的前五行业
      </h3>
      <div className="mt-6 space-y-4">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-[var(--text-secondary)]">{item.label}</span>
                <span className="text-[var(--text-primary)]">{item.count}</span>
              </div>
              <div className="workbench-bar-track">
                <div
                  className="workbench-bar-fill"
                  style={{ width: `${(item.count / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            当前样本源暂不可用，热点板块统计已降级为空。
          </p>
        )}
      </div>
    </article>
  );
}

function QuickActions() {
  return (
    <article className="workbench-card">
      <p className="mystic-section-label">快速操作区</p>
      <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
        一步进入主流程
      </h3>
      <div className="mt-6 grid gap-3">
        <Link
          className="mystic-button-primary text-center"
          data-hotkey-primary="true"
          href="/screen?autostart=1"
        >
          一键全市场扫描
        </Link>
        <Link className="mystic-button-secondary text-center" href="/diagnosis">
          进入个股诊断
        </Link>
        <Link className="mystic-chip justify-center" href="/settings">
          打开系统设置
        </Link>
      </div>
    </article>
  );
}

function DragonHeadStatusCard({
  data,
}: {
  data: MarketDashboardResponse['dragonHead'];
}) {
  return (
    <article className="workbench-card" data-testid="dashboard-dragon-head-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mystic-section-label">龙头博弈状态</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            {data.aiAdviceEnabled ? 'AI 建议可用' : 'AI 建议暂停'}
          </h3>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">{data.summary}</p>
        </div>
        <span className="mystic-chip">指令 {data.trendSwitch.instruction}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="workbench-stat-tile">
          <span className="text-sm text-[var(--text-secondary)]">新主线</span>
          <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
            {data.positionAllocation.newLeaderPercent}%
          </p>
        </div>
        <div className="workbench-stat-tile">
          <span className="text-sm text-[var(--text-secondary)]">老核心</span>
          <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
            {data.positionAllocation.oldCorePercent}%
          </p>
        </div>
        <div className="workbench-stat-tile">
          <span className="text-sm text-[var(--text-secondary)]">最高标</span>
          <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
            {data.positionAllocation.topBoardPercent}%
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-[1rem] border border-white/10 bg-white/5 p-4 text-sm text-[var(--text-secondary)]">
        <p>{data.trendSwitch.summary}</p>
        <p className="mt-2">
          熔断 {data.circuitBreaker.triggered ? '已触发' : '未触发'} / 数据源{' '}
          {data.sourceStatus.filter((item) => item.available).length}/{data.sourceStatus.length}
        </p>
      </div>
    </article>
  );
}

export function DashboardPageClient() {
  const pathname = usePathname();
  const { patternConfigOverride, riskConfigOverride, dragonHeadConfigOverride } =
    useWorkspaceSettings();
  const [data, setData] = useState<MarketDashboardResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);

      try {
        const nextData = await requestMarketDashboard({
          patternConfigOverride,
          riskConfigOverride,
          dragonHeadConfigOverride,
        });

        if (!cancelled) {
          setData(nextData);
          setError(null);
        }
      } catch (nextError) {
        if (!cancelled) {
          setData(null);
          setError(toApiError(nextError, 'API_ERROR', '仪表盘加载失败，请稍后重试。'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [dragonHeadConfigOverride, patternConfigOverride, riskConfigOverride]);

  const topStocks = useMemo(() => data?.topStocks ?? [], [data]);

  return (
    <section className="workbench-page">
      <header className="workbench-page-header">
        <div>
          <p className="mystic-section-label">市场仪表盘</p>
          <h2>奇门吉气总览</h2>
          <p>围绕当前市场局、吉格热度和板块分布快速判断今天是否值得进入筛选主流程。</p>
        </div>
        {data ? (
          <div className="mystic-chip">
            更新于 {new Date(data.updatedAt).toLocaleString('zh-CN', { hour12: false })}
          </div>
        ) : null}
      </header>

      {error ? (
        <div className="mt-6">
          <ErrorNotice error={error} title="仪表盘加载失败" />
        </div>
      ) : null}

      {isLoading && !data ? (
        <div className="workbench-card mt-6">
          <EstimatedProgressNotice
            description="正在汇总市场吉格热度、板块分布和高分样本，首屏会在数据返回后自动刷新。"
            expectedDurationMs={6000}
            expectedRangeLabel="4-8 秒"
            testId="dashboard-progress"
            title="市场仪表盘加载中"
          />
        </div>
      ) : null}

      {data ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.85fr)]">
          <div className="space-y-6">
            {data.cache.notice ? (
              <div className="rounded-[1.25rem] border border-[rgba(216,179,90,0.35)] bg-[rgba(216,179,90,0.12)] px-4 py-4 text-sm text-[var(--text-primary)]">
                {data.cache.notice}
              </div>
            ) : null}
            <StatusCard data={data.marketSignal} />
            <DragonHeadStatusCard data={data.dragonHead} />
            <div className="grid gap-6 xl:grid-cols-2">
              <DonutHeatChart counts={data.patternHeat} />
              <SectorBarChart items={data.topSectors} />
            </div>
          </div>

          <div className="space-y-6">
            <QuickActions />
            <article className="workbench-card" data-testid="dashboard-top-stocks">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="mystic-section-label">高分标的</p>
                  <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    今日优先跟踪
                  </h3>
                </div>
                <span className="mystic-chip">样本 {data.universeSize}</span>
              </div>
              <div className="mt-4 space-y-3">
                {topStocks.length > 0 ? (
                  topStocks.map((item) => (
                    <div className="workbench-list-row" key={item.code}>
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">
                          {item.name}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {item.code}
                          {item.sector ? ` · ${item.sector}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[var(--text-primary)]">
                          {item.rating} / {item.totalScore}
                        </p>
                        <Link
                          className="mystic-chip mt-2 inline-flex"
                          href={buildDiagnosisPath(item.code, pathname)}
                        >
                          查看诊断
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">
                    当前没有可展示的高分样本，等全市场样本源恢复后会自动刷新。
                  </p>
                )}
              </div>
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}

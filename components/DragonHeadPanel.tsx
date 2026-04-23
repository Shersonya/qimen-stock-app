'use client';

import { useMemo, useState } from 'react';

import { ErrorNotice } from '@/components/ErrorNotice';
import { EstimatedProgressNotice } from '@/components/EstimatedProgressNotice';
import { requestDragonHeadCandidates, requestDragonHeadMonitor } from '@/lib/client-api';
import type {
  DragonHeadCandidate,
  DragonHeadMode,
  DragonHeadMonitorResponse,
  DragonHeadProviderName,
  DragonHeadProviderStatus,
  DragonHeadSettings,
} from '@/lib/contracts/dragon-head';
import type { ApiError } from '@/lib/contracts/qimen';
import { toApiError } from '@/lib/utils/api-error';

type DragonHeadPanelProps = {
  demoMode?: boolean;
  activePoolName?: string;
  poolStockCodes?: string[];
  dragonHeadConfig: DragonHeadSettings;
  mockMode?: DragonHeadMode;
  onAddStock?: (item: DragonHeadCandidate) => void;
  onAddAllStocks?: (items: DragonHeadCandidate[]) => void;
};

function formatProviderStatus(data: DragonHeadMonitorResponse['sourceStatus']) {
  const availableCount = data.filter((item) => item.available).length;

  return `数据源 ${availableCount}/${data.length} 可用`;
}

function getProviderLabel(provider: DragonHeadProviderName) {
  switch (provider) {
    case 'intradayQuote':
      return '盘中行情';
    case 'orderBook':
      return '盘口封单';
    case 'sectorBreadth':
      return '板块广度';
    case 'themeFlow':
      return '题材资金';
    default:
      return provider;
  }
}

function getProviderState(item: DragonHeadProviderStatus) {
  if (!item.available) {
    return {
      label: '不可用',
      className: 'border-rose-400/40 bg-rose-500/10 text-rose-100',
    };
  }

  if (item.degradedReason) {
    return {
      label: '代理/降级',
      className: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
    };
  }

  return {
    label: '可用',
    className: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  };
}

function getScoreQuality(item: DragonHeadCandidate) {
  const missingCount = item.strength.missingFactors.length;
  const hasProxy = item.strength.factorBreakdown.some((factor) => factor.proxy);
  const confidence = item.strength.confidence;

  if (confidence <= 0.45 || missingCount >= 3) {
    return {
      label: '严重缺失',
      detail: `缺失 ${missingCount} 项，需先人工复核`,
      className: 'border-rose-400/40 bg-rose-500/10 text-rose-100',
    };
  }

  if (missingCount > 0) {
    return {
      label: '降级评分',
      detail: `缺失 ${missingCount} 项实时因子`,
      className: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
    };
  }

  if (hasProxy) {
    return {
      label: '代理评分',
      detail: '含代理数据，保留复核',
      className: 'border-sky-400/40 bg-sky-500/10 text-sky-100',
    };
  }

  return {
    label: '完整评分',
    detail: '关键因子已齐备',
    className: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  };
}

function getPoolActionReason(
  item: DragonHeadCandidate,
  poolCodeSet: Set<string>,
): string | null {
  if (poolCodeSet.has(item.stockCode)) {
    return '已在股票池，无需重复加入。';
  }

  if (item.canAddToPool) {
    return null;
  }

  if (item.reviewFlags.length > 0) {
    return item.reviewFlags.join(' / ');
  }

  if (item.strength.missingFactors.length > 0) {
    return `缺失 ${item.strength.missingFactors.join(' / ')}，暂不建议入池。`;
  }

  return '当前评分或风控条件未达到入池阈值。';
}

export function DragonHeadPanel({
  demoMode = false,
  activePoolName,
  poolStockCodes = [],
  dragonHeadConfig,
  mockMode,
  onAddStock,
  onAddAllStocks,
}: DragonHeadPanelProps) {
  const [monitor, setMonitor] = useState<DragonHeadMonitorResponse | null>(null);
  const [candidates, setCandidates] = useState<DragonHeadCandidate[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const poolCodeSet = useMemo(() => new Set(poolStockCodes), [poolStockCodes]);

  async function loadDragonHeadData() {
    setIsLoading(true);
    setError(null);

    try {
      const [nextMonitor, nextCandidates] = await Promise.all([
        requestDragonHeadMonitor({
          mode: mockMode,
          dragonHeadConfigOverride: dragonHeadConfig,
        }),
        requestDragonHeadCandidates({
          mode: mockMode,
          dragonHeadConfigOverride: dragonHeadConfig,
        }),
      ]);

      setMonitor(nextMonitor);
      setCandidates(nextCandidates.items);
    } catch (nextError) {
      setError(toApiError(nextError, 'API_ERROR', '龙头博弈数据加载失败，请稍后重试。'));
    } finally {
      setIsLoading(false);
    }
  }

  const executableCandidates = candidates.filter((item) => item.canAddToPool);

  return (
    <article className="workbench-card" data-testid="dragon-head-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mystic-section-label">龙头博弈</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            主线/情绪监测与候选强度
          </h3>
          <p className="mt-3 max-w-3xl text-sm text-[var(--text-secondary)]">
            固定流程为主线切换监测、强度评分、动态仓位建议，再把可执行候选加入股票池交给奇门继续复核。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="mystic-chip">{demoMode ? 'Demo 模式' : 'Live 降级模式'}</span>
          <span className="mystic-chip">{activePoolName ? `当前池 ${activePoolName}` : '未创建股票池'}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="mystic-button-primary"
          data-hotkey-primary="true"
          onClick={() => void loadDragonHeadData()}
          type="button"
        >
          加载龙头候选
        </button>
        <button
          className="mystic-button-secondary"
          disabled={executableCandidates.length === 0}
          onClick={() => onAddAllStocks?.(executableCandidates)}
          type="button"
        >
          加入全部可执行候选 ({executableCandidates.length})
        </button>
      </div>

      {error ? <ErrorNotice error={error} title="龙头博弈加载失败" /> : null}
      {isLoading ? (
        <EstimatedProgressNotice
          description="正在汇总主线切换、强度评分、熔断与候选观察结果。"
          expectedDurationMs={3500}
          expectedRangeLabel="2-5 秒"
          testId="dragon-head-progress"
          title="龙头博弈生成中"
        />
      ) : null}

      {monitor ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.95fr),minmax(0,1.05fr)]">
          <section className="workbench-card workbench-subcard" data-testid="dragon-head-monitor-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mystic-section-label">市场状态 / 主线切换</p>
                <h4 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  {monitor.aiAdviceEnabled ? 'AI 建议可用' : '熔断已触发'}
                </h4>
              </div>
              <span className="mystic-chip">切换指令 {monitor.trendSwitch.instruction}</span>
            </div>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">{monitor.summary}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="workbench-stat-tile">
                <span className="text-sm text-[var(--text-secondary)]">新题材</span>
                <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  {monitor.newTheme.label}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  首板 {monitor.newTheme.firstBoardCount} / 均分 {monitor.newTheme.averageStrength}
                </p>
              </div>
              <div className="workbench-stat-tile">
                <span className="text-sm text-[var(--text-secondary)]">老主线</span>
                <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  {monitor.oldTheme.label}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  龙头 {monitor.oldTheme.leaderStrength} / 弱化 {monitor.oldTheme.weakDays} 天
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-[1rem] border border-white/10 bg-white/5 p-4 text-sm text-[var(--text-secondary)]">
              <p>{monitor.trendSwitch.summary}</p>
              <p className="mt-2">{formatProviderStatus(monitor.sourceStatus)}</p>
            </div>
            <div
              className="mt-4 grid gap-3 sm:grid-cols-2"
              data-testid="dragon-head-source-status"
            >
              {monitor.sourceStatus.map((item) => {
                const state = getProviderState(item);

                return (
                  <div
                    className="rounded-[1rem] border border-white/10 bg-white/5 p-3 text-sm"
                    key={item.provider}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">
                          {getProviderLabel(item.provider)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {item.source}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-xs ${state.className}`}>
                        {state.label}
                      </span>
                    </div>
                    {item.degradedReason ? (
                      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                        {item.degradedReason}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {monitor.circuitBreaker.triggered ? (
              <div className="mt-4 rounded-[1rem] border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-[var(--text-primary)]">
                {monitor.circuitBreaker.reasons.join(' / ')}
              </div>
            ) : null}
          </section>

          <section className="workbench-card workbench-subcard" data-testid="dragon-head-position-card">
            <p className="mystic-section-label">动态仓位建议</p>
            <h4 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
              新主线 {monitor.positionAllocation.newLeaderPercent}% / 老核心 {monitor.positionAllocation.oldCorePercent}% / 最高标 {monitor.positionAllocation.topBoardPercent}%
            </h4>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {monitor.positionAllocation.reason}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="workbench-stat-tile">
                <span className="text-sm text-[var(--text-secondary)]">跌停家数</span>
                <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  {monitor.circuitBreaker.metrics.limitDownCount}
                </p>
              </div>
              <div className="workbench-stat-tile">
                <span className="text-sm text-[var(--text-secondary)]">昨日涨停今均幅</span>
                <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  {monitor.circuitBreaker.metrics.yesterdayLimitUpAvgReturn}%
                </p>
              </div>
              <div className="workbench-stat-tile">
                <span className="text-sm text-[var(--text-secondary)]">空间板高度</span>
                <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  {monitor.circuitBreaker.metrics.maxBoardHeight}
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {candidates.length > 0 ? (
        <section className="mt-6 workbench-card workbench-subcard" data-testid="dragon-head-candidates-table">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mystic-section-label">龙头候选</p>
              <h4 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                候选强度表
              </h4>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                缺失实时因子会自动记 0，并在 confidence 与复核提示中明确展示。
              </p>
            </div>
            {monitor ? <span className="mystic-chip">{monitor.topBoard.label} / {monitor.topBoard.strength} 分</span> : null}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="workbench-settings-table">
              <thead>
                <tr>
                  <th>股票</th>
                  <th>标签</th>
                  <th>强度 / 信心</th>
                  <th>缺失因子</th>
                  <th>复核</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((item) => (
                  <tr key={item.stockCode}>
                    <td>
                      <div className="font-semibold text-[var(--text-primary)]">
                        {item.stockCode} {item.stockName}
                      </div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">
                        {item.sector ?? item.market} / 现价 {item.latestPrice}
                      </div>
                    </td>
                    <td>{item.signalTags.join(' / ')}</td>
                    <td>
                      <div>{item.strength.score} 分</div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">
                        confidence {item.strength.confidence}
                      </div>
                      {(() => {
                        const quality = getScoreQuality(item);

                        return (
                          <div
                            className={`mt-2 rounded-[0.8rem] border px-2 py-1 text-xs ${quality.className}`}
                          >
                            <span className="font-semibold">{quality.label}</span>
                            <span className="ml-2">{quality.detail}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      {item.strength.missingFactors.length > 0
                        ? item.strength.missingFactors.join(' / ')
                        : '无'}
                    </td>
                    <td>{item.reviewFlags.join(' / ') || '无'}</td>
                    <td>
                      {(() => {
                        const actionReason = getPoolActionReason(item, poolCodeSet);

                        return (
                          <div className="min-w-[8rem]">
                            <button
                              className="mystic-chip"
                              disabled={!item.canAddToPool || poolCodeSet.has(item.stockCode)}
                              onClick={() => onAddStock?.(item)}
                              type="button"
                            >
                              {poolCodeSet.has(item.stockCode) ? '已在股票池' : '加入股票池'}
                            </button>
                            {actionReason ? (
                              <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                                {actionReason}
                              </p>
                            ) : null}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {monitor ? (
        <section className="mt-6 workbench-card workbench-subcard" data-testid="dragon-head-review-card">
          <p className="mystic-section-label">人工复核提醒</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {monitor.manualReviewChecklist.map((item, index) => (
              <span className="mystic-chip" key={`${item}-${index}`}>
                {item}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

'use client';

import type { ApiError } from '@/lib/contracts/qimen';
import type { BatchDiagnosisProgress } from '@/lib/contracts/strategy';
import { ErrorNotice } from '@/components/ErrorNotice';

type BatchDiagnosisPanelProps = {
  selectedCount: number;
  totalCount: number;
  progress: BatchDiagnosisProgress | null;
  isRunning?: boolean;
  error?: ApiError | null;
  staleCount?: number;
  onRunSelected?: () => void;
  onRunAll?: () => void;
};

export function BatchDiagnosisPanel({
  selectedCount,
  totalCount,
  progress,
  isRunning = false,
  error = null,
  staleCount = 0,
  onRunSelected,
  onRunAll,
}: BatchDiagnosisPanelProps) {
  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  return (
    <section className="workbench-card" data-testid="batch-diagnosis-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mystic-section-label">批量诊断</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            串行执行奇门诊断
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            为了避免上游数据源限流，这里固定按单只股票顺序执行。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="mystic-chip"
            disabled={selectedCount === 0 || isRunning}
            onClick={onRunSelected}
            type="button"
          >
            诊断选中 ({selectedCount})
          </button>
          <button
            className="mystic-button-secondary"
            disabled={totalCount === 0 || isRunning}
            onClick={onRunAll}
            type="button"
          >
            诊断整个股票池 ({totalCount})
          </button>
        </div>
      </div>

      {staleCount > 0 ? (
        <div className="mt-5 rounded-3xl border border-[rgba(216,179,90,0.35)] bg-[rgba(92,64,18,0.22)] px-4 py-3 text-sm text-[#f3dfb1]">
          有 {staleCount} 条诊断结果超过 24 小时，建议重新刷新。
        </div>
      ) : null}

      <div className="mt-5 rounded-3xl border border-white/10 bg-black/10 p-4">
        <div className="flex items-center justify-between gap-3 text-sm text-[var(--text-secondary)]">
          <span>当前进度</span>
          <span>
            {progress?.completed ?? 0}/{progress?.total ?? 0}
          </span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#d8b35a,#f0cf8a)] transition-[width]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          {isRunning
            ? `正在诊断 ${progress?.currentStock ?? '...'}，失败 ${progress?.failed ?? 0} 条。`
            : '尚未开始批量诊断。'}
        </p>
      </div>

      {error ? (
        <div className="mt-5">
          <ErrorNotice error={error} title="批量诊断异常" />
        </div>
      ) : null}
    </section>
  );
}

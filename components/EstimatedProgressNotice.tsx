'use client';

import { useEffect, useMemo, useState } from 'react';

type EstimatedProgressNoticeProps = {
  title: string;
  description: string;
  expectedRangeLabel: string;
  expectedDurationMs: number;
  maxProgress?: number;
  initialProgress?: number;
  testId?: string;
  className?: string;
};

export function EstimatedProgressNotice({
  title,
  description,
  expectedRangeLabel,
  expectedDurationMs,
  maxProgress = 92,
  initialProgress = 8,
  testId,
  className,
}: EstimatedProgressNoticeProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const tick = () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      setElapsedMs(now - startTime);
    };

    tick();

    const timer = window.setInterval(tick, 200);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const progress = useMemo(() => {
    const ratio = Math.min(1, elapsedMs / expectedDurationMs);
    const easedRatio = 1 - (1 - ratio) ** 2;

    return Math.min(
      maxProgress,
      initialProgress + (maxProgress - initialProgress) * easedRatio,
    );
  }, [elapsedMs, expectedDurationMs, initialProgress, maxProgress]);

  return (
    <div className={className} data-testid={testId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mystic-section-label">预计进度</p>
          <h4 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{title}</h4>
          <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="mystic-chip">预计 {expectedRangeLabel}</span>
          <span className="mystic-chip">已等待 {(elapsedMs / 1000).toFixed(1)} 秒</span>
        </div>
      </div>

      <div
        aria-label={`${title}预计进度`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(progress)}
        className="mt-4"
        role="progressbar"
      >
        <div className="workbench-bar-track">
          <div
            className="workbench-progress-fill transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
        <span>这是等待预估，不代表服务端真实百分比。</span>
        <span>{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

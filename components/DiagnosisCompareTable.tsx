'use client';

import { useMemo, useState } from 'react';

import type { ComparisonTableData } from '@/lib/contracts/strategy';

type DiagnosisCompareTableProps = {
  data: ComparisonTableData;
};

const SORT_OPTIONS = [
  { id: 'totalScore', label: '得分' },
  { id: 'rating', label: '评级' },
  { id: 'successProbability', label: '成功率' },
  { id: 'riskLevel', label: '风险' },
] as const;

function ratingRank(value: string) {
  switch (value) {
    case 'S':
      return 4;
    case 'A':
      return 3;
    case 'B':
      return 2;
    default:
      return 1;
  }
}

function riskRank(value: string) {
  switch (value) {
    case '低':
      return 3;
    case '中':
      return 2;
    default:
      return 1;
  }
}

export function DiagnosisCompareTable({
  data,
}: DiagnosisCompareTableProps) {
  const [sortBy, setSortBy] = useState<ComparisonTableData['sortBy']>(data.sortBy);

  const items = useMemo(() => {
    return [...data.items].sort((left, right) => {
      switch (sortBy) {
        case 'rating':
          return ratingRank(right.rating) - ratingRank(left.rating);
        case 'successProbability':
          return right.successProbability - left.successProbability;
        case 'riskLevel':
          return riskRank(right.riskLevel) - riskRank(left.riskLevel);
        case 'totalScore':
        default:
          return right.totalScore - left.totalScore;
      }
    });
  }, [data.items, sortBy]);

  return (
    <section className="workbench-card" data-testid="diagnosis-compare-table">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mystic-section-label">诊断对比</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            关键指标排序表
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((option) => (
            <button
              className={`mystic-chip ${sortBy === option.id ? 'border-[#d8b35a] text-[#f4ddb0]' : ''}`}
              key={option.id}
              onClick={() => setSortBy(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-3xl border border-white/10 bg-black/10">
        <table className="workbench-settings-table">
          <thead>
            <tr>
              <th>代码</th>
              <th>名称</th>
              <th>评级</th>
              <th>得分</th>
              <th>风险</th>
              <th>建议</th>
              <th>成功率</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.stockCode}>
                <td>{item.stockCode}</td>
                <td>{item.stockName}</td>
                <td>{item.rating}</td>
                <td>{item.totalScore}</td>
                <td>{item.riskLevel}{item.stale ? ' / 待刷新' : ''}</td>
                <td>{item.actionLabel}</td>
                <td>{item.successProbability}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

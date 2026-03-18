/** @jest-environment node */

import { buildDeepDiagnosisReport } from '@/lib/qimen/deep-diagnosis';
import { generateQimenChart } from '@/lib/qimen/engine';

describe('buildDeepDiagnosisReport', () => {
  it('builds a structured report from an enriched qimen chart', () => {
    const qimen = generateQimenChart(new Date('2001-08-27T09:30:00+08:00'));
    const report = buildDeepDiagnosisReport(
      {
        code: '600519',
        name: '贵州茅台',
      },
      qimen,
    );

    expect(report.basis.stockCode).toBe('600519');
    expect(report.basis.dayGanzhi).toBeTruthy();
    expect(report.coreConclusion).toContain('生门');
    expect(report.useShen).toHaveLength(4);
    expect(report.palaceReadings).toHaveLength(3);
    expect(report.outlooks.map((item) => item.horizon)).toEqual([
      '明日',
      '一周',
      '一月',
      '一季',
    ]);
    expect(report.actionGuide.length).toBeGreaterThan(0);
    expect(report.successProbability).toBeGreaterThanOrEqual(15);
    expect(report.successProbability).toBeLessThanOrEqual(85);
  });
});

/** @jest-environment node */

import { createDiagnosisReportPrintHtml } from '@/lib/diagnosis-report';
import { getDemoQimenResponse } from '@/lib/demo-fixtures';

describe('createDiagnosisReportPrintHtml', () => {
  it('renders a structured five-step printable report', () => {
    const html = createDiagnosisReportPrintHtml(getDemoQimenResponse('600519'));

    expect(html).toContain('第一步：全局定调');
    expect(html).toContain('第二步：用神定位');
    expect(html).toContain('第三步：三宫深度解析');
    expect(html).toContain('第四步：综合决策');
    expect(html).toContain('第五步：最终建议');
    expect(html).toContain('贵州茅台');
  });

  it('escapes unsafe values and falls back when deep diagnosis data is missing', () => {
    const payload = getDemoQimenResponse('600519');
    payload.stock.name = '<script>alert(1)</script>';

    const escapedHtml = createDiagnosisReportPrintHtml(payload);
    const fallbackHtml = createDiagnosisReportPrintHtml({
      ...payload,
      deepDiagnosis: undefined,
    });

    expect(escapedHtml).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapedHtml).not.toContain('<script>alert(1)</script>');
    expect(fallbackHtml).toContain('当前报告缺少深度诊断数据');
  });
});

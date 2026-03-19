import type { QimenApiSuccessResponse } from '@/lib/contracts/qimen';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function createDiagnosisReportPrintHtml(
  result: QimenApiSuccessResponse,
) {
  const diagnosis = result.deepDiagnosis;

  if (!diagnosis) {
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" /><title>诊断报告</title></head><body><p>当前报告缺少深度诊断数据。</p></body></html>`;
  }

  const useShenCards = diagnosis.useShen
    .map(
      (item) => `<div class="card">
        <strong>${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(`${item.value} · ${item.palaceName}${item.palacePosition}宫`)}</p>
        <p>${escapeHtml(item.summary)}</p>
      </div>`,
    )
    .join('');

  const palaceCards = diagnosis.palaceReadings
    .map(
      (item) => `<div class="card">
        <strong>${escapeHtml(`${item.title} · ${item.palaceName}${item.palacePosition}宫`)}</strong>
        <p>${escapeHtml(item.summary)}</p>
        <p>天时: ${escapeHtml(item.tianShi)}</p>
        <p>地利: ${escapeHtml(item.diLi)}</p>
        <p>人和: ${escapeHtml(item.renHe)}</p>
        <p>神助: ${escapeHtml(item.shenZhu)}</p>
        <p>干格: ${escapeHtml(item.stemPattern)}</p>
      </div>`,
    )
    .join('');

  const outlookRows = diagnosis.outlooks
    .map(
      (item) => `<tr><td>${escapeHtml(item.horizon)}</td><td>${escapeHtml(item.trend)}</td><td>${escapeHtml(item.detail)}</td></tr>`,
    )
    .join('');

  return `<!doctype html>
  <html lang="zh-CN">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(`${result.stock.name} 诊断报告`)}</title>
      <style>
        body { font-family: "PingFang SC", "Noto Sans SC", sans-serif; padding: 32px; color: #1c1b1a; }
        h1, h2, h3 { margin: 0 0 12px; }
        p, li { line-height: 1.7; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .card { border: 1px solid #d8ccb7; border-radius: 12px; padding: 14px; background: #faf8f1; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #d8ccb7; padding: 10px; text-align: left; }
        th { background: #f2ecdf; }
        section { margin-top: 28px; }
        ul { margin: 10px 0 0; padding-left: 18px; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(result.stock.name)} (${escapeHtml(result.stock.code)}) 奇门深度诊断报告</h1>
      <p>生成时间: ${escapeHtml(diagnosis.basis.analysisTime)}</p>

      <section>
        <h2>第一步：全局定调</h2>
        <p>${escapeHtml(diagnosis.globalPattern.summary)}</p>
        <p>核心结论: ${escapeHtml(diagnosis.coreConclusion)}</p>
      </section>

      <section>
        <h2>第二步：用神定位</h2>
        <div class="grid">${useShenCards}</div>
      </section>

      <section>
        <h2>第三步：三宫深度解析</h2>
        <div class="grid">${palaceCards}</div>
      </section>

      <section>
        <h2>第四步：综合决策</h2>
        <p>${escapeHtml(diagnosis.actionLabel)}，成功率 ${diagnosis.successProbability}% ，风险等级 ${escapeHtml(diagnosis.riskLevel)}。</p>
        <table>
          <thead>
            <tr><th>周期</th><th>趋势</th><th>要点</th></tr>
          </thead>
          <tbody>${outlookRows}</tbody>
        </table>
      </section>

      <section>
        <h2>第五步：最终建议</h2>
        <ul>${diagnosis.actionGuide
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join('')}</ul>
        <h3>关键应期</h3>
        <ul>${diagnosis.keyTimingHints
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join('')}</ul>
      </section>
    </body>
  </html>`;
}

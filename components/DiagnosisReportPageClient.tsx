'use client';

import { useEffect, useMemo, useState } from 'react';

import { ErrorNotice } from '@/components/ErrorNotice';
import { ExpandedPalaceGrid } from '@/components/ExpandedPalaceGrid';
import { PlumResult } from '@/components/PlumResult';
import { ReferenceBoardPanel } from '@/components/ReferenceBoardPanel';
import { useWorkspaceSettings } from '@/components/providers/WorkspaceSettingsProvider';
import { MobilePalaceExplorer } from '@/components/MobilePalaceExplorer';
import { requestQimenAnalysis } from '@/lib/client-api';
import type {
  ApiError,
  Market,
  QimenApiSuccessResponse,
} from '@/lib/contracts/qimen';
import { createDiagnosisReportPrintHtml } from '@/lib/diagnosis-report';
import { getDefaultPalaceIndex } from '@/lib/ui';
import { toApiError } from '@/lib/utils/api-error';
import {
  prependRecentStockCode,
  readRecentStockCodes,
  writeRecentStockCodes,
} from '@/lib/recent-stocks';
import { useIsMobileViewport } from '@/components/useIsMobileViewport';

function downloadPrintDocument(title: string, html: string) {
  const frame = document.createElement('iframe');

  frame.setAttribute('data-testid', 'diagnosis-print-frame');
  frame.setAttribute('title', title);
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.visibility = 'hidden';

  const cleanup = () => {
    window.setTimeout(() => {
      frame.remove();
    }, 1000);
  };

  document.body.appendChild(frame);
  frame.srcdoc = html;

  if (navigator.userAgent.includes('jsdom')) {
    return;
  }

  frame.addEventListener('load', () => {
    const printWindow = frame.contentWindow;

    if (!printWindow) {
      cleanup();
      return;
    }

    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      // Some browsers or popup-blocking environments may not allow printing.
    }
    cleanup();
  });
}

function StepCard({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="workbench-card workbench-step-card">
      <div className="workbench-step-head">
        <span className="workbench-step-index">{index}</span>
        <div>
          <p className="mystic-section-label">第{index}步</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
            {title}
          </h3>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function DiagnosisReportPageClient({
  stockCode,
}: {
  stockCode: string;
}) {
  const { patternConfigOverride } = useWorkspaceSettings();
  const [result, setResult] = useState<QimenApiSuccessResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPalaceIndex, setSelectedPalaceIndex] = useState<number | null>(null);
  const [auxiliaryTab, setAuxiliaryTab] = useState<'report' | 'auxiliary'>('report');
  const [selectedMarket, setSelectedMarket] = useState<Market>('SH');
  const isMobileViewport = useIsMobileViewport();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);

      try {
        const nextResult = await requestQimenAnalysis({
          stockCode,
          patternConfigOverride,
        });

        if (!cancelled) {
          setResult(nextResult);
          setError(null);
          setSelectedMarket(nextResult.stock.market);
          setSelectedPalaceIndex(getDefaultPalaceIndex(nextResult.qimen.palaces));

          const currentRecentCodes = readRecentStockCodes();
          const nextRecentCodes = prependRecentStockCode(
            currentRecentCodes,
            nextResult.stock.code,
          );

          writeRecentStockCodes(nextRecentCodes);
        }
      } catch (nextError) {
        if (!cancelled) {
          setResult(null);
          setError(toApiError(nextError, 'API_ERROR', '诊断加载失败，请稍后重试。'));
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
  }, [patternConfigOverride, stockCode]);

  const selectedPalace = useMemo(() => {
    if (!result) {
      return null;
    }

    return (
      result.qimen.palaces.find((palace) => palace.index === selectedPalaceIndex) ?? null
    );
  }, [result, selectedPalaceIndex]);

  const selectedReading = useMemo(() => {
    if (!result?.deepDiagnosis || !selectedPalace) {
      return null;
    }

    return (
      result.deepDiagnosis.palaceReadings.find(
        (item) => item.palacePosition === selectedPalace.position,
      ) ?? null
    );
  }, [result?.deepDiagnosis, selectedPalace]);

  return (
    <section className="workbench-page">
      {error ? <ErrorNotice error={error} title="诊断加载失败" /> : null}
      {isLoading && !result ? (
        <div className="workbench-card">
          <p className="text-sm text-[var(--text-secondary)]">正在生成个股五步推演报告...</p>
        </div>
      ) : null}

      {result ? (
        <>
          <header className="workbench-page-header">
            <div>
              <p className="mystic-section-label">个股深度诊断</p>
              <h2>
                {result.stock.name} ({result.stock.code})
              </h2>
              <p>
                以上市时刻九宫盘为主盘，围绕全局定调、用神定位、三宫解析、综合决策和最终建议形成完整的五步报告。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="mystic-button-secondary"
                onClick={() =>
                  downloadPrintDocument(
                    `${result.stock.name}-奇门诊断报告`,
                    createDiagnosisReportPrintHtml(result),
                  )
                }
                type="button"
              >
                导出 PDF
              </button>
            </div>
          </header>

          {isMobileViewport ? (
            <section className="mt-6 workbench-card" data-testid="diagnosis-mobile-board">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="mystic-section-label">移动排盘图</p>
                  <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                    {result.qimen.yinYang}遁 {result.qimen.ju}局
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="mystic-chip">值符 {result.qimen.valueStar}</span>
                  <span className="mystic-chip">值使 {result.qimen.valueDoor}</span>
                </div>
              </div>
              <MobilePalaceExplorer
                className="mt-5"
                detailCardTestId="diagnosis-mobile-detail-card"
                detailStatus="ready"
                detailTestId="diagnosis-mobile-detail"
                getAnnotation={(palace) =>
                  result.patternAnalysis.palaceAnnotations.find(
                    (item) => item.palacePosition === palace.position,
                  )
                }
                layoutTestId="diagnosis-mobile-layout"
                onSelectPalace={setSelectedPalaceIndex}
                overviewTestId="diagnosis-mobile-overview"
                palaceTestId="diagnosis-mobile-palace"
                palaces={result.qimen.palaces}
                selectedPalaceIndex={selectedPalace?.index ?? null}
                status="ready"
              />
            </section>
          ) : (
            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
              <section className="workbench-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="mystic-section-label">交互式排盘图</p>
                    <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                      {result.qimen.yinYang}遁 {result.qimen.ju}局
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="mystic-chip">值符 {result.qimen.valueStar}</span>
                    <span className="mystic-chip">值使 {result.qimen.valueDoor}</span>
                  </div>
                </div>
                <ExpandedPalaceGrid
                  className="mt-5"
                  getAnnotation={(palace) =>
                    result.patternAnalysis.palaceAnnotations.find(
                      (item) => item.palacePosition === palace.position,
                    )
                  }
                  onSelect={setSelectedPalaceIndex}
                  palaces={result.qimen.palaces}
                  selectedPalaceIndex={selectedPalace?.index ?? null}
                  status="ready"
                  testId="diagnosis-palace-grid"
                />
              </section>

              <aside className="workbench-card">
                <p className="mystic-section-label">宫位 Inspector</p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  {selectedPalace
                    ? `${selectedPalace.name}宫 · 洛书 ${selectedPalace.position}`
                    : '等待选中宫位'}
                </h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedPalace ? (
                    <>
                      <span className="mystic-chip">星 {selectedPalace.star}</span>
                      <span className="mystic-chip">门 {selectedPalace.door}</span>
                      <span className="mystic-chip">神 {selectedPalace.god}</span>
                    </>
                  ) : null}
                </div>
                <div className="mt-5 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {selectedReading ? (
                    <>
                      <p>{selectedReading.summary}</p>
                      <p>
                        生克关系:
                        {' '}
                        {selectedReading.relationToDayStemPalace}
                      </p>
                      <p>天时: {selectedReading.tianShi}</p>
                      <p>地利: {selectedReading.diLi}</p>
                      <p>人和: {selectedReading.renHe}</p>
                      <p>神助: {selectedReading.shenZhu}</p>
                    </>
                  ) : (
                    <p>点击上方宫位后，这里会展示完整符号信息和与日干宫的关系。</p>
                  )}
                </div>
              </aside>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="诊断标签">
            <button
              aria-selected={auxiliaryTab === 'report'}
              className={`workbench-tab ${auxiliaryTab === 'report' ? 'is-active' : ''}`}
              onClick={() => setAuxiliaryTab('report')}
              role="tab"
              type="button"
            >
              诊断报告
            </button>
            <button
              aria-selected={auxiliaryTab === 'auxiliary'}
              className={`workbench-tab ${auxiliaryTab === 'auxiliary' ? 'is-active' : ''}`}
              onClick={() => setAuxiliaryTab('auxiliary')}
              role="tab"
              type="button"
            >
              辅助视角
            </button>
          </div>

          {auxiliaryTab === 'report' ? (
            <div className="mt-6 space-y-6" data-testid="diagnosis-report-view">
              <StepCard index={1} title="全局定调">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                    <p>{result.deepDiagnosis?.globalPattern.summary}</p>
                    <p>{result.deepDiagnosis?.coreConclusion}</p>
                  </div>
                  <div className="grid gap-3">
                    <div className="workbench-stat-tile">
                      <p className="mystic-section-label">伏吟 / 反吟</p>
                      <p className="mt-3 text-lg text-[var(--text-primary)]">
                        {result.deepDiagnosis?.globalPattern.isFuyin ? '伏吟' : '非伏吟'}
                        {' / '}
                        {result.deepDiagnosis?.globalPattern.isFanyin ? '反吟' : '非反吟'}
                      </p>
                    </div>
                    <div className="workbench-stat-tile">
                      <p className="mystic-section-label">空亡</p>
                      <p className="mt-3 text-lg text-[var(--text-primary)]">
                        日空 {result.deepDiagnosis?.globalPattern.rikong}
                        {' / '}
                        时空 {result.deepDiagnosis?.globalPattern.shikong}
                      </p>
                    </div>
                  </div>
                </div>
              </StepCard>

              <StepCard index={2} title="用神定位">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {result.deepDiagnosis?.useShen.map((item, index) => (
                    <article className="workbench-stat-tile" key={`${item.kind}-${item.palacePosition}-${index}`}>
                      <p className="mystic-section-label">{item.label}</p>
                      <h4 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
                        {item.value}
                      </h4>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {item.palaceName}{item.palacePosition}宫 · {item.direction}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                        {item.summary}
                      </p>
                    </article>
                  ))}
                </div>
              </StepCard>

              <StepCard index={3} title="三宫深度解析">
                <div className="grid gap-4 xl:grid-cols-3">
                  {result.deepDiagnosis?.palaceReadings.map((item, index) => (
                    <article className="workbench-card workbench-subcard" key={`${item.title}-${item.palacePosition}-${index}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="mystic-section-label">{item.role}</p>
                          <h4 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                            {item.title}
                          </h4>
                        </div>
                        <span className="mystic-chip">
                          {item.palaceName}{item.palacePosition}宫
                        </span>
                      </div>
                      <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                        <p><span className="text-[var(--text-primary)]">天：</span>{item.tianShi}</p>
                        <p><span className="text-[var(--text-primary)]">地：</span>{item.diLi}</p>
                        <p><span className="text-[var(--text-primary)]">人：</span>{item.renHe}</p>
                        <p><span className="text-[var(--text-primary)]">神：</span>{item.shenZhu}</p>
                        <p><span className="text-[var(--text-primary)]">格：</span>{item.stemPattern}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </StepCard>

              <StepCard index={4} title="综合决策">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <article className="workbench-card workbench-subcard">
                    <p className="mystic-section-label">买卖建议</p>
                    <h4 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                      {result.deepDiagnosis?.actionLabel}
                    </h4>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="mystic-chip">
                        成功率 {result.deepDiagnosis?.successProbability}%
                      </span>
                      <span className="mystic-chip">
                        风险 {result.deepDiagnosis?.riskLevel}
                      </span>
                    </div>
                    <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                      {result.deepDiagnosis?.decisionRationale.map((item, index) => (
                        <p key={`${index}-${item}`}>{item}</p>
                      ))}
                    </div>
                  </article>

                  <article className="workbench-card workbench-subcard">
                    <p className="mystic-section-label">走势推演时间线</p>
                    <div className="mt-4 space-y-4">
                      {result.deepDiagnosis?.outlooks.map((item, index) => (
                        <div className="workbench-timeline-row" key={`${item.horizon}-${index}`}>
                          <div className="workbench-timeline-dot" />
                          <div className="workbench-timeline-card">
                            <div className="flex items-center justify-between gap-3">
                              <strong className="text-[var(--text-primary)]">{item.horizon}</strong>
                              <span className="mystic-chip">{item.trend}</span>
                            </div>
                            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                              {item.detail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              </StepCard>

              <StepCard index={5} title="最终建议">
                <div className="grid gap-4 xl:grid-cols-2">
                  <article className="workbench-card workbench-subcard">
                    <p className="mystic-section-label">行动指南</p>
                    <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                      {result.deepDiagnosis?.actionGuide.map((item, index) => (
                        <p key={`${index}-${item}`}>{item}</p>
                      ))}
                    </div>
                  </article>

                  <article className="workbench-card workbench-subcard">
                    <p className="mystic-section-label">关键应期提示</p>
                    <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                      {result.deepDiagnosis?.keyTimingHints.map((item, index) => (
                        <p key={`${index}-${item}`}>{item}</p>
                      ))}
                    </div>
                    <p className="mt-4 text-xs leading-6 text-[var(--text-muted)]">
                      {result.deepDiagnosis?.note}
                    </p>
                  </article>
                </div>
              </StepCard>
            </div>
          ) : (
            <div className="mt-6 space-y-6" data-testid="diagnosis-aux-view">
              <section className="workbench-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="mystic-section-label">辅助视角</p>
                    <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                      梅花易数
                    </h3>
                  </div>
                </div>
                <div className="mt-5">
                  <PlumResult plum={result.plum} />
                </div>
              </section>

              <ReferenceBoardPanel
                onMarketChange={setSelectedMarket}
                selectedMarket={selectedMarket}
              />
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

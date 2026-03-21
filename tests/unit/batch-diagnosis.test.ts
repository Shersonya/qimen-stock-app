/** @jest-environment node */

import {
  batchDiagnose,
  generateComparisonTable,
  isDiagnosisStale,
} from '@/lib/services/batch-diagnosis';
import { getStockListingInfo } from '@/lib/services/stock-data';
import { generateQimenChart } from '@/lib/qimen/engine';
import { analyzeStockForMarketScreen } from '@/lib/qimen/analysis';
import { evaluateQimenAuspiciousPatterns } from '@/lib/qimen/auspicious-patterns';
import { buildQimenPatternAnalysis } from '@/lib/qimen/pattern-report';
import { buildDeepDiagnosisReport } from '@/lib/qimen/deep-diagnosis';

jest.mock('@/lib/services/stock-data');
jest.mock('@/lib/qimen/engine');
jest.mock('@/lib/qimen/analysis');
jest.mock('@/lib/qimen/auspicious-patterns');
jest.mock('@/lib/qimen/pattern-report');
jest.mock('@/lib/qimen/deep-diagnosis');

const mockedGetStockListingInfo = jest.mocked(getStockListingInfo);
const mockedGenerateQimenChart = jest.mocked(generateQimenChart);
const mockedAnalyzeStockForMarketScreen = jest.mocked(analyzeStockForMarketScreen);
const mockedEvaluateQimenAuspiciousPatterns = jest.mocked(evaluateQimenAuspiciousPatterns);
const mockedBuildQimenPatternAnalysis = jest.mocked(buildQimenPatternAnalysis);
const mockedBuildDeepDiagnosisReport = jest.mocked(buildDeepDiagnosisReport);

describe('batch diagnosis service', () => {
  beforeEach(() => {
    mockedGetStockListingInfo.mockReset();
    mockedGenerateQimenChart.mockReset();
    mockedAnalyzeStockForMarketScreen.mockReset();
    mockedEvaluateQimenAuspiciousPatterns.mockReset();
    mockedBuildQimenPatternAnalysis.mockReset();
    mockedBuildDeepDiagnosisReport.mockReset();
    mockedGenerateQimenChart.mockReturnValue({} as never);
    mockedAnalyzeStockForMarketScreen.mockReturnValue({
      patternInput: {},
    } as never);
    mockedEvaluateQimenAuspiciousPatterns.mockReturnValue({} as never);
    mockedBuildQimenPatternAnalysis.mockReturnValue({
      rating: 'A',
      totalScore: 81,
    } as never);
    mockedBuildDeepDiagnosisReport.mockReturnValue({
      riskLevel: '中',
      action: 'WATCH',
      actionLabel: '谨慎看多 / 逢低跟踪',
      successProbability: 72,
      coreConclusion: '结构偏强，等待二次确认。',
    } as never);
  });

  it('runs stock diagnoses serially and emits progress updates', async () => {
    mockedGetStockListingInfo
      .mockResolvedValueOnce({
        code: '000001',
        name: '平安银行',
        market: 'SZ',
        listingDate: '1991-04-03',
        listingTime: '09:30',
        timeSource: 'actual',
      })
      .mockResolvedValueOnce({
        code: '600036',
        name: '招商银行',
        market: 'SH',
        listingDate: '2002-04-09',
        listingTime: '09:30',
        timeSource: 'actual',
      });

    const progressSnapshots: number[] = [];
    const results = await batchDiagnose(
      {
        stockCodes: ['000001', '600036'],
      },
      (progress) => {
        progressSnapshots.push(progress.completed);
      },
    );

    expect(results).toHaveLength(2);
    expect(results[0]?.stockCode).toBe('000001');
    expect(results[0]?.stockName).toBe('平安银行');
    expect(results[1]?.stockCode).toBe('600036');
    expect(results[1]?.stockName).toBe('招商银行');
    expect(progressSnapshots).toEqual([0, 1, 1, 2]);
  });

  it('builds comparison rows and marks stale diagnoses', () => {
    const table = generateComparisonTable([
      {
        stockCode: '000001',
        stockName: '平安银行',
        diagnosisTime: '2026-03-18T00:00:00.000Z',
        rating: 'A',
        totalScore: 80,
        riskLevel: '中',
        action: 'WATCH',
        actionLabel: '观察',
        successProbability: 70,
        summary: '等待确认',
      },
      {
        stockCode: '600036',
        stockName: '招商银行',
        diagnosisTime: new Date().toISOString(),
        rating: 'S',
        totalScore: 92,
        riskLevel: '低',
        action: 'BUY',
        actionLabel: '买入',
        successProbability: 85,
        summary: '趋势共振',
      },
    ]);

    expect(table.items[0]?.stockCode).toBe('600036');
    expect(table.items[0]?.stockName).toBe('招商银行');
    expect(table.items[1]?.stale).toBe(true);
    expect(isDiagnosisStale('2026-03-18T00:00:00.000Z', new Date('2026-03-20T12:00:00.000Z'))).toBe(true);
  });
});

import type {
  BatchDiagnosisRequest,
  BatchDiagnosisProgress,
  ComparisonTableData,
  PoolStockDiagnosis,
} from '@/lib/contracts/strategy';
import { getStockListingInfo } from '@/lib/services/stock-data';
import { generateQimenChart } from '@/lib/qimen/engine';
import { analyzeStockForMarketScreen } from '@/lib/qimen/analysis';
import { evaluateQimenAuspiciousPatterns } from '@/lib/qimen/auspicious-patterns';
import { buildQimenPatternAnalysis } from '@/lib/qimen/pattern-report';
import { buildDeepDiagnosisReport } from '@/lib/qimen/deep-diagnosis';

export const DIAGNOSIS_STALE_HOURS = 24;

function toChinaDate(listingDate: string, listingTime: string) {
  return new Date(`${listingDate}T${listingTime}:00+08:00`);
}

function normalizeStockCodes(stockCodes: string[]) {
  return Array.from(
    new Set(
      stockCodes
        .map((stockCode) => stockCode.trim())
        .filter((stockCode) => /^\d{6}$/.test(stockCode)),
    ),
  );
}

async function diagnoseSingleStock(stockCode: string): Promise<PoolStockDiagnosis> {
  const stock = await getStockListingInfo(stockCode);
  const analysisDatetime = toChinaDate(stock.listingDate, stock.listingTime);
  const qimen = generateQimenChart(analysisDatetime);
  const patternSnapshot = analyzeStockForMarketScreen({
    code: stock.code,
    name: stock.name,
    market: stock.market,
    listingDate: stock.listingDate,
  });
  const patternEvaluation = evaluateQimenAuspiciousPatterns(patternSnapshot.patternInput);
  const patternAnalysis = buildQimenPatternAnalysis(qimen, patternEvaluation);
  const deepDiagnosis = buildDeepDiagnosisReport(stock, qimen);

  return {
    stockCode: stock.code,
    stockName: stock.name,
    diagnosisTime: new Date().toISOString(),
    rating: patternAnalysis.rating,
    totalScore: patternAnalysis.totalScore,
    riskLevel: deepDiagnosis.riskLevel,
    action: deepDiagnosis.action,
    actionLabel: deepDiagnosis.actionLabel,
    successProbability: deepDiagnosis.successProbability,
    summary: deepDiagnosis.coreConclusion,
  };
}

export async function batchDiagnose(
  request: BatchDiagnosisRequest,
  onProgress?: (progress: BatchDiagnosisProgress) => void,
): Promise<PoolStockDiagnosis[]> {
  const stockCodes = normalizeStockCodes(request.stockCodes);
  const progress: BatchDiagnosisProgress = {
    total: stockCodes.length,
    completed: 0,
    failed: 0,
    results: [],
  };

  for (const stockCode of stockCodes) {
    progress.currentStock = stockCode;
    onProgress?.({ ...progress, results: [...progress.results] });

    try {
      const result = await diagnoseSingleStock(stockCode);

      progress.results.push(result);
    } catch (error) {
      progress.failed += 1;
      console.warn(`[BatchDiagnosis] Failed to diagnose ${stockCode}:`, error instanceof Error ? error.message : error);
    }

    progress.completed += 1;
    onProgress?.({ ...progress, results: [...progress.results] });
  }

  return [...progress.results];
}

export function isDiagnosisStale(
  diagnosisTime: string,
  now = new Date(),
  thresholdHours = DIAGNOSIS_STALE_HOURS,
) {
  const parsed = Date.parse(diagnosisTime);

  if (!Number.isFinite(parsed)) {
    return true;
  }

  return now.getTime() - parsed > thresholdHours * 60 * 60 * 1000;
}

export function generateComparisonTable(
  results: PoolStockDiagnosis[],
): ComparisonTableData {
  const items = [...results]
    .sort((left, right) => right.totalScore - left.totalScore)
    .map((result) => ({
      stockCode: result.stockCode,
      stockName: result.stockName,
      rating: result.rating,
      totalScore: result.totalScore,
      riskLevel: result.riskLevel,
      action: result.action,
      actionLabel: result.actionLabel,
      successProbability: result.successProbability,
      summary: result.summary,
      diagnosisTime: result.diagnosisTime,
      stale: isDiagnosisStale(result.diagnosisTime),
    }));

  return {
    generatedAt: new Date().toISOString(),
    sortBy: 'totalScore',
    items,
  };
}

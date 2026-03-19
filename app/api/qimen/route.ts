import { NextRequest, NextResponse } from 'next/server';

import type {
  QimenApiRequest,
  QimenApiSuccessResponse,
  PlumResult,
} from '@/lib/contracts/qimen';
import { ERROR_CODES, getErrorMessage } from '@/lib/contracts/qimen';
import { generatePlumAnalysisFromOpenPrice } from '@/lib/plum/engine';
import { generateQimenChart } from '@/lib/qimen/engine';
import { evaluateQimenAuspiciousPatterns } from '@/lib/qimen/auspicious-patterns';
import { analyzeStockForMarketScreen } from '@/lib/qimen/analysis';
import { buildDeepDiagnosisReport } from '@/lib/qimen/deep-diagnosis';
import { buildQimenPatternAnalysis } from '@/lib/qimen/pattern-report';
import { getStockListingInfo } from '@/lib/services/stock-data';
import { getStockOpenPrice } from '@/lib/services/stock-quote';
import { toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

function toChinaDate(listingDate: string, listingTime: string): Date {
  return new Date(`${listingDate}T${listingTime}:00+08:00`);
}

async function getPlumResult(
  stockCode: string,
  market: QimenApiSuccessResponse['stock']['market'],
): Promise<PlumResult> {
  let openPrice: string | null;

  try {
    openPrice = await getStockOpenPrice(stockCode, market);
  } catch {
    return {
      status: 'unavailable',
      code: ERROR_CODES.PLUM_DATA_SOURCE_ERROR,
      message: getErrorMessage(ERROR_CODES.PLUM_DATA_SOURCE_ERROR),
    };
  }

  if (!openPrice) {
    return {
      status: 'unavailable',
      code: ERROR_CODES.PLUM_PRICE_UNAVAILABLE,
      message: getErrorMessage(ERROR_CODES.PLUM_PRICE_UNAVAILABLE),
    };
  }

  return generatePlumAnalysisFromOpenPrice(openPrice);
}

export async function POST(request: NextRequest) {
  try {
    let payload: Partial<QimenApiRequest> = {};

    try {
      payload = (await request.json()) as Partial<QimenApiRequest>;
    } catch {
      payload = {};
    }

    const stock = await getStockListingInfo(payload.stockCode ?? '');
    const analysisDatetime = payload.analysisTime
      ? new Date(payload.analysisTime)
      : toChinaDate(stock.listingDate, stock.listingTime);
    const qimen = generateQimenChart(
      analysisDatetime,
    );
    const plum = await getPlumResult(stock.code, stock.market);
    const patternSnapshot = analyzeStockForMarketScreen({
      code: stock.code,
      name: stock.name,
      market: stock.market,
      listingDate: stock.listingDate,
    });
    const patternEvaluation = evaluateQimenAuspiciousPatterns(
      patternSnapshot.patternInput,
      payload.patternConfigOverride,
    );
    const patternAnalysis = buildQimenPatternAnalysis(qimen, patternEvaluation);
    const deepDiagnosis = buildDeepDiagnosisReport(stock, qimen);

    return NextResponse.json<QimenApiSuccessResponse>({
      stock,
      qimen,
      plum,
      patternAnalysis,
      deepDiagnosis,
    });
  } catch (error) {
    const { statusCode, body } = toErrorResponse(error);

    return NextResponse.json(body, { status: statusCode });
  }
}

import {
  getDemoBacktestResponse,
  getDemoBatchDiagnosisResults,
  getDemoLimitUpResponse,
  getDemoMarketDashboardResponse,
  getDemoMarketScreenResponse,
  getDemoQimenResponse,
  getDemoTdxScanResponse,
  isDemoMode,
} from '@/lib/demo-fixtures';
import {
  ERROR_CODES,
  getErrorMessage,
  isApiErrorResponse,
  type ApiError,
  type BacktestApiSuccessResponse,
  type BacktestRequest,
  type MarketDashboardRequest,
  type MarketDashboardResponse,
  type MarketScreenRequest,
  type MarketScreenSuccessResponse,
  type QimenApiRequest,
  type QimenApiSuccessResponse,
} from '@/lib/contracts/qimen';
import type {
  BatchDiagnosisRequest,
  LimitUpFilterRequest,
  LimitUpFilterResponse,
  PoolStockDiagnosis,
  TdxScanRequest,
  TdxScanResponse,
} from '@/lib/contracts/strategy';

function createFallbackError(): ApiError {
  return {
    code: ERROR_CODES.API_ERROR,
    message: getErrorMessage(ERROR_CODES.API_ERROR),
  };
}

async function postJson<TResponse>(
  input: string,
  body: unknown,
): Promise<TResponse> {
  const response = await fetch(input, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  let payload: TResponse | { error: ApiError } | null = null;

  try {
    payload = (await response.json()) as TResponse | { error: ApiError };
  } catch {
    payload = null;
  }

  if (!payload || !response.ok || isApiErrorResponse(payload)) {
    throw (payload && isApiErrorResponse(payload) ? payload.error : createFallbackError());
  }

  return payload;
}

export async function requestQimenAnalysis(
  request: QimenApiRequest,
): Promise<QimenApiSuccessResponse> {
  if (isDemoMode()) {
    return getDemoQimenResponse(request.stockCode);
  }

  return postJson<QimenApiSuccessResponse>('/api/qimen', request);
}

export async function requestMarketScreen(
  request: MarketScreenRequest,
): Promise<MarketScreenSuccessResponse> {
  if (isDemoMode()) {
    return getDemoMarketScreenResponse();
  }

  return postJson<MarketScreenSuccessResponse>('/api/market-screen', request);
}

export async function requestBacktest(
  request: BacktestRequest,
): Promise<BacktestApiSuccessResponse> {
  if (isDemoMode()) {
    return getDemoBacktestResponse();
  }

  return postJson<BacktestApiSuccessResponse>('/api/backtest', request);
}

export async function requestMarketDashboard(
  request: MarketDashboardRequest,
): Promise<MarketDashboardResponse> {
  if (isDemoMode()) {
    return getDemoMarketDashboardResponse();
  }

  return postJson<MarketDashboardResponse>('/api/market-dashboard', request);
}

export async function requestTdxScan(
  request: TdxScanRequest,
): Promise<TdxScanResponse> {
  if (isDemoMode()) {
    return getDemoTdxScanResponse();
  }

  return postJson<TdxScanResponse>('/api/tdx-scan', request);
}

export async function requestLimitUp(
  request: LimitUpFilterRequest,
): Promise<LimitUpFilterResponse> {
  if (isDemoMode()) {
    return getDemoLimitUpResponse();
  }

  return postJson<LimitUpFilterResponse>('/api/limit-up', request);
}

export async function requestBatchDiagnosis(
  request: BatchDiagnosisRequest,
): Promise<PoolStockDiagnosis[]> {
  if (isDemoMode()) {
    return getDemoBatchDiagnosisResults();
  }

  return postJson<PoolStockDiagnosis[]>('/api/batch-diagnosis', request);
}

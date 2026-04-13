import type {
  Market,
  QimenDeepDiagnosisAction,
  QimenDeepDiagnosisReport,
  QimenStockRating,
} from '@/lib/contracts/qimen';
import type {
  DragonHeadCandidatesRequest,
  DragonHeadCandidatesResponse,
  DragonHeadMonitorRequest,
  DragonHeadMonitorResponse,
} from '@/lib/contracts/dragon-head';
import type { TdxScanResult } from '@/lib/tdx/types';

export type TdxScanRequest = {
  signalType: 'meiZhu' | 'meiYangYang' | 'both';
  requireMaUp?: boolean;
  requireFiveLinesBull?: boolean;
  maxBiasRate?: number;
  minSignalStrength?: number;
  page?: number;
  pageSize?: number;
};

export type TdxScanUniverseSource =
  | 'market_pool'
  | 'limit_up_fallback'
  | 'bundled_market_fallback';

export type TdxScanResponse = {
  total: number;
  page: number;
  pageSize: number;
  scanDate: string;
  items: TdxScanResult[];
  meta: {
    cached: boolean;
    universeSource: TdxScanUniverseSource;
    universeSize: number;
    notice?: string;
  };
};

export type LimitUpStock = {
  stockCode: string;
  stockName: string;
  market: Market;
  limitUpDates: string[];
  limitUpCount: number;
  firstLimitUpDate: string;
  lastLimitUpDate: string;
  latestClose: number;
  latestVolume: number;
  sector?: string;
};

export type LimitUpFilterRequest = {
  lookbackDays?: number;
  minLimitUpCount?: number;
  excludeST?: boolean;
  excludeKechuang?: boolean;
  excludeNewStock?: boolean;
  sortBy?: 'limitUpCount' | 'lastLimitUpDate' | 'latestClose';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

export type LimitUpFilterResponse = {
  total: number;
  page: number;
  pageSize: number;
  filterDate: string;
  lookbackDays: number;
  items: LimitUpStock[];
  meta?: {
    source: 'live' | 'bundled_snapshot';
    generatedAt?: string;
    notice?: string;
  };
};

export type PoolStockDiagnosis = {
  stockCode: string;
  stockName: string;
  diagnosisTime: string;
  rating: QimenStockRating;
  totalScore: number;
  riskLevel: QimenDeepDiagnosisReport['riskLevel'];
  action: QimenDeepDiagnosisAction;
  actionLabel: string;
  successProbability: number;
  summary: string;
};

export type PoolStock = {
  stockCode: string;
  stockName: string;
  market: Market;
  addReason: 'limit_up' | 'tdx_signal' | 'dragon_head' | 'manual';
  addDate: string;
  addSource?: string;
  limitUpCount?: number;
  tdxSignalType?: 'meiZhu' | 'meiYangYang' | 'both';
  dragonHeadTags?: string[];
  diagnosisResult?: PoolStockDiagnosis;
};

export type RemovedStock = {
  stockCode: string;
  stockName: string;
  removeDate: string;
  removeReason: 'manual' | 'expired' | 'stop_loss';
};

export type StockPool = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  stocks: PoolStock[];
  removedStocks: RemovedStock[];
};

export type PoolSnapshot = {
  snapshotId: string;
  poolId: string;
  timestamp: string;
  stockCount: number;
  stocks: PoolStock[];
};

export type BatchDiagnosisRequest = {
  stockCodes: string[];
  poolId?: string;
};

export type BatchDiagnosisProgress = {
  total: number;
  completed: number;
  failed: number;
  currentStock?: string;
  results: PoolStockDiagnosis[];
};

export type ComparisonTableRow = {
  stockCode: string;
  stockName: string;
  rating: QimenStockRating;
  totalScore: number;
  riskLevel: QimenDeepDiagnosisReport['riskLevel'];
  action: QimenDeepDiagnosisAction;
  actionLabel: string;
  successProbability: number;
  summary: string;
  diagnosisTime: string;
  stale: boolean;
};

export type ComparisonTableData = {
  generatedAt: string;
  sortBy: 'totalScore' | 'rating' | 'successProbability' | 'riskLevel';
  items: ComparisonTableRow[];
};

export type { DragonHeadMonitorRequest, DragonHeadMonitorResponse };
export type { DragonHeadCandidatesRequest, DragonHeadCandidatesResponse };

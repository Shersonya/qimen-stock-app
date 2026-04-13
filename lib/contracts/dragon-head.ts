export type DragonHeadMarket = 'SH' | 'SZ' | 'CYB' | 'STAR' | 'BJ';

export type DragonHeadMode =
  | 'live'
  | 'mock_complete'
  | 'mock_degraded'
  | 'mock_breaker';

export type DragonHeadProviderName =
  | 'intradayQuote'
  | 'orderBook'
  | 'sectorBreadth'
  | 'themeFlow';

export type DragonHeadProviderStatus = {
  provider: DragonHeadProviderName;
  asOf: string;
  source: string;
  available: boolean;
  degradedReason?: string;
};

export type DragonHeadFactorKey =
  | 'volumeRatio'
  | 'speed10m'
  | 'driveRatio'
  | 'sealRatio'
  | 'breakoutFreq';

export type DragonHeadFactorBreakdown = {
  key: DragonHeadFactorKey;
  label: string;
  weight: number;
  rawValue: number | null;
  normalized: number;
  contribution: number;
  available: boolean;
  proxy?: boolean;
  note?: string;
};

export type StrengthScoreResult = {
  score: number;
  formulaVersion: string;
  factorBreakdown: DragonHeadFactorBreakdown[];
  missingFactors: DragonHeadFactorKey[];
  confidence: number;
  sourceStatus: DragonHeadProviderStatus[];
};

export type PositionAllocationResult = {
  newLeaderPercent: number;
  oldCorePercent: number;
  topBoardPercent: number;
  forcedFlat: boolean;
  reason: string;
};

export type TrendSwitchInstruction =
  | 'STAY'
  | 'HOLD_NEW'
  | 'SWITCH_OLD'
  | 'TOP_ONLY';

export type TrendSwitchState = {
  instruction: TrendSwitchInstruction;
  newThemeFirstBoardCount: number;
  newThemeAverageStrength: number;
  oldLeaderStrength: number;
  oldLeaderWeakDays: number;
  topBoardStrength: number;
  themeTurnoverGrowthPct: number;
  summary: string;
};

export type DragonHeadCircuitBreakerMetrics = {
  limitDownCount: number;
  yesterdayLimitUpAvgReturn: number;
  maxBoardHeight: number;
};

export type DragonHeadCircuitBreakerStatus = {
  triggered: boolean;
  reasons: string[];
  metrics: DragonHeadCircuitBreakerMetrics;
};

export type DragonHeadCandidate = {
  stockCode: string;
  stockName: string;
  market: DragonHeadMarket;
  sector?: string | null;
  latestPrice: number;
  latestChangePct: number | null;
  boardChangePct: number | null;
  limitUpCount?: number;
  signalTags: string[];
  isNewThemeLeader: boolean;
  isOldCoreLeader: boolean;
  isTopBoard: boolean;
  canAddToPool: boolean;
  reviewFlags: string[];
  strength: StrengthScoreResult;
};

export type DragonHeadMonitorResponse = {
  asOf: string;
  aiAdviceEnabled: boolean;
  summary: string;
  trendSwitch: TrendSwitchState;
  positionAllocation: PositionAllocationResult;
  circuitBreaker: DragonHeadCircuitBreakerStatus;
  newTheme: {
    label: string;
    averageStrength: number;
    firstBoardCount: number;
  };
  oldTheme: {
    label: string;
    leaderStrength: number;
    weakDays: number;
  };
  topBoard: {
    label: string;
    strength: number;
  };
  sourceStatus: DragonHeadProviderStatus[];
  manualReviewChecklist: string[];
};

export type DragonHeadCandidatesResponse = {
  asOf: string;
  total: number;
  aiAdviceEnabled: boolean;
  summary: string;
  items: DragonHeadCandidate[];
  sourceStatus: DragonHeadProviderStatus[];
  manualReviewChecklist: string[];
};

export type DragonHeadStrategyTemplate = {
  deathTrapFilter: {
    midCapTraits: string[];
  };
  panicIndexFormula: string;
  antiHumanTrainingProtocol: string[];
};

export type DragonHeadWeights = Record<DragonHeadFactorKey, number>;

export type DragonHeadThresholds = {
  newLeaderStrong: number;
  oldCoreStrong: number;
  weakLine: number;
  topBoardStrong: number;
  newThemeAverageStrong: number;
  oldLeaderWeakThreshold: number;
  themeTurnoverGrowthPct: number;
  minFirstBoardCount: number;
};

export type DragonHeadCircuitBreakerConfig = {
  enabled: boolean;
  limitDownCount: number;
  yesterdayLimitUpAvgReturn: number;
  maxBoardHeight: number;
};

export type DragonHeadManualSettings = {
  keywordLibrary: string[];
  blacklist: string[];
  weeklyTasks: string[];
  manualReviewChecklist: string[];
};

export type DragonHeadSettings = {
  weights: DragonHeadWeights;
  thresholds: DragonHeadThresholds;
  circuitBreaker: DragonHeadCircuitBreakerConfig;
  manual: DragonHeadManualSettings;
  strategyTemplate: DragonHeadStrategyTemplate;
};

export type DragonHeadMonitorRequest = {
  mode?: DragonHeadMode;
  dragonHeadConfigOverride?: DragonHeadSettings;
};

export type DragonHeadCandidatesRequest = {
  mode?: DragonHeadMode;
  dragonHeadConfigOverride?: DragonHeadSettings;
};

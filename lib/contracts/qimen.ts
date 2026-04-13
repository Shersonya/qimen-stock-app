import type { BacktestDirection, BacktestRunResult } from '@/lib/backtest';
import type { DragonHeadMonitorResponse, DragonHeadSettings } from '@/lib/contracts/dragon-head';

export const DEFAULT_LISTING_TIME = '09:30' as const;
export const DEFAULT_TIME_SOURCE = 'default' as const;

export const ERROR_CODES = {
  INVALID_STOCK_CODE: 'INVALID_STOCK_CODE',
  STOCK_NOT_FOUND: 'STOCK_NOT_FOUND',
  UNSUPPORTED_MARKET: 'UNSUPPORTED_MARKET',
  ST_STOCK_UNSUPPORTED: 'ST_STOCK_UNSUPPORTED',
  DATA_SOURCE_ERROR: 'DATA_SOURCE_ERROR',
  LISTING_DATE_MISSING: 'LISTING_DATE_MISSING',
  PLUM_PRICE_UNAVAILABLE: 'PLUM_PRICE_UNAVAILABLE',
  PLUM_DATA_SOURCE_ERROR: 'PLUM_DATA_SOURCE_ERROR',
  MARKET_FILTER_REQUIRED: 'MARKET_FILTER_REQUIRED',
  MARKET_ENVIRONMENT_UNFAVORABLE: 'MARKET_ENVIRONMENT_UNFAVORABLE',
  API_ERROR: 'API_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
export type Market = 'SH' | 'SZ' | 'CYB' | 'STAR' | 'BJ';
export type TimeSource = 'actual' | 'default';

export type StockListingData = {
  code: string;
  name: string;
  market: Market;
  listingDate: string;
  listingTime: string;
  timeSource: TimeSource;
};

export type QimenPalace = {
  index: number;
  position: number;
  name: string;
  star: string;
  door: string;
  god: string;
  skyGan?: string;
  skyExtraGan?: string | null;
  groundGan?: string;
  groundExtraGan?: string | null;
  outGan?: string | null;
  outExtraGan?: string | null;
  branches?: string[];
  wuxing?: string;
  emptyMarkers?: string[];
};

export type QimenChartMeta = {
  analysisTime: string;
  solarTerm: string;
  xunHead: string;
  xunHeadGan: string;
  yearGanzhi: string;
  monthGanzhi: string;
  dayGanzhi: string;
  hourGanzhi: string;
  rikong: string;
  shikong: string;
  isFuyin: boolean;
  isFanyin: boolean;
  isWubuyushi: boolean;
  valueStarPalace: number;
  valueDoorPalace: number;
};

export type QimenResult = {
  yinYang: '阳' | '阴';
  ju: number;
  valueStar: string;
  valueDoor: string;
  palaces: QimenPalace[];
  meta?: QimenChartMeta;
};

export type QimenDeepDiagnosisAction = 'BUY' | 'WATCH' | 'SELL';

export type QimenDeepDiagnosisBasis = {
  stockCode: string;
  stockName: string;
  analysisTime: string;
  yearGanzhi: string;
  monthGanzhi: string;
  dayGanzhi: string;
  hourGanzhi: string;
};

export type QimenDeepDiagnosisUseShen = {
  kind: 'dayStem' | 'hourStem' | 'shengDoor' | 'valueDoor';
  label: string;
  value: string;
  palacePosition: number;
  palaceName: string;
  direction: string;
  summary: string;
};

export type QimenDeepDiagnosisPalaceReading = {
  title: string;
  role: string;
  palacePosition: number;
  palaceName: string;
  skyGan: string;
  groundGan: string;
  star: string;
  door: string;
  god: string;
  emptyMarkers: string[];
  relationToDayStemPalace: string;
  tianShi: string;
  diLi: string;
  renHe: string;
  shenZhu: string;
  stemPattern: string;
  summary: string;
};

export type QimenDeepDiagnosisOutlook = {
  horizon: '明日' | '一周' | '一月' | '一季';
  trend: '偏多' | '震荡' | '偏空' | '观望';
  detail: string;
};

export type QimenDeepDiagnosisReport = {
  basis: QimenDeepDiagnosisBasis;
  coreConclusion: string;
  action: QimenDeepDiagnosisAction;
  actionLabel: string;
  successProbability: number;
  riskLevel: '低' | '中' | '高';
  firstImpression: string;
  globalPattern: {
    isFuyin: boolean;
    isFanyin: boolean;
    isWubuyushi: boolean;
    rikong: string;
    shikong: string;
    summary: string;
  };
  useShen: QimenDeepDiagnosisUseShen[];
  palaceReadings: QimenDeepDiagnosisPalaceReading[];
  decisionRationale: string[];
  outlooks: QimenDeepDiagnosisOutlook[];
  keyTimingHints: string[];
  actionGuide: string[];
  note: string;
};

export type PlumPriceBasis = 'open';

export type PlumUnavailableCode =
  | typeof ERROR_CODES.PLUM_PRICE_UNAVAILABLE
  | typeof ERROR_CODES.PLUM_DATA_SOURCE_ERROR;

export type PlumStage = {
  code: string;
  name: string;
  words: string;
  whiteWords: string;
  picture: string;
  whitePicture: string;
  stockSuggestion: string;
  yaoci: string;
};

export type PlumReadyResult = {
  status: 'ready';
  priceBasis: PlumPriceBasis;
  priceValue: string;
  upperNumber: number;
  lowerNumber: number;
  movingLine: 1 | 2 | 3 | 4 | 5 | 6;
  upperTrigram: string;
  lowerTrigram: string;
  original: PlumStage;
  mutual: PlumStage;
  changed: PlumStage;
};

export type PlumUnavailableResult = {
  status: 'unavailable';
  code: PlumUnavailableCode;
  message: string;
};

export type PlumResult = PlumReadyResult | PlumUnavailableResult;

export const PALACE_FLAG_OPTIONS = ['空亡', '击刑', '入墓', '门迫'] as const;
export type PalaceFlag = (typeof PALACE_FLAG_OPTIONS)[number];

export const QIMEN_TOP_EVIL_PATTERN_OPTIONS = ['白虎猖狂'] as const;
export type QimenTopEvilPattern =
  (typeof QIMEN_TOP_EVIL_PATTERN_OPTIONS)[number];

export type QimenPatternLevel = 'COMPOSITE' | 'A' | 'B' | 'C';
export type QimenStockRating = 'S' | 'A' | 'B' | 'C';
export type QimenPatternWeightConfig = {
  A: number;
  B: number;
  C: number;
  COMPOSITE: number;
};
export type QimenPatternThresholds = {
  S: number;
  A: number;
  B: number;
};

export type QimenApiRequest = {
  stockCode: string;
  analysisTime?: string;
  patternConfigOverride?: QimenPatternConfigOverride;
};

export const QIMEN_DOOR_OPTIONS = [
  '休门',
  '生门',
  '伤门',
  '杜门',
  '景门',
  '死门',
  '惊门',
  '开门',
] as const;

export const QIMEN_STAR_OPTIONS = [
  '天蓬星',
  '天芮星',
  '天冲星',
  '天辅星',
  '天心星',
  '天柱星',
  '天任星',
  '天英星',
] as const;

export const QIMEN_GOD_OPTIONS = [
  '值符',
  '腾蛇',
  '太阴',
  '六合',
  '白虎',
  '玄武',
  '九地',
  '九天',
] as const;

export const QIMEN_AUSPICIOUS_PATTERN_OPTIONS = [
  '青龙返首',
  '飞鸟跌穴',
  '青龙耀明',
  '青龙转光',
  '天显时格',
  '三奇得使',
  '玉女守门',
  '奇仪相合',
  '门宫和义',
  '三奇贵人升殿',
  '真诈格',
  '天遁格',
  '人遁格',
] as const;

export type QimenPatternTone = 'gold' | 'orange' | 'blue' | 'muted' | 'none';
export type QimenAuspiciousPatternName =
  (typeof QIMEN_AUSPICIOUS_PATTERN_OPTIONS)[number];

export const QIMEN_PATTERN_LIBRARY: Array<{
  name: QimenAuspiciousPatternName;
  defaultLevel: QimenPatternLevel;
  defaultWeight: number;
  meaning: string;
}> = [
  {
    name: '青龙返首',
    defaultLevel: 'A',
    defaultWeight: 10,
    meaning: '主力资金在利好驱动下入场，短期动能强劲。',
  },
  {
    name: '飞鸟跌穴',
    defaultLevel: 'A',
    defaultWeight: 10,
    meaning: '市场热点落在价值洼地，常见于回调结束后的再启动。',
  },
  {
    name: '青龙耀明',
    defaultLevel: 'A',
    defaultWeight: 10,
    meaning: '隐蔽利好与资金结合，适合提前潜伏或跟踪突发催化。',
  },
  {
    name: '青龙转光',
    defaultLevel: 'A',
    defaultWeight: 10,
    meaning: '机会信号与资金呼应，容易形成由弱转强的短线拐点。',
  },
  {
    name: '天显时格',
    defaultLevel: 'B',
    defaultWeight: 6,
    meaning: '时间窗口与盘势共振，看似平静的伏吟局里隐藏转折机会。',
  },
  {
    name: '三奇得使',
    defaultLevel: 'B',
    defaultWeight: 6,
    meaning: '机遇被值使门承接，个股更容易成为板块中的活跃或领涨标的。',
  },
  {
    name: '玉女守门',
    defaultLevel: 'B',
    defaultWeight: 6,
    meaning: '值使守护丁奇，常见于主力控盘或即将启动的个股。',
  },
  {
    name: '奇仪相合',
    defaultLevel: 'C',
    defaultWeight: 3,
    meaning: '多空力量短暂合拍，震荡环境里更容易形成向上合力。',
  },
  {
    name: '门宫和义',
    defaultLevel: 'C',
    defaultWeight: 3,
    meaning: '个股结构与当下表现相生，适合中短结合地持续跟踪。',
  },
  {
    name: '三奇贵人升殿',
    defaultLevel: 'C',
    defaultWeight: 3,
    meaning: '三奇回到旺位，表明个股处在更容易走强的阶段。',
  },
  {
    name: '真诈格',
    defaultLevel: 'COMPOSITE',
    defaultWeight: 15,
    meaning: '良好门势、三奇与太阴同宫，长线利好或价值重估信号更强。',
  },
  {
    name: '天遁格',
    defaultLevel: 'COMPOSITE',
    defaultWeight: 15,
    meaning: '政策、消息与行情共振，是高强度上涨气场。',
  },
  {
    name: '人遁格',
    defaultLevel: 'COMPOSITE',
    defaultWeight: 15,
    meaning: '潜在成长机会被太阴承托，常见于防御板块里的进攻标的。',
  },
];

export type QimenPatternConfigOverrideItem = {
  enabled?: boolean;
  level?: QimenPatternLevel;
  weight?: number;
};

export type QimenPatternOverrides = Partial<
  Record<QimenAuspiciousPatternName, QimenPatternConfigOverrideItem>
>;

export type QimenPatternConfigOverride = {
  weights?: Partial<QimenPatternWeightConfig>;
  thresholds?: Partial<QimenPatternThresholds>;
  patternOverrides?: QimenPatternOverrides;
  invalidatingStates?: PalaceFlag[];
  topEvilPatterns?: QimenTopEvilPattern[];
  bullishUseShen?: string[];
};

export type QimenRiskConfigOverride = {
  excludeInvalidCorePalaces?: boolean;
  excludeTopEvilPatterns?: boolean;
};

export type QimenPatternListItem = {
  name: string;
  level: QimenPatternLevel;
  weight: number;
  meaning: string;
  palaceId: number;
  palaceLabel: string;
};

export type QimenInvalidPalaceSummary = {
  palaceId: number;
  palaceLabel: string;
  reasons: string[];
  topEvilPatterns: string[];
};

export type QimenPatternPalaceAnnotation = {
  palaceIndex: number;
  palacePosition: number;
  palaceName: string;
  tone: QimenPatternTone;
  isHourPalace: boolean;
  isValueDoorPalace: boolean;
  isShengDoorPalace: boolean;
  patternNames: string[];
  patterns: QimenPatternListItem[];
  invalidReasons: string[];
  topEvilPatterns: string[];
};

export type QimenPatternAnalysis = {
  totalScore: number;
  rating: 'S' | 'A' | 'B' | 'C';
  energyLabel: string;
  summary: string;
  corePatternsLabel: string;
  bullishSignal: boolean;
  predictedDirection: BacktestDirection;
  matchedPatternNames: string[];
  hourPatternNames: string[];
  counts: {
    COMPOSITE: number;
    A: number;
    B: number;
    C: number;
  };
  invalidPalaces: QimenInvalidPalaceSummary[];
  palaceAnnotations: QimenPatternPalaceAnnotation[];
};

export type MarketScreenWindowFilter = {
  door?: string;
  star?: string;
  god?: string;
};

export type MarketScreenPatternFilter = {
  names?: string[];
  minScore?: number;
  bullishOnly?: boolean;
  hourOnly?: boolean;
  palacePositions?: number[];
};

export type MarketScreenFilters = {
  hour: MarketScreenWindowFilter;
  day: MarketScreenWindowFilter;
  month: MarketScreenWindowFilter;
  pattern?: MarketScreenPatternFilter;
};

export type MarketScreenMarketSignal = {
  hasBAboveGE?: boolean;
};

export type MarketScreenPatternSummary = {
  totalScore: number;
  rating: 'S' | 'A' | 'B' | 'C';
  energyLabel: string;
  summary: string;
  corePatternsLabel: string;
  matchedPatternNames: string[];
  hourPatternNames: string[];
  counts: {
    COMPOSITE: number;
    A: number;
    B: number;
    C: number;
  };
  bullishSignal: boolean;
  predictedDirection: BacktestDirection;
  isEligible: boolean;
  exclusionReason: string | null;
  palacePositions: number[];
  matches: QimenPatternListItem[];
  invalidPalaces: QimenInvalidPalaceSummary[];
};

export type MarketScreenRequest = {
  filters?: Partial<MarketScreenFilters>;
  marketSignal?: MarketScreenMarketSignal;
  page?: number;
  pageSize?: number;
  minRating?: QimenStockRating | 'ALL';
  onlyEligible?: boolean;
  patternConfigOverride?: QimenPatternConfigOverride;
  riskConfigOverride?: QimenRiskConfigOverride;
};

export type MarketScreenWindow = {
  stem: string;
  palaceName: string;
  position: number;
  door: string;
  star: string;
  god: string;
};

export type MarketScreenStock = Pick<
  StockListingData,
  'code' | 'name' | 'market' | 'listingDate'
> & {
  sector?: string | null;
};

export type MarketScreenResultItem = {
  stock: MarketScreenStock;
  hourWindow: MarketScreenWindow;
  dayWindow: MarketScreenWindow;
  monthWindow: MarketScreenWindow;
  patternSummary?: MarketScreenPatternSummary;
};

export type MarketScreenSuccessResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: MarketScreenResultItem[];
  meta?: {
    source: 'live_market_pool' | 'bundled_limit_up_snapshot';
    generatedAt?: string;
    notice?: string;
  };
};

export type MarketScreenApiResponse =
  | MarketScreenSuccessResponse
  | ApiErrorResponse;

export type MarketDashboardRequest = {
  patternConfigOverride?: QimenPatternConfigOverride;
  riskConfigOverride?: QimenRiskConfigOverride;
  dragonHeadConfigOverride?: DragonHeadSettings;
};

export type MarketDashboardResponse = {
  marketSignal: {
    hasBAboveGE: boolean;
    statusLabel: '有吉气' | '建议观望';
    summary: string;
    referenceRating: QimenStockRating;
    referencePatterns: string[];
  };
  patternHeat: {
    COMPOSITE: number;
    A: number;
    B: number;
    C: number;
  };
  topSectors: Array<{
    label: string;
    count: number;
  }>;
  topStocks: Array<{
    code: string;
    name: string;
    sector?: string | null;
    rating: QimenStockRating;
    totalScore: number;
  }>;
  updatedAt: string;
  universeSize: number;
  cache: {
    cached: boolean;
    expiresAt: string | null;
    source?: 'live_market_pool' | 'bundled_limit_up_snapshot';
    notice?: string;
  };
  dragonHead: Pick<
    DragonHeadMonitorResponse,
    | 'aiAdviceEnabled'
    | 'summary'
    | 'trendSwitch'
    | 'circuitBreaker'
    | 'positionAllocation'
    | 'sourceStatus'
  >;
};

export type MarketDashboardApiResponse =
  | MarketDashboardResponse
  | ApiErrorResponse;

export type ApiError = {
  code: ErrorCode;
  message: string;
};

export type ApiErrorResponse = {
  error: ApiError;
};

export type StockAnalysisSuccessResponse = {
  stock: StockListingData;
  qimen: QimenResult;
  plum: PlumResult;
  patternAnalysis: QimenPatternAnalysis;
  deepDiagnosis?: QimenDeepDiagnosisReport;
};

export type QimenApiSuccessResponse = StockAnalysisSuccessResponse;

export type QimenApiResponse = StockAnalysisSuccessResponse | ApiErrorResponse;

export type BacktestRequestItem = {
  stock: MarketScreenStock;
  patternSummary: MarketScreenPatternSummary;
};

export type BacktestRequest = {
  items: BacktestRequestItem[];
  lookbackDays?: number;
  strategyLabel?: string;
};

export type BacktestApiSuccessResponse = BacktestRunResult & {
  generatedAt: string;
  lookbackDays: number;
  range: {
    from: string;
    to: string;
  };
  strategyLabel: string;
  predictionRule: string;
  includedStocks: number;
  skippedStocks: string[];
};

export type BacktestApiResponse = BacktestApiSuccessResponse | ApiErrorResponse;

export function isApiErrorResponse(
  payload: QimenApiResponse | unknown,
): payload is ApiErrorResponse {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof payload.error === 'object' &&
      payload.error !== null,
  );
}

export function getErrorMessage(code: ErrorCode): string {
  switch (code) {
    case ERROR_CODES.INVALID_STOCK_CODE:
      return '请输入 6 位 A 股股票代码。';
    case ERROR_CODES.STOCK_NOT_FOUND:
      return '未找到对应股票，请确认代码是否正确。';
    case ERROR_CODES.UNSUPPORTED_MARKET:
      return '当前版本仅支持沪市主板、深市主板和创业板。';
    case ERROR_CODES.ST_STOCK_UNSUPPORTED:
      return '当前版本已剔除 ST 个股，暂不支持查询或筛选。';
    case ERROR_CODES.DATA_SOURCE_ERROR:
      return '股票数据源暂时不可用，请稍后重试。';
    case ERROR_CODES.LISTING_DATE_MISSING:
      return '数据源缺少上市日期，暂时无法排盘。';
    case ERROR_CODES.PLUM_PRICE_UNAVAILABLE:
      return '当日开盘价缺失，暂时无法起梅花卦。';
    case ERROR_CODES.PLUM_DATA_SOURCE_ERROR:
      return '梅花行情数据源暂时不可用，请稍后重试。';
    case ERROR_CODES.MARKET_FILTER_REQUIRED:
      return '请至少设置一个时干、日干、月干或吉格筛选条件。';
    case ERROR_CODES.MARKET_ENVIRONMENT_UNFAVORABLE:
      return '市场整体无吉气，个股吉格效力大幅减弱，建议空仓观望。';
    case ERROR_CODES.API_ERROR:
    default:
      return '请求处理失败，请稍后重试。';
  }
}

import type { BacktestDirection, BacktestRunResult } from '@/lib/backtest';

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
export type Market = 'SH' | 'SZ' | 'CYB';
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

export type QimenApiRequest = {
  stockCode: string;
  analysisTime?: string;
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

export type QimenPatternLevel = 'COMPOSITE' | 'A' | 'B' | 'C';
export type QimenPatternTone = 'gold' | 'orange' | 'blue' | 'muted' | 'none';
export type QimenAuspiciousPatternName =
  (typeof QIMEN_AUSPICIOUS_PATTERN_OPTIONS)[number];

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
};

export type MarketScreenApiResponse =
  | MarketScreenSuccessResponse
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

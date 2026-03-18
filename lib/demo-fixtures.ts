import type {
  BacktestApiSuccessResponse,
  MarketScreenSuccessResponse,
  QimenApiSuccessResponse,
} from '@/lib/contracts/qimen';

const demoPatternAnalysis = {
  totalScore: 25,
  rating: 'A' as const,
  energyLabel: '高强度(趋势共振)',
  summary: '主力资金在利好驱动下入场，短期动能强劲。',
  corePatternsLabel: '[A]青龙返首(坎1宫)',
  bullishSignal: true,
  predictedDirection: '涨' as const,
  matchedPatternNames: ['青龙返首', '真诈格'],
  hourPatternNames: ['青龙返首'],
  counts: {
    COMPOSITE: 1,
    A: 1,
    B: 0,
    C: 0,
  },
  invalidPalaces: [
    {
      palaceId: 8,
      palaceLabel: '艮8宫',
      reasons: ['击刑'],
      topEvilPatterns: [],
    },
  ],
  palaceAnnotations: [
    {
      palaceIndex: 0,
      palacePosition: 4,
      palaceName: '巽',
      tone: 'gold' as const,
      isHourPalace: false,
      isValueDoorPalace: false,
      isShengDoorPalace: false,
      patternNames: ['真诈格'],
      patterns: [
        {
          name: '真诈格',
          level: 'COMPOSITE' as const,
          weight: 15,
          meaning: '良好门势、三奇与太阴同宫，长线利好或价值重估信号更强。',
          palaceId: 4,
          palaceLabel: '巽4宫',
        },
      ],
      invalidReasons: [],
      topEvilPatterns: [],
    },
    {
      palaceIndex: 7,
      palacePosition: 1,
      palaceName: '坎',
      tone: 'gold' as const,
      isHourPalace: true,
      isValueDoorPalace: false,
      isShengDoorPalace: false,
      patternNames: ['青龙返首'],
      patterns: [
        {
          name: '青龙返首',
          level: 'A' as const,
          weight: 10,
          meaning: '主力资金在利好驱动下入场，短期动能强劲。',
          palaceId: 1,
          palaceLabel: '坎1宫',
        },
      ],
      invalidReasons: [],
      topEvilPatterns: [],
    },
    {
      palaceIndex: 6,
      palacePosition: 8,
      palaceName: '艮',
      tone: 'muted' as const,
      isHourPalace: false,
      isValueDoorPalace: false,
      isShengDoorPalace: false,
      patternNames: [],
      patterns: [],
      invalidReasons: ['击刑'],
      topEvilPatterns: [],
    },
  ],
};

const demoQimenPayload: QimenApiSuccessResponse = {
  stock: {
    code: '600519',
    name: '贵州茅台',
    market: 'SH',
    listingDate: '2001-08-27',
    listingTime: '09:30',
    timeSource: 'default',
  },
  qimen: {
    yinYang: '阴',
    ju: 2,
    valueStar: '天心星',
    valueDoor: '开门',
    palaces: [
      { index: 0, position: 4, name: '巽', star: '天芮星', door: '休门', god: '太阴' },
      { index: 1, position: 9, name: '离', star: '天柱星', door: '生门', god: '腾蛇' },
      { index: 2, position: 2, name: '坤', star: '天心星', door: '伤门', god: '值符' },
      { index: 3, position: 3, name: '震', star: '天英星', door: '开门', god: '六合' },
      { index: 4, position: 5, name: '中', star: '--', door: '--', god: '--' },
      { index: 5, position: 7, name: '兑', star: '天蓬星', door: '杜门', god: '九天' },
      { index: 6, position: 8, name: '艮', star: '天辅星', door: '惊门', god: '白虎' },
      { index: 7, position: 1, name: '坎', star: '天冲星', door: '死门', god: '玄武' },
      { index: 8, position: 6, name: '乾', star: '天任星', door: '景门', god: '九地' },
    ],
  },
  plum: {
    status: 'ready',
    priceBasis: 'open',
    priceValue: '1468.00',
    upperNumber: 1468,
    lowerNumber: 0,
    movingLine: 4,
    upperTrigram: '震',
    lowerTrigram: '坤',
    original: {
      code: '震坤',
      name: '雷地豫',
      words: '利建侯行师。',
      whiteWords: '《豫》卦利于封建诸侯和行军作战。',
      picture: '雷出地奋，豫。',
      whitePicture: '雷从地中奋起，是豫卦的卦象。',
      stockSuggestion: '震荡后转强。',
      yaoci: '初六：鸣豫，凶。',
    },
    mutual: {
      code: '坎艮',
      name: '水山蹇',
      words: '利西南，不利东北。',
      whiteWords: '《蹇》卦利于西南，不利于东北。',
      picture: '山上有水，蹇。',
      whitePicture: '山上有水，是蹇卦的卦象。',
      stockSuggestion: '遇阻观望。',
      yaoci: '六二：王臣蹇蹇。',
    },
    changed: {
      code: '兑坤',
      name: '泽地萃',
      words: '亨，王假有庙。',
      whiteWords: '《萃》卦亨通，君王来到宗庙。',
      picture: '泽上于地，萃。',
      whitePicture: '湖泽汇聚于地上，是萃卦的卦象。',
      stockSuggestion: '量能聚集。',
      yaoci: '九四：大吉，无咎。',
    },
  },
  patternAnalysis: demoPatternAnalysis,
};

const demoAltQimenPayload: QimenApiSuccessResponse = {
  ...demoQimenPayload,
  stock: {
    code: '000001',
    name: '平安银行',
    market: 'SZ',
    listingDate: '1991-04-03',
    listingTime: '09:30',
    timeSource: 'default',
  },
  patternAnalysis: {
    ...demoPatternAnalysis,
    bullishSignal: false,
    predictedDirection: '观望',
  },
};

const demoMarketScreenPayload: MarketScreenSuccessResponse = {
  total: 1,
  page: 1,
  pageSize: 50,
  items: [
    {
      stock: {
        code: '000001',
        name: '平安银行',
        market: 'SZ',
        listingDate: '1991-04-03',
        sector: '银行',
      },
      hourWindow: {
        stem: '甲',
        palaceName: '坎',
        position: 1,
        door: '开门',
        star: '天冲星',
        god: '玄武',
      },
      dayWindow: {
        stem: '乙',
        palaceName: '离',
        position: 9,
        door: '生门',
        star: '天心星',
        god: '六合',
      },
      monthWindow: {
        stem: '丙',
        palaceName: '兑',
        position: 7,
        door: '景门',
        star: '天任星',
        god: '九天',
      },
      patternSummary: {
        totalScore: 36,
        rating: 'S',
        energyLabel: '顶级机会(资金驱动)',
        summary: '主力资金在利好驱动下入场，短期动能强劲。',
        corePatternsLabel: '[COMPOSITE]真诈格(离9宫)、[A]青龙返首(坎1宫)',
        matchedPatternNames: ['真诈格', '青龙返首'],
        hourPatternNames: ['青龙返首'],
        counts: {
          COMPOSITE: 1,
          A: 1,
          B: 0,
          C: 0,
        },
        bullishSignal: true,
        predictedDirection: '涨',
        isEligible: true,
        exclusionReason: null,
        palacePositions: [1, 9],
        matches: [
          {
            name: '青龙返首',
            level: 'A',
            weight: 10,
            meaning: '主力资金在利好驱动下入场，短期动能强劲。',
            palaceId: 1,
            palaceLabel: '坎1宫',
          },
        ],
        invalidPalaces: [],
      },
    },
  ],
};

const demoBacktestPayload: BacktestApiSuccessResponse = {
  generatedAt: '2026-03-18T10:00:00.000Z',
  lookbackDays: 60,
  range: {
    from: '2026-01-01',
    to: '2026-03-18',
  },
  strategyLabel: '当前筛选策略',
  predictionRule: '时干用神落生门或值符定义为涨，其余默认记为观望。',
  includedStocks: 1,
  skippedStocks: [],
  summary: {
    label: 'overall',
    totalSamples: 10,
    evaluatedSamples: 10,
    hitSamples: 6,
    missSamples: 4,
    hitRate: 0.6,
    predictedDirectionCounts: {
      涨: 10,
      跌: 0,
      观望: 0,
    },
    actualDirectionCounts: {
      涨: 6,
      跌: 4,
      观望: 0,
    },
  },
  byStock: {
    '000001': {
      label: '000001 平安银行',
      totalSamples: 10,
      hitSamples: 6,
      missSamples: 4,
      hitRate: 0.6,
      predictedDirectionCounts: {
        涨: 10,
        跌: 0,
        观望: 0,
      },
      actualDirectionCounts: {
        涨: 6,
        跌: 4,
        观望: 0,
      },
    },
  },
  byStrategy: {
    当前筛选策略: {
      label: '当前筛选策略',
      totalSamples: 10,
      hitSamples: 6,
      missSamples: 4,
      hitRate: 0.6,
      predictedDirectionCounts: {
        涨: 10,
        跌: 0,
        观望: 0,
      },
      actualDirectionCounts: {
        涨: 6,
        跌: 4,
        观望: 0,
      },
    },
  },
  results: [],
};

export function isDemoMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  return new URLSearchParams(window.location.search).get('demo') === '1';
}

export function isDemoAutoplay() {
  if (typeof window === 'undefined') {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);

  return searchParams.get('demo') === '1' && searchParams.get('autoplay') === '1';
}

export function getDemoQimenResponse(stockCode: string): QimenApiSuccessResponse {
  return stockCode.trim() === '000001' ? demoAltQimenPayload : demoQimenPayload;
}

export function getDemoMarketScreenResponse(): MarketScreenSuccessResponse {
  return demoMarketScreenPayload;
}

export function getDemoBacktestResponse(): BacktestApiSuccessResponse {
  return demoBacktestPayload;
}

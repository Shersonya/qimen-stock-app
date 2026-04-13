import type {
  BacktestApiSuccessResponse,
  MarketDashboardResponse,
  MarketScreenSuccessResponse,
  QimenApiSuccessResponse,
} from '@/lib/contracts/qimen';
import type {
  DragonHeadCandidatesResponse,
  DragonHeadMode,
  DragonHeadMonitorResponse,
} from '@/lib/contracts/dragon-head';
import type {
  ComparisonTableData,
  LimitUpFilterResponse,
  PoolStockDiagnosis,
  StockPool,
  TdxScanResponse,
} from '@/lib/contracts/strategy';

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

const demoDeepDiagnosis = {
  basis: {
    stockCode: '600519',
    stockName: '贵州茅台',
    analysisTime: '2001-08-27T01:30:00.000Z',
    yearGanzhi: '辛巳',
    monthGanzhi: '丙申',
    dayGanzhi: '壬戌',
    hourGanzhi: '乙巳',
  },
  coreConclusion: '此局生门对时干有承接，当前更偏向等待确认后试多。',
  action: 'BUY' as const,
  actionLabel: '强烈看涨 / 可考虑买入',
  successProbability: 68,
  riskLevel: '中' as const,
  firstImpression: '全局不伏吟，日空子丑，时空寅卯，整体仍有转圜空间。',
  globalPattern: {
    isFuyin: false,
    isFanyin: false,
    isWubuyushi: false,
    rikong: '子丑',
    shikong: '寅卯',
    summary: '盘面整体仍有转圜空间，关键看生门与时干宫是否继续同频。',
  },
  useShen: [
    {
      kind: 'dayStem' as const,
      label: '日干',
      value: '壬',
      palacePosition: 9,
      palaceName: '离',
      direction: '正南',
      summary: '日干壬落离9宫。',
    },
    {
      kind: 'hourStem' as const,
      label: '时干',
      value: '乙',
      palacePosition: 1,
      palaceName: '坎',
      direction: '正北',
      summary: '时干乙落坎1宫。',
    },
    {
      kind: 'shengDoor' as const,
      label: '核心用神',
      value: '生门',
      palacePosition: 9,
      palaceName: '离',
      direction: '正南',
      summary: '生门落离9宫。',
    },
    {
      kind: 'valueDoor' as const,
      label: '值使门',
      value: '开门',
      palacePosition: 3,
      palaceName: '震',
      direction: '正东',
      summary: '值使门落震3宫。',
    },
  ],
  palaceReadings: [
    {
      title: '时干宫',
      role: '执行与进场',
      palacePosition: 1,
      palaceName: '坎',
      skyGan: '乙',
      groundGan: '乙',
      star: '天冲星',
      door: '死门',
      god: '玄武',
      emptyMarkers: ['日空'],
      relationToDayStemPalace: '克我',
      tianShi: '天冲主启动与短线冲力。',
      diLi: '坎1宫属水，与离9宫形成强对冲，需要确认承接。',
      renHe: '死门主停滞，入场不宜过急。',
      shenZhu: '玄武多反复与暗盘动作。',
      stemPattern: '乙乙比和，执行意愿强，但容易过度执着。',
      summary: '时干宫先动后稳，宜等确认信号再放大仓位。',
    },
    {
      title: '生门宫',
      role: '利润与结果',
      palacePosition: 9,
      palaceName: '离',
      skyGan: '壬',
      groundGan: '丁',
      star: '天柱星',
      door: '生门',
      god: '腾蛇',
      emptyMarkers: [],
      relationToDayStemPalace: '比和',
      tianShi: '天柱主阻力与分歧。',
      diLi: '离9宫属火，相对日干宫为比和。',
      renHe: '生门主利润与增量。',
      shenZhu: '腾蛇多虚实难辨。',
      stemPattern: '壬丁相见，宜结合门星神综合判断。',
      summary: '生门宫综合偏积极，是本次求财链条中的主承托位。',
    },
    {
      title: '日干宫',
      role: '主体与承压',
      palacePosition: 9,
      palaceName: '离',
      skyGan: '壬',
      groundGan: '丁',
      star: '天柱星',
      door: '生门',
      god: '腾蛇',
      emptyMarkers: [],
      relationToDayStemPalace: '比和',
      tianShi: '主体与利润宫同位，更容易聚焦单一主线。',
      diLi: '离宫火势外显，波动中仍带主动性。',
      renHe: '若能得到值使门呼应，趋势更容易延续。',
      shenZhu: '腾蛇提醒要警惕追高后的情绪回摆。',
      stemPattern: '壬丁交映，利观察真假突破。',
      summary: '日干宫显示主体仍在主动区，但不宜忽略波动和追价风险。',
    },
  ],
  decisionRationale: [
    '生门宫与时干宫能形成承接，但时干宫仍带死门和玄武，确认信号比速度更重要。',
    '值使门落震3宫，意味着节奏会先从消息或盘中异动开始释放。',
  ],
  outlooks: [
    { horizon: '明日' as const, trend: '偏多' as const, detail: '先看时干宫表现和盘中承接。' },
    { horizon: '一周' as const, trend: '震荡' as const, detail: '值使门附近更容易变盘，宜跟踪量价是否同步。' },
    { horizon: '一月' as const, trend: '偏多' as const, detail: '若生门持续承托，月内结构偏强。' },
    { horizon: '一季' as const, trend: '震荡' as const, detail: '节气转换后再验证是否能走成中期主升。' },
  ],
  keyTimingHints: ['重点关注子丑、寅卯填实时段。'],
  actionGuide: ['等待时干宫确认后分批试仓。', '若盘中冲高回落明显，则优先保持观察。'],
  note: '当前为演示样本，用于固定场景截图与交互验证。',
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
  deepDiagnosis: demoDeepDiagnosis,
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
  deepDiagnosis: {
    ...demoDeepDiagnosis,
    basis: {
      ...demoDeepDiagnosis.basis,
      stockCode: '000001',
      stockName: '平安银行',
    },
    action: 'WATCH',
    actionLabel: '观望',
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

const demoMarketDashboardPayload: MarketDashboardResponse = {
  marketSignal: {
    hasBAboveGE: true,
    statusLabel: '有吉气',
    summary: '当前市场局出现 A 级与复合吉格，适合在筛选结果中优先关注高分标的。',
    referenceRating: 'A',
    referencePatterns: ['青龙返首', '真诈格'],
  },
  patternHeat: {
    COMPOSITE: 18,
    A: 36,
    B: 94,
    C: 212,
  },
  topSectors: [
    { label: '银行', count: 12 },
    { label: '白酒', count: 9 },
    { label: '电力设备', count: 8 },
    { label: '半导体', count: 6 },
    { label: '医药生物', count: 5 },
  ],
  topStocks: [
    { code: '000001', name: '平安银行', sector: '银行', rating: 'S', totalScore: 36 },
    { code: '600519', name: '贵州茅台', sector: '白酒', rating: 'A', totalScore: 25 },
    { code: '300750', name: '宁德时代', sector: '电力设备', rating: 'A', totalScore: 24 },
    { code: '600036', name: '招商银行', sector: '银行', rating: 'A', totalScore: 23 },
    { code: '000858', name: '五粮液', sector: '白酒', rating: 'B', totalScore: 18 },
  ],
  updatedAt: '2026-03-18T10:00:00.000Z',
  universeSize: 1324,
  cache: {
    cached: true,
    expiresAt: '2026-03-18T10:30:00.000Z',
  },
  dragonHead: {
    aiAdviceEnabled: true,
    summary: '新主线候选开始抬升，AI 建议可用，但仍需人工复核政策与席位异动。',
    trendSwitch: {
      instruction: 'HOLD_NEW',
      newThemeFirstBoardCount: 3,
      newThemeAverageStrength: 86,
      oldLeaderStrength: 78,
      oldLeaderWeakDays: 1,
      topBoardStrength: 92,
      themeTurnoverGrowthPct: 245,
      summary: '新题材已形成三只首板共振，但老主线尚未连续两日失效，更适合先持有新线观察。',
    },
    circuitBreaker: {
      triggered: false,
      reasons: [],
      metrics: {
        limitDownCount: 12,
        yesterdayLimitUpAvgReturn: 2.4,
        maxBoardHeight: 6,
      },
    },
    positionAllocation: {
      newLeaderPercent: 30,
      oldCorePercent: 50,
      topBoardPercent: 20,
      forcedFlat: false,
      reason: '新主线未达到 90 分，但老核心保持 85 分以上，维持老核心主仓。',
    },
    sourceStatus: [
      {
        provider: 'intradayQuote',
        asOf: '2026-03-21T10:18:00+08:00',
        source: 'mock_complete',
        available: true,
      },
      {
        provider: 'orderBook',
        asOf: '2026-03-21T10:18:00+08:00',
        source: 'mock_complete',
        available: true,
      },
      {
        provider: 'sectorBreadth',
        asOf: '2026-03-21T10:18:00+08:00',
        source: 'mock_complete',
        available: true,
      },
      {
        provider: 'themeFlow',
        asOf: '2026-03-21T10:18:00+08:00',
        source: 'mock_complete',
        available: true,
      },
    ],
  },
};

const demoDragonHeadMonitorPayload: DragonHeadMonitorResponse = {
  asOf: '2026-03-21T10:18:00+08:00',
  aiAdviceEnabled: true,
  summary: '新主线开始形成接力，当前允许使用 AI 建议，但必须人工复核监管与情绪周期。',
  trendSwitch: {
    instruction: 'HOLD_NEW',
    newThemeFirstBoardCount: 3,
    newThemeAverageStrength: 86,
    oldLeaderStrength: 78,
    oldLeaderWeakDays: 1,
    topBoardStrength: 92,
    themeTurnoverGrowthPct: 245,
    summary: '新题材已有三只首板强度超过 80，但老主线尚未连续两日转弱，维持新线观察而非完全切换。',
  },
  positionAllocation: {
    newLeaderPercent: 30,
    oldCorePercent: 50,
    topBoardPercent: 20,
    forcedFlat: false,
    reason: '新主线未达到 90 分，但老核心强度仍在 85 以上，优先保留老核心主仓。',
  },
  circuitBreaker: {
    triggered: false,
    reasons: [],
    metrics: {
      limitDownCount: 12,
      yesterdayLimitUpAvgReturn: 2.4,
      maxBoardHeight: 6,
    },
  },
  newTheme: {
    label: '低空经济',
    averageStrength: 86,
    firstBoardCount: 3,
  },
  oldTheme: {
    label: '机器人',
    leaderStrength: 78,
    weakDays: 1,
  },
  topBoard: {
    label: '空间板',
    strength: 92,
  },
  sourceStatus: demoMarketDashboardPayload.dragonHead.sourceStatus,
  manualReviewChecklist: [
    '政策突发利空需人工复核',
    '量化资金集体踩踏需人工复核',
    '龙虎榜席位异动需人工复核',
    '情绪周期定位需人工复核',
    '龙头气质识别需人工复核',
  ],
};

const demoDragonHeadCandidatesPayload: DragonHeadCandidatesResponse = {
  asOf: '2026-03-21T10:18:00+08:00',
  total: 3,
  aiAdviceEnabled: true,
  summary: '当前共识度最高的龙头候选共有 3 只，强度已按固定 100 分公式汇总。',
  sourceStatus: demoMarketDashboardPayload.dragonHead.sourceStatus,
  manualReviewChecklist: demoDragonHeadMonitorPayload.manualReviewChecklist,
  items: [
    {
      stockCode: '000625',
      stockName: '长安汽车',
      market: 'SZ',
      sector: '低空经济',
      latestPrice: 18.36,
      latestChangePct: 7.9,
      boardChangePct: 3.1,
      limitUpCount: 1,
      signalTags: ['新题材首板', '板块联动'],
      isNewThemeLeader: true,
      isOldCoreLeader: false,
      isTopBoard: false,
      canAddToPool: true,
      reviewFlags: ['需人工复核政策面'],
      strength: {
        score: 88.8,
        formulaVersion: 'dragon-head-v1',
        confidence: 1,
        missingFactors: [],
        sourceStatus: demoMarketDashboardPayload.dragonHead.sourceStatus,
        factorBreakdown: [
          { key: 'volumeRatio', label: '量比', weight: 30, rawValue: 2.8, normalized: 0.9, contribution: 27, available: true },
          { key: 'speed10m', label: '10分钟涨速', weight: 30, rawValue: 0.064, normalized: 0.8, contribution: 24, available: true },
          { key: 'driveRatio', label: '板块带动比', weight: 25, rawValue: 2.5, normalized: 1, contribution: 25, available: true },
          { key: 'sealRatio', label: '封单金额比', weight: 10, rawValue: 0.084, normalized: 0.7, contribution: 7, available: true },
          { key: 'breakoutFreq', label: '5分钟突破频次', weight: 5, rawValue: 6, normalized: 1, contribution: 5, available: true },
        ],
      },
    },
    {
      stockCode: '300418',
      stockName: '昆仑万维',
      market: 'CYB',
      sector: '低空经济',
      latestPrice: 37.24,
      latestChangePct: 6.2,
      boardChangePct: 3.1,
      limitUpCount: 1,
      signalTags: ['新题材首板'],
      isNewThemeLeader: true,
      isOldCoreLeader: false,
      isTopBoard: false,
      canAddToPool: true,
      reviewFlags: ['需人工复核盘口承接'],
      strength: {
        score: 84,
        formulaVersion: 'dragon-head-v1',
        confidence: 1,
        missingFactors: [],
        sourceStatus: demoMarketDashboardPayload.dragonHead.sourceStatus,
        factorBreakdown: [
          { key: 'volumeRatio', label: '量比', weight: 30, rawValue: 2.5, normalized: 0.75, contribution: 22.5, available: true },
          { key: 'speed10m', label: '10分钟涨速', weight: 30, rawValue: 0.056, normalized: 0.7, contribution: 21, available: true },
          { key: 'driveRatio', label: '板块带动比', weight: 25, rawValue: 2.1, normalized: 1, contribution: 25, available: true },
          { key: 'sealRatio', label: '封单金额比', weight: 10, rawValue: 0.06, normalized: 0.5, contribution: 5, available: true },
          { key: 'breakoutFreq', label: '5分钟突破频次', weight: 5, rawValue: 5, normalized: 1, contribution: 5, available: true },
        ],
      },
    },
    {
      stockCode: '600487',
      stockName: '亨通光电',
      market: 'SH',
      sector: '机器人',
      latestPrice: 19.84,
      latestChangePct: 3.4,
      boardChangePct: 2.9,
      limitUpCount: 3,
      signalTags: ['老主线核心', '空间板'],
      isNewThemeLeader: false,
      isOldCoreLeader: true,
      isTopBoard: true,
      canAddToPool: true,
      reviewFlags: ['需人工复核龙虎榜席位'],
      strength: {
        score: 92,
        formulaVersion: 'dragon-head-v1',
        confidence: 1,
        missingFactors: [],
        sourceStatus: demoMarketDashboardPayload.dragonHead.sourceStatus,
        factorBreakdown: [
          { key: 'volumeRatio', label: '量比', weight: 30, rawValue: 3, normalized: 1, contribution: 30, available: true },
          { key: 'speed10m', label: '10分钟涨速', weight: 30, rawValue: 0.072, normalized: 0.9, contribution: 27, available: true },
          { key: 'driveRatio', label: '板块带动比', weight: 25, rawValue: 2.4, normalized: 1, contribution: 25, available: true },
          { key: 'sealRatio', label: '封单金额比', weight: 10, rawValue: 0.072, normalized: 0.6, contribution: 6, available: true },
          { key: 'breakoutFreq', label: '5分钟突破频次', weight: 5, rawValue: 4, normalized: 0.8, contribution: 4, available: true },
        ],
      },
    },
  ],
};

const demoDragonHeadDegradedMonitorPayload: DragonHeadMonitorResponse = {
  ...demoDragonHeadMonitorPayload,
  summary: '当前仅拿到日线代理数据，10 分钟涨速、封单与题材资金流缺失，评分已降级。',
  sourceStatus: [
    {
      provider: 'intradayQuote',
      asOf: '2026-03-21T10:18:00+08:00',
      source: 'daily_proxy',
      available: true,
      degradedReason: '仅使用日线量比代理，盘中 10 分钟涨速缺失。',
    },
    {
      provider: 'orderBook',
      asOf: '2026-03-21T10:18:00+08:00',
      source: 'unavailable',
      available: false,
      degradedReason: '盘口买一金额数据尚未接入。',
    },
    {
      provider: 'sectorBreadth',
      asOf: '2026-03-21T10:18:00+08:00',
      source: 'daily_proxy',
      available: true,
      degradedReason: '板块带动比使用日线代理。',
    },
    {
      provider: 'themeFlow',
      asOf: '2026-03-21T10:18:00+08:00',
      source: 'unavailable',
      available: false,
      degradedReason: '题材成交额增速尚未接入实时源。',
    },
  ],
};

const demoDragonHeadDegradedCandidatesPayload: DragonHeadCandidatesResponse = {
  ...demoDragonHeadCandidatesPayload,
  summary: '当前为降级评分，缺失因子会记 0 并下调 confidence。',
  sourceStatus: demoDragonHeadDegradedMonitorPayload.sourceStatus,
  items: demoDragonHeadCandidatesPayload.items.map((item, index) => ({
    ...item,
    reviewFlags: [...item.reviewFlags, '当前为降级评分'],
    strength: {
      ...item.strength,
      score: index === 0 ? 41 : index === 1 ? 36.5 : 52,
      confidence: 0.45,
      sourceStatus: demoDragonHeadDegradedMonitorPayload.sourceStatus,
      missingFactors: ['speed10m', 'sealRatio', 'breakoutFreq'],
      factorBreakdown: item.strength.factorBreakdown.map((factor) =>
        factor.key === 'volumeRatio' || factor.key === 'driveRatio'
          ? { ...factor, proxy: true, note: '使用日线代理数据计算。' }
          : {
              ...factor,
              rawValue: null,
              normalized: 0,
              contribution: 0,
              available: false,
              note: '实时数据缺失，当前按 0 分处理。',
            },
      ),
    },
  })),
};

const demoDragonHeadBreakerMonitorPayload: DragonHeadMonitorResponse = {
  ...demoDragonHeadMonitorPayload,
  aiAdviceEnabled: false,
  summary: '两市风险指标触发熔断，AI 建议已停止，请改为纯人工观察。',
  positionAllocation: {
    newLeaderPercent: 0,
    oldCorePercent: 0,
    topBoardPercent: 0,
    forcedFlat: true,
    reason: '跌停家数、昨日涨停今均幅和空间板高度共同触发熔断。',
  },
  circuitBreaker: {
    triggered: true,
    reasons: ['两市跌停≥50家', '昨日涨停今均幅≤-5%', '空间板高度≤3板'],
    metrics: {
      limitDownCount: 63,
      yesterdayLimitUpAvgReturn: -6.3,
      maxBoardHeight: 3,
    },
  },
  trendSwitch: {
    ...demoDragonHeadMonitorPayload.trendSwitch,
    instruction: 'STAY',
    summary: '熔断已生效，主线切换信号暂停使用。',
  },
};

const demoTdxScanPayload: TdxScanResponse = {
  total: 3,
  page: 1,
  pageSize: 50,
  scanDate: '2026-03-21',
  meta: {
    cached: false,
    universeSource: 'market_pool',
    universeSize: 1324,
  },
  items: [
    {
      stockCode: '300750',
      stockName: '宁德时代',
      market: 'CYB',
      signalDate: '2026-03-20',
      closePrice: 228.5,
      volume: 1285400,
      meiZhu: false,
      meiYangYang: true,
      meiZhuDate: '2026-03-18',
      signalStrength: 5.2,
      trueCGain: 4.6,
      maUp: true,
      fiveLinesBull: true,
      biasRate: 8.4,
      volumeRatio: 2.1,
    },
    {
      stockCode: '002594',
      stockName: '比亚迪',
      market: 'SZ',
      signalDate: '2026-03-20',
      closePrice: 241.3,
      volume: 965400,
      meiZhu: true,
      meiYangYang: false,
      signalStrength: 3.8,
      trueCGain: 3.1,
      maUp: true,
      fiveLinesBull: false,
      biasRate: 7.2,
      volumeRatio: 1.8,
    },
    {
      stockCode: '600036',
      stockName: '招商银行',
      market: 'SH',
      signalDate: '2026-03-20',
      closePrice: 42.18,
      volume: 684500,
      meiZhu: true,
      meiYangYang: true,
      meiZhuDate: '2026-03-19',
      signalStrength: 4.1,
      trueCGain: 2.7,
      maUp: true,
      fiveLinesBull: true,
      biasRate: 5.9,
      volumeRatio: 1.5,
    },
  ],
};

const demoLimitUpPayload: LimitUpFilterResponse = {
  total: 3,
  page: 1,
  pageSize: 50,
  filterDate: '2026-03-21',
  lookbackDays: 30,
  items: [
    {
      stockCode: '000625',
      stockName: '长安汽车',
      market: 'SZ',
      limitUpDates: ['2026-03-04', '2026-03-12'],
      limitUpCount: 2,
      firstLimitUpDate: '2026-03-04',
      lastLimitUpDate: '2026-03-12',
      latestClose: 18.36,
      latestVolume: 2315400,
      sector: '汽车整车',
    },
    {
      stockCode: '300418',
      stockName: '昆仑万维',
      market: 'CYB',
      limitUpDates: ['2026-03-07'],
      limitUpCount: 1,
      firstLimitUpDate: '2026-03-07',
      lastLimitUpDate: '2026-03-07',
      latestClose: 37.24,
      latestVolume: 1542200,
      sector: '互联网服务',
    },
    {
      stockCode: '600487',
      stockName: '亨通光电',
      market: 'SH',
      limitUpDates: ['2026-03-03', '2026-03-05', '2026-03-18'],
      limitUpCount: 3,
      firstLimitUpDate: '2026-03-03',
      lastLimitUpDate: '2026-03-18',
      latestClose: 19.84,
      latestVolume: 1824300,
      sector: '通信设备',
    },
  ],
};

const demoBatchDiagnosisResults: PoolStockDiagnosis[] = [
  {
    stockCode: '300750',
    stockName: '宁德时代',
    diagnosisTime: '2026-03-21T10:08:00+08:00',
    rating: 'S',
    totalScore: 92,
    riskLevel: '低',
    action: 'BUY',
    actionLabel: '强烈看涨 / 可考虑买入',
    successProbability: 85,
    summary: '吉格与趋势共振，适合纳入核心观察序列。',
  },
  {
    stockCode: '002594',
    stockName: '比亚迪',
    diagnosisTime: '2026-03-21T10:11:00+08:00',
    rating: 'A',
    totalScore: 81,
    riskLevel: '中',
    action: 'WATCH',
    actionLabel: '谨慎看多 / 逢低跟踪',
    successProbability: 72,
    summary: '结构偏强，但更适合等待缩量回踩后的确认。',
  },
];

const demoStockPools: StockPool[] = [
  {
    id: 'pool_20260321_100000',
    name: '核心观察池',
    createdAt: '2026-03-21T10:00:00+08:00',
    updatedAt: '2026-03-21T10:12:00+08:00',
    stocks: [
      {
        stockCode: '300750',
        stockName: '宁德时代',
        market: 'CYB',
        addReason: 'tdx_signal',
        addDate: '2026-03-21',
        addSource: '美阳阳扫描',
        tdxSignalType: 'meiYangYang',
        diagnosisResult: demoBatchDiagnosisResults[0],
      },
      {
        stockCode: '002594',
        stockName: '比亚迪',
        market: 'SZ',
        addReason: 'tdx_signal',
        addDate: '2026-03-21',
        addSource: '美柱扫描',
        tdxSignalType: 'meiZhu',
        diagnosisResult: demoBatchDiagnosisResults[1],
      },
      {
        stockCode: '600487',
        stockName: '亨通光电',
        market: 'SH',
        addReason: 'limit_up',
        addDate: '2026-03-21',
        addSource: '近30日涨停 3 次',
        limitUpCount: 3,
      },
    ],
    removedStocks: [
      {
        stockCode: '300418',
        stockName: '昆仑万维',
        removeDate: '2026-03-21',
        removeReason: 'manual',
      },
    ],
  },
];

const demoComparisonTableData: ComparisonTableData = {
  generatedAt: '2026-03-21',
  sortBy: 'totalScore',
  items: demoBatchDiagnosisResults.map((item) => ({
    stockCode: item.stockCode,
    stockName: demoStockPools[0]?.stocks.find((stock) => stock.stockCode === item.stockCode)
      ?.stockName ?? item.stockCode,
    rating: item.rating,
    totalScore: item.totalScore,
    riskLevel: item.riskLevel,
    action: item.action,
    actionLabel: item.actionLabel,
    successProbability: item.successProbability,
    summary: item.summary,
    diagnosisTime: item.diagnosisTime,
    stale: false,
  })),
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

export function getDemoMarketDashboardResponse(): MarketDashboardResponse {
  return demoMarketDashboardPayload;
}

export function getDemoTdxScanResponse(): TdxScanResponse {
  return demoTdxScanPayload;
}

export function getDemoLimitUpResponse(): LimitUpFilterResponse {
  return demoLimitUpPayload;
}

export function getDemoBatchDiagnosisResults(): PoolStockDiagnosis[] {
  return demoBatchDiagnosisResults;
}

export function getDemoStockPools(): StockPool[] {
  return demoStockPools;
}

export function getDemoComparisonTableData(): ComparisonTableData {
  return demoComparisonTableData;
}

export function getDemoDragonHeadMonitorResponse(
  mode?: DragonHeadMode,
): DragonHeadMonitorResponse {
  if (mode === 'mock_degraded') {
    return demoDragonHeadDegradedMonitorPayload;
  }

  if (mode === 'mock_breaker') {
    return demoDragonHeadBreakerMonitorPayload;
  }

  return demoDragonHeadMonitorPayload;
}

export function getDemoDragonHeadCandidatesResponse(
  mode?: DragonHeadMode,
): DragonHeadCandidatesResponse {
  if (mode === 'mock_degraded') {
    return demoDragonHeadDegradedCandidatesPayload;
  }

  if (mode === 'mock_breaker') {
    return {
      ...demoDragonHeadDegradedCandidatesPayload,
      aiAdviceEnabled: false,
      summary: '当前熔断生效，候选列表只展示观察样本，不建议入池。',
      items: demoDragonHeadDegradedCandidatesPayload.items.map((item) => ({
        ...item,
        canAddToPool: false,
        reviewFlags: [...item.reviewFlags, '熔断生效，暂停 AI 入池建议'],
      })),
    };
  }

  return demoDragonHeadCandidatesPayload;
}

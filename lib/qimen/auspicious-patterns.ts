import type {
  PalaceFlag,
  QimenAuspiciousPatternName,
  QimenPatternConfigOverride,
  QimenPatternLevel,
  QimenPatternOverrides,
  QimenPatternThresholds,
  QimenPatternWeightConfig,
  QimenStockRating,
  QimenTopEvilPattern,
} from '@/lib/contracts/qimen';

export type RawQimenPalaceState = Partial<Record<PalaceFlag, boolean>> & {
  顶级凶格?: string[];
};

export type RawQimenPalaceInfo = {
  id: number;
  五行: string;
  八卦: string;
  状态?: RawQimenPalaceState;
};

export type RawQimenTimeInfo = {
  日干支: string;
  时干支: string;
  是否伏吟: boolean;
};

export type RawQimenData = {
  天盘干: string[];
  地盘干: string[];
  门盘: string[];
  神盘: string[];
  宫位信息: RawQimenPalaceInfo[];
  值使门: string;
  全局时间: RawQimenTimeInfo;
};

export type RawQimenStockInput = {
  stock_id: string;
  stock_name: string;
  qimen_data: RawQimenData;
  market_signal?: {
    has_b_above_ge?: boolean;
  };
};

export type QimenPatternWeights = QimenPatternWeightConfig;

export type QimenPatternConfig = {
  weights: QimenPatternWeights;
  thresholds: QimenPatternThresholds;
  invalidatingStates: PalaceFlag[];
  topEvilPatterns: QimenTopEvilPattern[];
  bullishUseShen: string[];
  patternOverrides: QimenPatternOverrides;
};

export type NormalizedQimenPalace = {
  index: number;
  id: number;
  八卦: string;
  五行: string;
  天盘干: string;
  地盘干: string;
  门盘: string;
  神盘: string;
  状态: RawQimenPalaceState;
};

export type NormalizedQimenInput = {
  stockId: string | null;
  stockName: string | null;
  marketSignal: {
    hasBAboveGE: boolean | null;
  };
  qimenData: {
    palaces: NormalizedQimenPalace[];
    值使门: string;
    全局时间: RawQimenTimeInfo;
  };
};

export type QimenPatternMatch = {
  name: keyof typeof PATTERN_MEANINGS;
  level: QimenPatternLevel;
  weight: number;
  meaning: string;
  palaceId: number;
  palaceLabel: string;
};

export type QimenInvalidPalace = {
  palaceId: number;
  palaceLabel: string;
  reasons: PalaceFlag[];
  topEvilPatterns: string[];
};

export type QimenPatternEvaluation = {
  stockId: string | null;
  stockName: string | null;
  marketSignal: {
    hasBAboveGE: boolean | null;
  };
  baseScore: number;
  totalScore: number;
  rating: QimenStockRating;
  activeMatches: QimenPatternMatch[];
  invalidPalaces: QimenInvalidPalace[];
  counts: {
    COMPOSITE: number;
    A: number;
    B: number;
    C: number;
  };
  corePatternsLabel: string;
  energyLabel: string;
  summary: string;
  corePalaces: {
    timeStemPalaceId: number | null;
    valueDoorPalaceId: number | null;
    shengDoorPalaceId: number | null;
    skyWuPalaceId: number | null;
  };
};

type PatternDetectionContext = {
  config: QimenPatternConfig;
  palaces: NormalizedQimenPalace[];
  值使门: string;
  全局时间: RawQimenTimeInfo;
  timeStemPalaceId: number | null;
};

type PatternDetector = (
  palace: NormalizedQimenPalace,
  context: PatternDetectionContext,
) => QimenPatternMatch | null;

const DOOR_ALIASES: Record<string, string> = {
  休: '休门',
  生: '生门',
  伤: '伤门',
  杜: '杜门',
  景: '景门',
  死: '死门',
  惊: '惊门',
  开: '开门',
};

const DOOR_ELEMENTS: Record<string, string> = {
  休门: '水',
  生门: '土',
  伤门: '木',
  杜门: '木',
  景门: '火',
  死门: '土',
  惊门: '金',
  开门: '金',
};

const GENERATION_CYCLE: Record<string, string> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
};

const STEM_COMBINATIONS = new Set([
  '乙庚',
  '庚乙',
  '丙辛',
  '辛丙',
  '丁壬',
  '壬丁',
  '戊癸',
  '癸戊',
  '甲己',
  '己甲',
]);

const PATTERN_LEVEL_PRIORITY: Record<QimenPatternLevel, number> = {
  COMPOSITE: 4,
  A: 3,
  B: 2,
  C: 1,
};

const PATTERN_MEANINGS = {
  青龙返首: '主力资金在利好驱动下入场，短期动能强劲。',
  飞鸟跌穴: '市场热点落在价值洼地，常见于回调结束后的再启动。',
  青龙耀明: '隐蔽利好与资金结合，适合提前潜伏或跟踪突发催化。',
  青龙转光: '机会信号与资金呼应，容易形成由弱转强的短线拐点。',
  天显时格: '时间窗口与盘势共振，看似平静的伏吟局里隐藏转折机会。',
  三奇得使: '机遇被值使门承接，个股更容易成为板块中的活跃或领涨标的。',
  玉女守门: '值使守护丁奇，常见于主力控盘或即将启动的个股。',
  奇仪相合: '多空力量短暂合拍，震荡环境里更容易形成向上合力。',
  门宫和义: '个股结构与当下表现相生，适合中短结合地持续跟踪。',
  三奇贵人升殿: '三奇回到旺位，表明个股处在更容易走强的阶段。',
  真诈格: '良好门势、三奇与太阴同宫，长线利好或价值重估信号更强。',
  天遁格: '政策、消息与行情共振，是高强度上涨气场。',
  人遁格: '潜在成长机会被太阴承托，常见于防御板块里的进攻标的。',
} as const;

export const DEFAULT_QIMEN_PATTERN_CONFIG: QimenPatternConfig = {
  weights: {
    A: 10,
    B: 6,
    C: 3,
    COMPOSITE: 15,
  },
  thresholds: {
    S: 30,
    A: 20,
    B: 10,
  },
  invalidatingStates: ['空亡', '击刑', '入墓', '门迫'],
  topEvilPatterns: ['白虎猖狂'],
  bullishUseShen: ['生门', '值符'],
  patternOverrides: {},
};

function normalizeDoorName(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    return normalized;
  }

  return DOOR_ALIASES[normalized] ?? normalized;
}

function formatPalaceLabel(palace: Pick<NormalizedQimenPalace, '八卦' | 'id'>) {
  return `${palace.八卦}${palace.id}宫`;
}

function getGanzhiStem(value: string) {
  return Array.from(value.trim())[0] ?? '';
}

function isGenerating(source: string, target: string) {
  return GENERATION_CYCLE[source] === target;
}

function getDoorElement(door: string) {
  return DOOR_ELEMENTS[normalizeDoorName(door)] ?? '';
}

function getPatternWeight(
  level: QimenPatternLevel,
  config: QimenPatternConfig,
) {
  return config.weights[level];
}

function getInvalidPalaceReasons(
  palace: NormalizedQimenPalace,
  config: QimenPatternConfig,
) {
  return config.invalidatingStates.filter((flag) => palace.状态[flag]);
}

function findTimeStemPalaceId(
  palaces: NormalizedQimenPalace[],
  timeInfo: RawQimenTimeInfo,
) {
  const timeStem = getGanzhiStem(timeInfo.时干支);
  const palace = palaces.find((item) => item.天盘干 === timeStem);

  return palace?.id ?? null;
}

function findSkyWuPalaceId(palaces: NormalizedQimenPalace[]) {
  const palace = palaces.find((item) => item.天盘干 === '戊');

  return palace?.id ?? null;
}

function comparePatternMatches(left: QimenPatternMatch, right: QimenPatternMatch) {
  if (right.weight !== left.weight) {
    return right.weight - left.weight;
  }

  if (PATTERN_LEVEL_PRIORITY[right.level] !== PATTERN_LEVEL_PRIORITY[left.level]) {
    return PATTERN_LEVEL_PRIORITY[right.level] - PATTERN_LEVEL_PRIORITY[left.level];
  }

  if (left.palaceId !== right.palaceId) {
    return left.palaceId - right.palaceId;
  }

  return left.name.localeCompare(right.name, 'zh-Hans-CN');
}

function resolveRating(
  totalScore: number,
  config: QimenPatternConfig,
): QimenStockRating {
  if (totalScore >= config.thresholds.S) {
    return 'S';
  }

  if (totalScore >= config.thresholds.A) {
    return 'A';
  }

  if (totalScore >= config.thresholds.B) {
    return 'B';
  }

  return 'C';
}

function resolveEnergyLabel(matches: QimenPatternMatch[]) {
  const compositeCount = matches.filter((item) => item.level === 'COMPOSITE').length;
  const aCount = matches.filter((item) => item.level === 'A').length;
  const bCount = matches.filter((item) => item.level === 'B').length;
  const cCount = matches.filter((item) => item.level === 'C').length;

  if (compositeCount > 0 && aCount > 0) {
    return '顶级机会(资金驱动)';
  }

  if (compositeCount > 0 && bCount > 0) {
    return '顶级机会(趋势共振)';
  }

  if (compositeCount > 0) {
    return '顶级机会(复合共振)';
  }

  if (aCount > 0) {
    return '高强度(资金驱动)';
  }

  if (bCount > 0) {
    return '高强度(趋势共振)';
  }

  if (cCount > 0) {
    return '结构机会(等待催化)';
  }

  return '观望(暂无核心吉格)';
}

function resolveSummary(matches: QimenPatternMatch[]) {
  return matches[0]?.meaning ?? '当前样本未识别到有效吉格。';
}

function formatCorePatternsLabel(matches: QimenPatternMatch[]) {
  return matches
    .slice(0, 3)
    .map((match) => `[${match.level}]${match.name}(${match.palaceLabel})`)
    .join('、');
}

function buildPatternContext(
  normalized: NormalizedQimenInput,
  config: QimenPatternConfig,
): PatternDetectionContext {
  return {
    config,
    palaces: normalized.qimenData.palaces,
    值使门: normalized.qimenData.值使门,
    全局时间: normalized.qimenData.全局时间,
    timeStemPalaceId: findTimeStemPalaceId(
      normalized.qimenData.palaces,
      normalized.qimenData.全局时间,
    ),
  };
}

function matchesTianXianShiWindow(timeInfo: RawQimenTimeInfo) {
  if (!timeInfo.是否伏吟) {
    return false;
  }

  const dayStem = getGanzhiStem(timeInfo.日干支);
  const hourGanzhi = timeInfo.时干支.trim();

  if (['甲', '己'].includes(dayStem)) {
    return hourGanzhi === '甲子' || hourGanzhi === '甲戌';
  }

  if (['乙', '庚'].includes(dayStem)) {
    return hourGanzhi === '甲申';
  }

  if (['丙', '辛'].includes(dayStem)) {
    return hourGanzhi === '甲午';
  }

  if (['丁', '壬'].includes(dayStem)) {
    return hourGanzhi === '甲辰';
  }

  if (['戊', '癸'].includes(dayStem)) {
    return hourGanzhi === '甲寅';
  }

  return false;
}

function createPatternMatch(
  name: keyof typeof PATTERN_MEANINGS,
  level: QimenPatternLevel,
  palace: NormalizedQimenPalace,
  weight: number,
): QimenPatternMatch {
  return {
    name,
    level,
    weight,
    meaning: PATTERN_MEANINGS[name],
    palaceId: palace.id,
    palaceLabel: formatPalaceLabel(palace),
  };
}

function applyPatternOverride(
  match: QimenPatternMatch,
  config: QimenPatternConfig,
): QimenPatternMatch | null {
  const override = config.patternOverrides[
    match.name as QimenAuspiciousPatternName
  ];

  if (override?.enabled === false) {
    return null;
  }

  const level = override?.level ?? match.level;
  const weight = override?.weight ?? getPatternWeight(level, config);

  return {
    ...match,
    level,
    weight,
  };
}

function detectQingLongFanShouPattern(
  palace: NormalizedQimenPalace,
  context: PatternDetectionContext,
) {
  if (palace.天盘干 !== '戊' || palace.地盘干 !== '丙') {
    return null;
  }

  return createPatternMatch('青龙返首', 'A', palace, getPatternWeight('A', context.config));
}

function detectFeiNiaoDieXuePattern(
  palace: NormalizedQimenPalace,
  context: PatternDetectionContext,
) {
  if (palace.天盘干 !== '丙' || palace.地盘干 !== '戊') {
    return null;
  }

  return createPatternMatch('飞鸟跌穴', 'A', palace, getPatternWeight('A', context.config));
}

function detectQingLongYaoMingPattern(
  palace: NormalizedQimenPalace,
  context: PatternDetectionContext,
) {
  if (palace.天盘干 !== '戊' || palace.地盘干 !== '丁') {
    return null;
  }

  return createPatternMatch('青龙耀明', 'A', palace, getPatternWeight('A', context.config));
}

function detectQingLongZhuanGuangPattern(
  palace: NormalizedQimenPalace,
  context: PatternDetectionContext,
) {
  if (palace.天盘干 !== '丁' || palace.地盘干 !== '戊') {
    return null;
  }

  return createPatternMatch('青龙转光', 'A', palace, getPatternWeight('A', context.config));
}

function detectTianXianShiPattern(
  palace: NormalizedQimenPalace,
  context: PatternDetectionContext,
) {
  if (context.timeStemPalaceId !== palace.id) {
    return null;
  }

  if (!matchesTianXianShiWindow(context.全局时间)) {
    return null;
  }

  return createPatternMatch('天显时格', 'B', palace, getPatternWeight('B', context.config));
}

function detectSanQiDeShiPattern(
  palace: NormalizedQimenPalace,
  context: PatternDetectionContext,
) {
  if (!['乙', '丙', '丁'].includes(palace.天盘干)) {
    return null;
  }

  if (palace.门盘 !== context.值使门) {
    return null;
  }

  return createPatternMatch('三奇得使', 'B', palace, getPatternWeight('B', context.config));
}

function detectYuNvShouMenPattern(
  palace: NormalizedQimenPalace,
  context: PatternDetectionContext,
) {
  if (palace.门盘 !== context.值使门 || palace.地盘干 !== '丁') {
    return null;
  }

  return createPatternMatch('玉女守门', 'B', palace, getPatternWeight('B', context.config));
}

function detectQiYiXiangHePattern(
  palace: NormalizedQimenPalace,
  context: PatternDetectionContext,
) {
  if (!STEM_COMBINATIONS.has(`${palace.天盘干}${palace.地盘干}`)) {
    return null;
  }

  return createPatternMatch('奇仪相合', 'C', palace, getPatternWeight('C', context.config));
}

function detectMenGongHeYiPattern(
  palace: NormalizedQimenPalace,
  context: PatternDetectionContext,
) {
  const doorElement = getDoorElement(palace.门盘);

  if (!doorElement) {
    return null;
  }

  if (!isGenerating(palace.五行, doorElement) && !isGenerating(doorElement, palace.五行)) {
    return null;
  }

  return createPatternMatch('门宫和义', 'C', palace, getPatternWeight('C', context.config));
}

function detectSanQiGuiRenShengDianPattern(
  palace: NormalizedQimenPalace,
  context: PatternDetectionContext,
) {
  const matched =
    (palace.天盘干 === '乙' && palace.id === 3) ||
    (palace.天盘干 === '丙' && palace.id === 9) ||
    (palace.天盘干 === '丁' && palace.id === 7);

  if (!matched) {
    return null;
  }

  return createPatternMatch('三奇贵人升殿', 'C', palace, getPatternWeight('C', context.config));
}

function detectZhenZhaPattern(
  palace: NormalizedQimenPalace,
  context: PatternDetectionContext,
) {
  if (
    !['开门', '休门', '生门'].includes(palace.门盘) ||
    !['乙', '丙', '丁'].includes(palace.天盘干) ||
    palace.神盘 !== '太阴'
  ) {
    return null;
  }

  return createPatternMatch('真诈格', 'COMPOSITE', palace, getPatternWeight('COMPOSITE', context.config));
}

function detectTianDunPattern(
  palace: NormalizedQimenPalace,
  context: PatternDetectionContext,
) {
  if (palace.天盘干 !== '丙' || palace.地盘干 !== '丁' || palace.门盘 !== '生门') {
    return null;
  }

  return createPatternMatch('天遁格', 'COMPOSITE', palace, getPatternWeight('COMPOSITE', context.config));
}

function detectRenDunPattern(
  palace: NormalizedQimenPalace,
  context: PatternDetectionContext,
) {
  if (palace.天盘干 !== '丁' || palace.门盘 !== '休门' || palace.神盘 !== '太阴') {
    return null;
  }

  return createPatternMatch('人遁格', 'COMPOSITE', palace, getPatternWeight('COMPOSITE', context.config));
}

const PATTERN_DETECTORS: PatternDetector[] = [
  detectQingLongFanShouPattern,
  detectFeiNiaoDieXuePattern,
  detectQingLongYaoMingPattern,
  detectQingLongZhuanGuangPattern,
  detectTianXianShiPattern,
  detectSanQiDeShiPattern,
  detectYuNvShouMenPattern,
  detectQiYiXiangHePattern,
  detectMenGongHeYiPattern,
  detectSanQiGuiRenShengDianPattern,
  detectZhenZhaPattern,
  detectTianDunPattern,
  detectRenDunPattern,
];

export function normalizeQimenPatternInput(
  input: RawQimenStockInput,
): NormalizedQimenInput {
  const qimenData = input.qimen_data;
  const palaceCount = qimenData.宫位信息.length;
  const lists = [
    qimenData.天盘干.length,
    qimenData.地盘干.length,
    qimenData.门盘.length,
    qimenData.神盘.length,
  ];

  if (lists.some((value) => value !== palaceCount)) {
    throw new Error('奇门九宫输入长度不一致，无法建立吉格分析上下文。');
  }

  return {
    stockId: input.stock_id ?? null,
    stockName: input.stock_name ?? null,
    marketSignal: {
      hasBAboveGE: input.market_signal?.has_b_above_ge ?? null,
    },
    qimenData: {
      palaces: qimenData.宫位信息.map((meta, index) => ({
        index,
        id: meta.id,
        八卦: meta.八卦,
        五行: meta.五行,
        天盘干: qimenData.天盘干[index] ?? '',
        地盘干: qimenData.地盘干[index] ?? '',
        门盘: normalizeDoorName(qimenData.门盘[index] ?? ''),
        神盘: qimenData.神盘[index] ?? '',
        状态: meta.状态 ?? {},
      })),
      值使门: normalizeDoorName(qimenData.值使门),
      全局时间: qimenData.全局时间,
    },
  };
}

export function evaluateQimenAuspiciousPatterns(
  input: RawQimenStockInput,
  partialConfig: QimenPatternConfigOverride = {},
): QimenPatternEvaluation {
  const config: QimenPatternConfig = {
    ...DEFAULT_QIMEN_PATTERN_CONFIG,
    ...partialConfig,
    weights: {
      ...DEFAULT_QIMEN_PATTERN_CONFIG.weights,
      ...partialConfig.weights,
    },
    thresholds: {
      ...DEFAULT_QIMEN_PATTERN_CONFIG.thresholds,
      ...partialConfig.thresholds,
    },
    invalidatingStates:
      partialConfig.invalidatingStates ??
      DEFAULT_QIMEN_PATTERN_CONFIG.invalidatingStates,
    topEvilPatterns:
      partialConfig.topEvilPatterns ?? DEFAULT_QIMEN_PATTERN_CONFIG.topEvilPatterns,
    bullishUseShen:
      partialConfig.bullishUseShen ?? DEFAULT_QIMEN_PATTERN_CONFIG.bullishUseShen,
    patternOverrides: {
      ...DEFAULT_QIMEN_PATTERN_CONFIG.patternOverrides,
      ...partialConfig.patternOverrides,
    },
  };
  const normalized = normalizeQimenPatternInput(input);
  const context = buildPatternContext(normalized, config);
  const invalidPalaces: QimenInvalidPalace[] = [];
  const activeMatches: QimenPatternMatch[] = [];

  normalized.qimenData.palaces.forEach((palace) => {
    const reasons = getInvalidPalaceReasons(palace, config);
    const topEvilPatterns = (palace.状态.顶级凶格 ?? []).filter((item) =>
      config.topEvilPatterns.includes(item as QimenTopEvilPattern),
    );

    if (reasons.length > 0) {
      invalidPalaces.push({
        palaceId: palace.id,
        palaceLabel: formatPalaceLabel(palace),
        reasons,
        topEvilPatterns,
      });
      return;
    }

    PATTERN_DETECTORS.forEach((detector) => {
      const match = detector(palace, context);
      const overriddenMatch = match ? applyPatternOverride(match, config) : null;

      if (overriddenMatch) {
        activeMatches.push(overriddenMatch);
      }
    });
  });

  activeMatches.sort(comparePatternMatches);

  const baseScore = activeMatches.reduce((sum, item) => sum + item.weight, 0);
  const totalScore = Math.min(baseScore, 50);
  const counts = {
    COMPOSITE: activeMatches.filter((item) => item.level === 'COMPOSITE').length,
    A: activeMatches.filter((item) => item.level === 'A').length,
    B: activeMatches.filter((item) => item.level === 'B').length,
    C: activeMatches.filter((item) => item.level === 'C').length,
  };
  const valueDoorPalace =
    normalized.qimenData.palaces.find(
      (item) => item.门盘 === normalized.qimenData.值使门,
    ) ?? null;
  const shengDoorPalace =
    normalized.qimenData.palaces.find((item) => item.门盘 === '生门') ?? null;

  return {
    stockId: normalized.stockId,
    stockName: normalized.stockName,
    marketSignal: normalized.marketSignal,
    baseScore,
    totalScore,
    rating: resolveRating(totalScore, config),
    activeMatches,
    invalidPalaces,
    counts,
    corePatternsLabel: formatCorePatternsLabel(activeMatches),
    energyLabel: resolveEnergyLabel(activeMatches),
    summary: resolveSummary(activeMatches),
    corePalaces: {
      timeStemPalaceId: context.timeStemPalaceId,
      valueDoorPalaceId: valueDoorPalace?.id ?? null,
      shengDoorPalaceId: shengDoorPalace?.id ?? null,
      skyWuPalaceId: findSkyWuPalaceId(normalized.qimenData.palaces),
    },
  };
}

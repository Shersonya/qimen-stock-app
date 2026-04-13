import type {
  DragonHeadCircuitBreakerConfig,
  DragonHeadFactorKey,
  DragonHeadSettings,
  DragonHeadStrategyTemplate,
  DragonHeadThresholds,
  DragonHeadWeights,
} from '@/lib/contracts/dragon-head';
import {
  PALACE_FLAG_OPTIONS,
  QIMEN_PATTERN_LIBRARY,
  QIMEN_TOP_EVIL_PATTERN_OPTIONS,
  type PalaceFlag,
  type QimenAuspiciousPatternName,
  type QimenPatternConfigOverride,
  type QimenPatternLevel,
  type QimenPatternThresholds,
  type QimenRiskConfigOverride,
  type QimenStockRating,
  type QimenTopEvilPattern,
} from '@/lib/contracts/qimen';

export const WORKSPACE_SETTINGS_STORAGE_KEY = 'qimen-workbench-settings-v1';

export type WorkspacePatternSetting = {
  enabled: boolean;
  level: QimenPatternLevel;
  weight: number;
};

export type WorkspaceRiskSettings = {
  marketEnvironmentRequired: boolean;
  minRatingDefault: QimenStockRating | 'ALL';
  onlyEligibleDefault: boolean;
  excludeInvalidCorePalaces: boolean;
  excludeTopEvilPatterns: boolean;
  invalidatingStates: PalaceFlag[];
  topEvilPatterns: QimenTopEvilPattern[];
  bullishUseShen: string[];
};

export type WorkspaceVisualSettings = {
  ratingColors: Record<QimenStockRating, string>;
  boardAccentColor: string;
  boardStyle: 'focused' | 'dense' | 'minimal';
};

export type WorkspaceSettings = {
  patternMap: Record<QimenAuspiciousPatternName, WorkspacePatternSetting>;
  thresholds: QimenPatternThresholds;
  risk: WorkspaceRiskSettings;
  visual: WorkspaceVisualSettings;
  dragonHead: DragonHeadSettings;
};

function createDefaultPatternMap(): Record<
  QimenAuspiciousPatternName,
  WorkspacePatternSetting
> {
  return QIMEN_PATTERN_LIBRARY.reduce(
    (acc, item) => {
      acc[item.name] = {
        enabled: true,
        level: item.defaultLevel,
        weight: item.defaultWeight,
      };

      return acc;
    },
    {} as Record<QimenAuspiciousPatternName, WorkspacePatternSetting>,
  );
}

function createDefaultDragonHeadWeights(): DragonHeadWeights {
  return {
    volumeRatio: 30,
    speed10m: 30,
    driveRatio: 25,
    sealRatio: 10,
    breakoutFreq: 5,
  };
}

function createDefaultDragonHeadThresholds(): DragonHeadThresholds {
  return {
    newLeaderStrong: 90,
    oldCoreStrong: 85,
    weakLine: 80,
    topBoardStrong: 95,
    newThemeAverageStrong: 80,
    oldLeaderWeakThreshold: 70,
    themeTurnoverGrowthPct: 300,
    minFirstBoardCount: 3,
  };
}

function createDefaultDragonHeadCircuitBreaker(): DragonHeadCircuitBreakerConfig {
  return {
    enabled: true,
    limitDownCount: 50,
    yesterdayLimitUpAvgReturn: -5,
    maxBoardHeight: 3,
  };
}

function createDefaultDragonHeadStrategyTemplate(): DragonHeadStrategyTemplate {
  return {
    deathTrapFilter: {
      midCapTraits: [
        '涨幅>7%但非板块前二',
        '跟风涨停且封单<主力1/10',
        '板块强度>80但个股强度<65',
      ],
    },
    panicIndexFormula: '(跌停家数×0.3 + 炸板率×0.5 + 沪指跌幅×20) / 3',
    antiHumanTrainingProtocol: [
      '连续3笔盈利后强制冷却24h',
      '单标持仓盈利≥30%时启动阶梯止盈',
      '连续两次违背系统信号时暂停当日AI建议',
    ],
  };
}

function createDefaultDragonHeadSettings(): DragonHeadSettings {
  return {
    weights: createDefaultDragonHeadWeights(),
    thresholds: createDefaultDragonHeadThresholds(),
    circuitBreaker: createDefaultDragonHeadCircuitBreaker(),
    manual: {
      keywordLibrary: ['低空经济', '机器人', '算力', '卫星互联网'],
      blacklist: ['被监管个股'],
      weeklyTasks: [
        '更新强度计算公式权重',
        '更新新题材关键词库',
        '更新黑名单制度',
      ],
      manualReviewChecklist: [
        '政策突发利空需人工复核',
        '量化资金集体踩踏需人工复核',
        '龙虎榜席位异动需人工复核',
        '情绪周期定位需人工复核',
        '龙头气质识别需人工复核',
      ],
    },
    strategyTemplate: createDefaultDragonHeadStrategyTemplate(),
  };
}

export function createDefaultWorkspaceSettings(): WorkspaceSettings {
  return {
    patternMap: createDefaultPatternMap(),
    thresholds: {
      S: 30,
      A: 20,
      B: 10,
    },
    risk: {
      marketEnvironmentRequired: true,
      minRatingDefault: 'ALL',
      onlyEligibleDefault: true,
      excludeInvalidCorePalaces: true,
      excludeTopEvilPatterns: true,
      invalidatingStates: [...PALACE_FLAG_OPTIONS],
      topEvilPatterns: [...QIMEN_TOP_EVIL_PATTERN_OPTIONS],
      bullishUseShen: ['生门', '值符'],
    },
    visual: {
      ratingColors: {
        S: 'linear-gradient(135deg, rgba(211, 176, 92, 0.36), rgba(113, 85, 26, 0.16))',
        A: 'linear-gradient(135deg, rgba(74, 168, 132, 0.28), rgba(20, 67, 55, 0.14))',
        B: 'linear-gradient(135deg, rgba(91, 145, 214, 0.28), rgba(23, 51, 89, 0.14))',
        C: 'transparent',
      },
      boardAccentColor: '#d8b35a',
      boardStyle: 'focused',
    },
    dragonHead: createDefaultDragonHeadSettings(),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function sanitizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0,
  );
}

function sanitizeDragonHeadWeights(
  value: unknown,
  defaults: DragonHeadWeights,
): DragonHeadWeights {
  const raw = isObject(value) ? value : {};

  return (
    Object.keys(defaults) as DragonHeadFactorKey[]
  ).reduce((acc, key) => {
    acc[key] = toNumber(raw[key], defaults[key]);
    return acc;
  }, { ...defaults });
}

function sanitizeDragonHeadThresholds(
  value: unknown,
  defaults: DragonHeadThresholds,
): DragonHeadThresholds {
  const raw = isObject(value) ? value : {};

  return {
    newLeaderStrong: toNumber(raw.newLeaderStrong, defaults.newLeaderStrong),
    oldCoreStrong: toNumber(raw.oldCoreStrong, defaults.oldCoreStrong),
    weakLine: toNumber(raw.weakLine, defaults.weakLine),
    topBoardStrong: toNumber(raw.topBoardStrong, defaults.topBoardStrong),
    newThemeAverageStrong: toNumber(
      raw.newThemeAverageStrong,
      defaults.newThemeAverageStrong,
    ),
    oldLeaderWeakThreshold: toNumber(
      raw.oldLeaderWeakThreshold,
      defaults.oldLeaderWeakThreshold,
    ),
    themeTurnoverGrowthPct: toNumber(
      raw.themeTurnoverGrowthPct,
      defaults.themeTurnoverGrowthPct,
    ),
    minFirstBoardCount: toNumber(raw.minFirstBoardCount, defaults.minFirstBoardCount),
  };
}

function sanitizeDragonHeadStrategyTemplate(
  value: unknown,
  defaults: DragonHeadStrategyTemplate,
): DragonHeadStrategyTemplate {
  const raw = isObject(value) ? value : {};
  const rawDeathTrap = isObject(raw.deathTrapFilter) ? raw.deathTrapFilter : {};

  return {
    deathTrapFilter: {
      midCapTraits: sanitizeStringArray(
        rawDeathTrap.midCapTraits,
        defaults.deathTrapFilter.midCapTraits,
      ),
    },
    panicIndexFormula: toString(raw.panicIndexFormula, defaults.panicIndexFormula),
    antiHumanTrainingProtocol: sanitizeStringArray(
      raw.antiHumanTrainingProtocol,
      defaults.antiHumanTrainingProtocol,
    ),
  };
}

export function sanitizeWorkspaceSettings(value: unknown): WorkspaceSettings {
  const defaults = createDefaultWorkspaceSettings();

  if (!isObject(value)) {
    return defaults;
  }

  const patternMap = { ...defaults.patternMap };
  const rawPatternMap = isObject(value.patternMap) ? value.patternMap : {};

  QIMEN_PATTERN_LIBRARY.forEach((item) => {
    const rawItem = rawPatternMap[item.name];

    if (!isObject(rawItem)) {
      return;
    }

    patternMap[item.name] = {
      enabled: toBoolean(rawItem.enabled, defaults.patternMap[item.name].enabled),
      level:
        rawItem.level === 'COMPOSITE' ||
        rawItem.level === 'A' ||
        rawItem.level === 'B' ||
        rawItem.level === 'C'
          ? rawItem.level
          : defaults.patternMap[item.name].level,
      weight: toNumber(rawItem.weight, defaults.patternMap[item.name].weight),
    };
  });

  const thresholds = isObject(value.thresholds) ? value.thresholds : {};
  const risk = isObject(value.risk) ? value.risk : {};
  const visual = isObject(value.visual) ? value.visual : {};
  const rawRatingColors = isObject(visual.ratingColors) ? visual.ratingColors : {};
  const dragonHead = isObject(value.dragonHead) ? value.dragonHead : {};
  const defaultDragonHead = defaults.dragonHead;
  const rawManual = isObject(dragonHead.manual) ? dragonHead.manual : {};

  return {
    patternMap,
    thresholds: {
      S: toNumber(thresholds.S, defaults.thresholds.S),
      A: toNumber(thresholds.A, defaults.thresholds.A),
      B: toNumber(thresholds.B, defaults.thresholds.B),
    },
    risk: {
      marketEnvironmentRequired: toBoolean(
        risk.marketEnvironmentRequired,
        defaults.risk.marketEnvironmentRequired,
      ),
      minRatingDefault:
        risk.minRatingDefault === 'ALL' ||
        risk.minRatingDefault === 'S' ||
        risk.minRatingDefault === 'A' ||
        risk.minRatingDefault === 'B' ||
        risk.minRatingDefault === 'C'
          ? risk.minRatingDefault
          : defaults.risk.minRatingDefault,
      onlyEligibleDefault: toBoolean(
        risk.onlyEligibleDefault,
        defaults.risk.onlyEligibleDefault,
      ),
      excludeInvalidCorePalaces: toBoolean(
        risk.excludeInvalidCorePalaces,
        defaults.risk.excludeInvalidCorePalaces,
      ),
      excludeTopEvilPatterns: toBoolean(
        risk.excludeTopEvilPatterns,
        defaults.risk.excludeTopEvilPatterns,
      ),
      invalidatingStates: sanitizeStringArray(
        risk.invalidatingStates,
        defaults.risk.invalidatingStates,
      ).filter((item): item is PalaceFlag =>
        PALACE_FLAG_OPTIONS.includes(item as PalaceFlag),
      ),
      topEvilPatterns: sanitizeStringArray(
        risk.topEvilPatterns,
        defaults.risk.topEvilPatterns,
      ).filter((item): item is QimenTopEvilPattern =>
        QIMEN_TOP_EVIL_PATTERN_OPTIONS.includes(item as QimenTopEvilPattern),
      ),
      bullishUseShen: sanitizeStringArray(
        risk.bullishUseShen,
        defaults.risk.bullishUseShen,
      ),
    },
    visual: {
      ratingColors: {
        S: toString(rawRatingColors.S, defaults.visual.ratingColors.S),
        A: toString(rawRatingColors.A, defaults.visual.ratingColors.A),
        B: toString(rawRatingColors.B, defaults.visual.ratingColors.B),
        C: toString(rawRatingColors.C, defaults.visual.ratingColors.C),
      },
      boardAccentColor: toString(
        visual.boardAccentColor,
        defaults.visual.boardAccentColor,
      ),
      boardStyle:
        visual.boardStyle === 'focused' ||
        visual.boardStyle === 'dense' ||
        visual.boardStyle === 'minimal'
          ? visual.boardStyle
          : defaults.visual.boardStyle,
    },
    dragonHead: {
      weights: sanitizeDragonHeadWeights(
        dragonHead.weights,
        defaultDragonHead.weights,
      ),
      thresholds: sanitizeDragonHeadThresholds(
        dragonHead.thresholds,
        defaultDragonHead.thresholds,
      ),
      circuitBreaker: {
        enabled: toBoolean(
          isObject(dragonHead.circuitBreaker) ? dragonHead.circuitBreaker.enabled : undefined,
          defaultDragonHead.circuitBreaker.enabled,
        ),
        limitDownCount: toNumber(
          isObject(dragonHead.circuitBreaker)
            ? dragonHead.circuitBreaker.limitDownCount
            : undefined,
          defaultDragonHead.circuitBreaker.limitDownCount,
        ),
        yesterdayLimitUpAvgReturn: toNumber(
          isObject(dragonHead.circuitBreaker)
            ? dragonHead.circuitBreaker.yesterdayLimitUpAvgReturn
            : undefined,
          defaultDragonHead.circuitBreaker.yesterdayLimitUpAvgReturn,
        ),
        maxBoardHeight: toNumber(
          isObject(dragonHead.circuitBreaker)
            ? dragonHead.circuitBreaker.maxBoardHeight
            : undefined,
          defaultDragonHead.circuitBreaker.maxBoardHeight,
        ),
      },
      manual: {
        keywordLibrary: sanitizeStringArray(
          rawManual.keywordLibrary,
          defaultDragonHead.manual.keywordLibrary,
        ),
        blacklist: sanitizeStringArray(rawManual.blacklist, defaultDragonHead.manual.blacklist),
        weeklyTasks: sanitizeStringArray(
          rawManual.weeklyTasks,
          defaultDragonHead.manual.weeklyTasks,
        ),
        manualReviewChecklist: sanitizeStringArray(
          rawManual.manualReviewChecklist,
          defaultDragonHead.manual.manualReviewChecklist,
        ),
      },
      strategyTemplate: sanitizeDragonHeadStrategyTemplate(
        dragonHead.strategyTemplate,
        defaultDragonHead.strategyTemplate,
      ),
    },
  };
}

export function serializeWorkspaceSettings(settings: WorkspaceSettings) {
  return JSON.stringify(settings, null, 2);
}

export function buildPatternConfigOverride(
  settings: WorkspaceSettings,
): QimenPatternConfigOverride {
  const patternOverrides: NonNullable<QimenPatternConfigOverride['patternOverrides']> = {};

  (
    Object.entries(settings.patternMap) as Array<
      [QimenAuspiciousPatternName, WorkspacePatternSetting]
    >
  ).forEach(([name, item]) => {
    patternOverrides[name] = {
      enabled: item.enabled,
      level: item.level,
      weight: item.weight,
    };
  });

  return {
    thresholds: settings.thresholds,
    patternOverrides,
    invalidatingStates: settings.risk.invalidatingStates,
    topEvilPatterns: settings.risk.topEvilPatterns,
    bullishUseShen: settings.risk.bullishUseShen,
  };
}

export function buildRiskConfigOverride(
  settings: WorkspaceSettings,
): QimenRiskConfigOverride {
  return {
    excludeInvalidCorePalaces: settings.risk.excludeInvalidCorePalaces,
    excludeTopEvilPatterns: settings.risk.excludeTopEvilPatterns,
  };
}

export function buildDragonHeadConfigOverride(settings: WorkspaceSettings): DragonHeadSettings {
  return settings.dragonHead;
}

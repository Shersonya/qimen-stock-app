import type {
  DragonHeadCandidate,
  DragonHeadCandidatesRequest,
  DragonHeadCandidatesResponse,
  DragonHeadCircuitBreakerStatus,
  DragonHeadFactorBreakdown,
  DragonHeadFactorKey,
  DragonHeadMonitorRequest,
  DragonHeadMonitorResponse,
  DragonHeadProviderStatus,
  DragonHeadSettings,
  PositionAllocationResult,
  StrengthScoreResult,
  TrendSwitchInstruction,
  TrendSwitchState,
} from '@/lib/contracts/dragon-head';
import {
  getDemoDragonHeadCandidatesResponse,
  getDemoDragonHeadMonitorResponse,
} from '@/lib/demo-fixtures';
import {
  createDragonHeadMarketProvider,
  type DragonHeadCandidateInput,
} from '@/lib/services/dragon-head-provider';
import { createDefaultWorkspaceSettings } from '@/lib/workspace-settings';

const FORMULA_VERSION = 'dragon-head-v1';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundNumber(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function resolveDragonHeadSettings(value?: DragonHeadSettings): DragonHeadSettings {
  return value ?? createDefaultWorkspaceSettings().dragonHead;
}

function normalizeFactorValue(
  key: DragonHeadFactorKey,
  rawValue: number | null,
): number {
  if (rawValue === null) {
    return 0;
  }

  switch (key) {
    case 'volumeRatio':
      return clamp((rawValue - 1) / 2, 0, 1);
    case 'speed10m':
      return clamp(rawValue / 0.08, 0, 1);
    case 'driveRatio':
      return clamp(rawValue / 2, 0, 1);
    case 'sealRatio':
      return clamp(rawValue / 0.12, 0, 1);
    case 'breakoutFreq':
      return clamp(rawValue / 5, 0, 1);
    default:
      return 0;
  }
}

function factorLabel(key: DragonHeadFactorKey) {
  switch (key) {
    case 'volumeRatio':
      return '量比';
    case 'speed10m':
      return '10分钟涨速';
    case 'driveRatio':
      return '板块带动比';
    case 'sealRatio':
      return '封单金额比';
    case 'breakoutFreq':
      return '5分钟突破频次';
    default:
      return key;
  }
}

export function calculateStrengthScore(args: {
  weights: DragonHeadSettings['weights'];
  rawFactors: Record<DragonHeadFactorKey, number | null>;
  availability?: Partial<Record<DragonHeadFactorKey, boolean>>;
  proxyNotes?: Partial<Record<DragonHeadFactorKey, string>>;
  sourceStatus: DragonHeadProviderStatus[];
}): StrengthScoreResult {
  const factorBreakdown = (
    Object.entries(args.weights) as Array<[DragonHeadFactorKey, number]>
  ).map(([key, weight]) => {
    const rawValue = args.rawFactors[key];
    const available = args.availability?.[key] ?? rawValue !== null;
    const normalized = available ? normalizeFactorValue(key, rawValue) : 0;
    const contribution = roundNumber(normalized * weight);

    return {
      key,
      label: factorLabel(key),
      weight,
      rawValue,
      normalized: roundNumber(normalized, 4),
      contribution,
      available,
      proxy: Boolean(args.proxyNotes?.[key]),
      note: args.proxyNotes?.[key],
    } satisfies DragonHeadFactorBreakdown;
  });

  const missingFactors = factorBreakdown
    .filter((factor) => !factor.available || factor.rawValue === null)
    .map((factor) => factor.key);
  const score = roundNumber(
    factorBreakdown.reduce((total, factor) => total + factor.contribution, 0),
  );
  const confidence = roundNumber(clamp(1 - missingFactors.length * 0.18, 0.2, 1));

  return {
    score,
    formulaVersion: FORMULA_VERSION,
    factorBreakdown,
    missingFactors,
    confidence,
    sourceStatus: args.sourceStatus,
  };
}

export function positionAllocation(args: {
  newStrength: number;
  oldStrength: number;
  topStrength: number;
  circuitBreakerTriggered?: boolean;
}): PositionAllocationResult {
  if (args.circuitBreakerTriggered) {
    return {
      newLeaderPercent: 0,
      oldCorePercent: 0,
      topBoardPercent: 0,
      forcedFlat: true,
      reason: '灾难规避条件已触发，强制空仓并停止 AI 建议。',
    };
  }

  if (args.newStrength >= 90) {
    return {
      newLeaderPercent: 50,
      oldCorePercent: 30,
      topBoardPercent: 20,
      forcedFlat: false,
      reason: '新主线强度达到 90 分以上，优先配置新主线龙头。',
    };
  }

  if (args.newStrength < 90 && args.oldStrength >= 85) {
    return {
      newLeaderPercent: 30,
      oldCorePercent: 50,
      topBoardPercent: 20,
      forcedFlat: false,
      reason: '新主线尚未完全接棒，保留老核心主仓。',
    };
  }

  if (args.newStrength < 80 && args.oldStrength < 80 && args.topStrength >= 95) {
    return {
      newLeaderPercent: 0,
      oldCorePercent: 0,
      topBoardPercent: 100,
      forcedFlat: false,
      reason: '双强度不足但最高标极强，切换为只观察最高标。',
    };
  }

  return {
    newLeaderPercent: 0,
    oldCorePercent: 0,
    topBoardPercent: 0,
    forcedFlat: true,
    reason: '当前强度未达可执行阈值，维持空仓观望。',
  };
}

export function detectTrendSwitch(args: {
  newThemeFirstBoardCount: number;
  newThemeAverageStrength: number;
  oldLeaderStrength: number;
  oldLeaderWeakDays: number;
  topBoardStrength: number;
  themeTurnoverGrowthPct: number;
  thresholds: DragonHeadSettings['thresholds'];
}): TrendSwitchState {
  const {
    newThemeFirstBoardCount,
    newThemeAverageStrength,
    oldLeaderStrength,
    oldLeaderWeakDays,
    topBoardStrength,
    themeTurnoverGrowthPct,
    thresholds,
  } = args;

  let instruction: TrendSwitchInstruction = 'STAY';
  let summary = '暂无足够证据确认主线切换，维持观察。';

  if (
    newThemeFirstBoardCount >= thresholds.minFirstBoardCount &&
    newThemeAverageStrength > thresholds.newThemeAverageStrong &&
    oldLeaderStrength < thresholds.oldLeaderWeakThreshold &&
    oldLeaderWeakDays >= 2 &&
    themeTurnoverGrowthPct > thresholds.themeTurnoverGrowthPct
  ) {
    instruction = 'SWITCH_OLD';
    summary = '新题材首板数量、平均强度和资金增速同时满足条件，老主线已进入连续弱化阶段。';
  } else if (
    newThemeFirstBoardCount >= thresholds.minFirstBoardCount &&
    newThemeAverageStrength > thresholds.newThemeAverageStrong
  ) {
    instruction = 'HOLD_NEW';
    summary = '新题材已有成型迹象，但老主线尚未明确连续失效，先以持有新线观察为主。';
  } else if (
    newThemeAverageStrength < thresholds.weakLine &&
    oldLeaderStrength < thresholds.weakLine &&
    topBoardStrength >= thresholds.topBoardStrong
  ) {
    instruction = 'TOP_ONLY';
    summary = '新老双主线均弱，当前只保留最高标观察价值。';
  }

  return {
    instruction,
    newThemeFirstBoardCount,
    newThemeAverageStrength,
    oldLeaderStrength,
    oldLeaderWeakDays,
    topBoardStrength,
    themeTurnoverGrowthPct,
    summary,
  };
}

export function evaluateCircuitBreaker(args: {
  metrics: DragonHeadCircuitBreakerStatus['metrics'];
  config: DragonHeadSettings['circuitBreaker'];
}): DragonHeadCircuitBreakerStatus {
  const reasons: string[] = [];

  if (args.config.enabled && args.metrics.limitDownCount >= args.config.limitDownCount) {
    reasons.push('两市跌停≥50家');
  }

  if (
    args.config.enabled &&
    args.metrics.yesterdayLimitUpAvgReturn <= args.config.yesterdayLimitUpAvgReturn
  ) {
    reasons.push('昨日涨停今均幅≤-5%');
  }

  if (args.config.enabled && args.metrics.maxBoardHeight <= args.config.maxBoardHeight) {
    reasons.push('空间板高度≤3板');
  }

  return {
    triggered: args.config.enabled && reasons.length > 0,
    reasons,
    metrics: args.metrics,
  };
}

function createCandidateFromInput(
  input: DragonHeadCandidateInput,
  strength: StrengthScoreResult,
  newThemeLabel: string,
  oldThemeLabel: string,
  maxBoardHeight: number,
): DragonHeadCandidate {
  const limitUpCount = input.limitUpCount ?? 0;

  return {
    stockCode: input.stockCode,
    stockName: input.stockName,
    market: input.market,
    sector: input.sector,
    latestPrice: input.latestPrice,
    latestChangePct: input.latestChangePct,
    boardChangePct: input.boardChangePct,
    limitUpCount: input.limitUpCount,
    signalTags: input.signalTags,
    isNewThemeLeader: Boolean(input.sector && input.sector === newThemeLabel && limitUpCount <= 1),
    isOldCoreLeader: Boolean(input.sector && input.sector === oldThemeLabel && limitUpCount >= 2),
    isTopBoard: limitUpCount === maxBoardHeight && maxBoardHeight > 0,
    canAddToPool: strength.score >= 35,
    reviewFlags: input.reviewFlags,
    strength,
  };
}

function pickThemeLabels(inputs: DragonHeadCandidateInput[]) {
  const firstBoardCounts = new Map<string, number>();
  const activeCounts = new Map<string, number>();

  inputs.forEach((item) => {
    if (item.sector) {
      activeCounts.set(item.sector, (activeCounts.get(item.sector) ?? 0) + 1);
    }

    if (item.sector && (item.limitUpCount ?? 0) <= 1) {
      firstBoardCounts.set(item.sector, (firstBoardCounts.get(item.sector) ?? 0) + 1);
    }
  });

  const newThemeLabel =
    [...firstBoardCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ??
    '未识别新题材';
  const oldThemeLabel =
    [...activeCounts.entries()]
      .filter(([label]) => label !== newThemeLabel)
      .sort((left, right) => right[1] - left[1])[0]?.[0] ?? '未识别老主线';

  return {
    newThemeLabel,
    oldThemeLabel,
  };
}

function averageStrengthBySector(items: DragonHeadCandidate[], sector: string) {
  const matches = items.filter((item) => item.sector === sector);

  if (matches.length === 0) {
    return 0;
  }

  return roundNumber(
    matches.reduce((total, item) => total + item.strength.score, 0) / matches.length,
  );
}

async function buildLiveSnapshot(
  config: DragonHeadSettings,
): Promise<{ monitor: DragonHeadMonitorResponse; candidates: DragonHeadCandidatesResponse }> {
  const provider = createDragonHeadMarketProvider();
  const providerSnapshot = await provider.getSnapshot(config);
  const { newThemeLabel, oldThemeLabel } = pickThemeLabels(providerSnapshot.candidates);
  const maxBoardHeight = providerSnapshot.candidates.reduce(
    (maxValue, item) => Math.max(maxValue, item.limitUpCount ?? 0),
    0,
  );

  const candidateItems = providerSnapshot.candidates.map((item) => {
    const driveRatio =
      item.latestChangePct !== null && item.boardChangePct !== null
        ? item.latestChangePct / Math.max(item.boardChangePct, 0.01)
        : null;
    const strength = calculateStrengthScore({
      weights: config.weights,
      rawFactors: {
        volumeRatio: item.volumeRatio,
        speed10m: item.speed10m,
        driveRatio,
        sealRatio: item.sealRatio,
        breakoutFreq: item.breakoutFreq,
      },
      availability: {
        volumeRatio: item.volumeRatio !== null,
        speed10m: item.speed10m !== null,
        driveRatio: driveRatio !== null,
        sealRatio: item.sealRatio !== null,
        breakoutFreq: item.breakoutFreq !== null,
      } as Partial<Record<DragonHeadFactorKey, boolean>>,
      proxyNotes: {
        volumeRatio: item.volumeRatio !== null ? '量比来自日线代理数据。' : undefined,
        driveRatio: driveRatio !== null ? '板块带动比使用板块日线代理均值。' : undefined,
      },
      sourceStatus: providerSnapshot.sourceStatus,
    });

    return createCandidateFromInput(item, strength, newThemeLabel, oldThemeLabel, maxBoardHeight);
  }).sort((left, right) => right.strength.score - left.strength.score);

  const newThemeAverageStrength = averageStrengthBySector(candidateItems, newThemeLabel);
  const newThemeFirstBoardCount = candidateItems.filter(
    (item) => item.sector === newThemeLabel && (item.limitUpCount ?? 0) <= 1,
  ).length;
  const oldLeader = candidateItems.find((item) => item.sector === oldThemeLabel) ?? candidateItems[0];
  const topBoard = candidateItems.find((item) => item.isTopBoard) ?? candidateItems[0];
  const oldLeaderStrength = oldLeader?.strength.score ?? 0;
  const oldLeaderWeakDays =
    oldLeaderStrength < config.thresholds.oldLeaderWeakThreshold ? 2 : 0;
  const themeTurnoverGrowthPct = 0;
  const circuitBreaker = evaluateCircuitBreaker({
    metrics: {
      limitDownCount: 0,
      yesterdayLimitUpAvgReturn:
        candidateItems.length > 0
          ? roundNumber(
              candidateItems.reduce(
                (total, item) => total + (item.latestChangePct ?? 0),
                0,
              ) / candidateItems.length,
            )
          : 0,
      maxBoardHeight,
    },
    config: config.circuitBreaker,
  });
  const trendSwitch = detectTrendSwitch({
    newThemeFirstBoardCount,
    newThemeAverageStrength,
    oldLeaderStrength,
    oldLeaderWeakDays,
    topBoardStrength: topBoard?.strength.score ?? 0,
    themeTurnoverGrowthPct,
    thresholds: config.thresholds,
  });
  const allocation = positionAllocation({
    newStrength: newThemeAverageStrength,
    oldStrength: oldLeaderStrength,
    topStrength: topBoard?.strength.score ?? 0,
    circuitBreakerTriggered: circuitBreaker.triggered,
  });
  const aiAdviceEnabled = !circuitBreaker.triggered;
  const summary = aiAdviceEnabled
    ? '当前以日线代理和涨停样本生成候选列表，缺失盘口/资金流因子时会自动降级评分。'
    : '灾难规避条件已触发，当前只保留观察列表，暂停 AI 入池建议。';

  return {
    monitor: {
      asOf: providerSnapshot.asOf,
      aiAdviceEnabled,
      summary,
      trendSwitch,
      positionAllocation: allocation,
      circuitBreaker,
      newTheme: {
        label: newThemeLabel,
        averageStrength: newThemeAverageStrength,
        firstBoardCount: newThemeFirstBoardCount,
      },
      oldTheme: {
        label: oldThemeLabel,
        leaderStrength: oldLeaderStrength,
        weakDays: oldLeaderWeakDays,
      },
      topBoard: {
        label: topBoard?.stockName ?? '暂无',
        strength: topBoard?.strength.score ?? 0,
      },
      sourceStatus: providerSnapshot.sourceStatus,
      manualReviewChecklist: config.manual.manualReviewChecklist,
    },
    candidates: {
      asOf: providerSnapshot.asOf,
      total: candidateItems.length,
      aiAdviceEnabled,
      summary,
      items: candidateItems.map((item) =>
        aiAdviceEnabled
          ? item
          : {
              ...item,
              canAddToPool: false,
              reviewFlags: [...item.reviewFlags, '熔断生效，暂停 AI 入池建议'],
            },
      ),
      sourceStatus: providerSnapshot.sourceStatus,
      manualReviewChecklist: config.manual.manualReviewChecklist,
    },
  };
}

export async function getDragonHeadMonitor(
  request: DragonHeadMonitorRequest = {},
): Promise<DragonHeadMonitorResponse> {
  if (request.mode && request.mode !== 'live') {
    return getDemoDragonHeadMonitorResponse(request.mode);
  }

  const config = resolveDragonHeadSettings(request.dragonHeadConfigOverride);
  const snapshot = await buildLiveSnapshot(config);

  return snapshot.monitor;
}

export async function getDragonHeadCandidates(
  request: DragonHeadCandidatesRequest = {},
): Promise<DragonHeadCandidatesResponse> {
  if (request.mode && request.mode !== 'live') {
    return getDemoDragonHeadCandidatesResponse(request.mode);
  }

  const config = resolveDragonHeadSettings(request.dragonHeadConfigOverride);
  const snapshot = await buildLiveSnapshot(config);

  return snapshot.candidates;
}

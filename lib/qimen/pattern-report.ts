import type {
  MarketScreenPatternSummary,
  MarketScreenResultItem,
  QimenPatternAnalysis,
  QimenPatternLevel,
  QimenRiskConfigOverride,
  QimenPatternTone,
  QimenResult,
} from '@/lib/contracts/qimen';
import type {
  QimenInvalidPalace,
  QimenPatternEvaluation,
  QimenPatternMatch,
} from '@/lib/qimen/auspicious-patterns';

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

const DEFAULT_MARKET_RISK_CONFIG: Required<QimenRiskConfigOverride> = {
  excludeInvalidCorePalaces: true,
  excludeTopEvilPatterns: true,
};

function resolveTone(
  matches: QimenPatternMatch[],
  invalidPalace: QimenInvalidPalace | undefined,
): QimenPatternTone {
  if (invalidPalace) {
    return 'muted';
  }

  if (matches.some((match) => match.level === 'COMPOSITE' || match.level === 'A')) {
    return 'gold';
  }

  if (matches.some((match) => match.level === 'B')) {
    return 'orange';
  }

  if (matches.some((match) => match.level === 'C')) {
    return 'blue';
  }

  return 'none';
}

function resolvePredictedDirection(bullishSignal: boolean) {
  return bullishSignal ? '涨' : '观望';
}

function getHourPatternNames(
  matches: QimenPatternMatch[],
  timeStemPalaceId: number | null,
) {
  if (!timeStemPalaceId) {
    return [];
  }

  return uniqueStrings(
    matches
      .filter((match) => match.palaceId === timeStemPalaceId)
      .map((match) => match.name),
  );
}

export function resolvePatternExclusionReason(
  item: MarketScreenResultItem,
  evaluation: QimenPatternEvaluation,
  riskConfig: QimenRiskConfigOverride = DEFAULT_MARKET_RISK_CONFIG,
): string | null {
  if (
    evaluation.counts.COMPOSITE === 0 &&
    evaluation.counts.A === 0 &&
    evaluation.counts.B === 0
  ) {
    return '无 A/B 级核心动力';
  }

  const protectedPalaceIds = new Set<number>(
    [
      item.hourWindow.position,
      evaluation.corePalaces.shengDoorPalaceId,
      evaluation.corePalaces.skyWuPalaceId,
    ].filter((value): value is number => Boolean(value)),
  );
  const invalidProtectedPalace = evaluation.invalidPalaces.find((palace) => {
    return protectedPalaceIds.has(palace.palaceId);
  });

  if (riskConfig.excludeInvalidCorePalaces && invalidProtectedPalace) {
    return `核心用神受制: ${invalidProtectedPalace.palaceLabel} ${invalidProtectedPalace.reasons.join('/')}`;
  }

  const topEvilPalace = evaluation.invalidPalaces.find((palace) => {
    return palace.topEvilPatterns.length > 0;
  });

  if (riskConfig.excludeTopEvilPatterns && topEvilPalace) {
    return `命中顶级凶格: ${topEvilPalace.palaceLabel} ${topEvilPalace.topEvilPatterns.join('/')}`;
  }

  return null;
}

export function comparePatternLevelCount<
  T extends {
    patternSummary?: {
      counts: Record<QimenPatternLevel, number>;
      totalScore: number;
    };
    stock: {
      code: string;
    };
  },
>(left: T, right: T) {
  const leftSummary = left.patternSummary;
  const rightSummary = right.patternSummary;

  if ((rightSummary?.totalScore ?? 0) !== (leftSummary?.totalScore ?? 0)) {
    return (rightSummary?.totalScore ?? 0) - (leftSummary?.totalScore ?? 0);
  }

  if ((rightSummary?.counts.COMPOSITE ?? 0) !== (leftSummary?.counts.COMPOSITE ?? 0)) {
    return (rightSummary?.counts.COMPOSITE ?? 0) - (leftSummary?.counts.COMPOSITE ?? 0);
  }

  if ((rightSummary?.counts.A ?? 0) !== (leftSummary?.counts.A ?? 0)) {
    return (rightSummary?.counts.A ?? 0) - (leftSummary?.counts.A ?? 0);
  }

  if ((rightSummary?.counts.B ?? 0) !== (leftSummary?.counts.B ?? 0)) {
    return (rightSummary?.counts.B ?? 0) - (leftSummary?.counts.B ?? 0);
  }

  return left.stock.code.localeCompare(right.stock.code);
}

export function buildMarketPatternSummary(
  item: MarketScreenResultItem,
  evaluation: QimenPatternEvaluation,
  riskConfig: QimenRiskConfigOverride = DEFAULT_MARKET_RISK_CONFIG,
): MarketScreenPatternSummary {
  const hourPatternNames = getHourPatternNames(
    evaluation.activeMatches,
    evaluation.corePalaces.timeStemPalaceId,
  );
  const exclusionReason = resolvePatternExclusionReason(item, evaluation, riskConfig);
  const bullishSignal =
    item.hourWindow.door === '生门' || item.hourWindow.god === '值符';

  return {
    totalScore: evaluation.totalScore,
    rating: evaluation.rating,
    energyLabel: evaluation.energyLabel,
    summary: evaluation.summary,
    corePatternsLabel: evaluation.corePatternsLabel,
    matchedPatternNames: uniqueStrings(
      evaluation.activeMatches.map((match) => match.name),
    ),
    hourPatternNames,
    counts: evaluation.counts,
    bullishSignal,
    predictedDirection: resolvePredictedDirection(bullishSignal),
    isEligible: exclusionReason === null,
    exclusionReason,
    palacePositions: uniqueStrings(
      evaluation.activeMatches.map((match) => `${match.palaceId}`),
    ).map((value) => Number(value)),
    matches: evaluation.activeMatches,
    invalidPalaces: evaluation.invalidPalaces.map((palace) => ({
      palaceId: palace.palaceId,
      palaceLabel: palace.palaceLabel,
      reasons: palace.reasons,
      topEvilPatterns: palace.topEvilPatterns,
    })),
  };
}

export function buildQimenPatternAnalysis(
  qimen: QimenResult,
  evaluation: QimenPatternEvaluation,
): QimenPatternAnalysis {
  const timeStemPalaceId = evaluation.corePalaces.timeStemPalaceId;
  const bullishHourPalace = qimen.palaces.find(
    (palace) => palace.position === timeStemPalaceId,
  );
  const bullishSignal = Boolean(
    bullishHourPalace &&
      (bullishHourPalace.door === '生门' || bullishHourPalace.god === '值符'),
  );
  const invalidPalaces = evaluation.invalidPalaces.map((palace) => ({
    palaceId: palace.palaceId,
    palaceLabel: palace.palaceLabel,
    reasons: palace.reasons,
    topEvilPatterns: palace.topEvilPatterns,
  }));

  return {
    totalScore: evaluation.totalScore,
    rating: evaluation.rating,
    energyLabel: evaluation.energyLabel,
    summary: evaluation.summary,
    corePatternsLabel: evaluation.corePatternsLabel,
    bullishSignal,
    predictedDirection: resolvePredictedDirection(bullishSignal),
    matchedPatternNames: uniqueStrings(
      evaluation.activeMatches.map((match) => match.name),
    ),
    hourPatternNames: getHourPatternNames(
      evaluation.activeMatches,
      timeStemPalaceId,
    ),
    counts: evaluation.counts,
    invalidPalaces,
    palaceAnnotations: qimen.palaces.map((palace) => {
      const matches = evaluation.activeMatches.filter(
        (match) => match.palaceId === palace.position,
      );
      const invalidPalace = evaluation.invalidPalaces.find(
        (item) => item.palaceId === palace.position,
      );

      return {
        palaceIndex: palace.index,
        palacePosition: palace.position,
        palaceName: palace.name,
        tone: resolveTone(matches, invalidPalace),
        isHourPalace: palace.position === timeStemPalaceId,
        isValueDoorPalace: palace.position === evaluation.corePalaces.valueDoorPalaceId,
        isShengDoorPalace: palace.position === evaluation.corePalaces.shengDoorPalaceId,
        patternNames: uniqueStrings(matches.map((match) => match.name)),
        patterns: matches,
        invalidReasons: invalidPalace?.reasons ?? [],
        topEvilPatterns: invalidPalace?.topEvilPatterns ?? [],
      };
    }),
  };
}

/** @jest-environment node */

import {
  calculateStrengthScore,
  detectTrendSwitch,
  evaluateCircuitBreaker,
  positionAllocation,
} from '@/lib/services/dragon-head';
import { createDefaultWorkspaceSettings } from '@/lib/workspace-settings';

describe('dragon-head service helpers', () => {
  const settings = createDefaultWorkspaceSettings().dragonHead;

  it('calculates weighted strength scores with normalized factors', () => {
    const result = calculateStrengthScore({
      weights: settings.weights,
      rawFactors: {
        volumeRatio: 3,
        speed10m: 0.08,
        driveRatio: 2,
        sealRatio: 0.12,
        breakoutFreq: 5,
      },
      sourceStatus: [],
    });

    expect(result.score).toBe(100);
    expect(result.confidence).toBe(1);
    expect(result.missingFactors).toEqual([]);
  });

  it('drops confidence and marks missing factors when realtime fields are unavailable', () => {
    const result = calculateStrengthScore({
      weights: settings.weights,
      rawFactors: {
        volumeRatio: 2.4,
        speed10m: null,
        driveRatio: 1.6,
        sealRatio: null,
        breakoutFreq: null,
      },
      sourceStatus: [],
    });

    expect(result.missingFactors).toEqual(['speed10m', 'sealRatio', 'breakoutFreq']);
    expect(result.confidence).toBeLessThan(1);
    expect(result.score).toBeGreaterThan(0);
  });

  it('returns the planned position allocation truth table', () => {
    expect(
      positionAllocation({
        newStrength: 91,
        oldStrength: 83,
        topStrength: 90,
      }),
    ).toMatchObject({
      newLeaderPercent: 50,
      oldCorePercent: 30,
      topBoardPercent: 20,
      forcedFlat: false,
    });

    expect(
      positionAllocation({
        newStrength: 75,
        oldStrength: 86,
        topStrength: 88,
      }),
    ).toMatchObject({
      newLeaderPercent: 30,
      oldCorePercent: 50,
      topBoardPercent: 20,
      forcedFlat: false,
    });

    expect(
      positionAllocation({
        newStrength: 72,
        oldStrength: 79,
        topStrength: 96,
      }),
    ).toMatchObject({
      newLeaderPercent: 0,
      oldCorePercent: 0,
      topBoardPercent: 100,
      forcedFlat: false,
    });

    expect(
      positionAllocation({
        newStrength: 70,
        oldStrength: 70,
        topStrength: 80,
      }),
    ).toMatchObject({
      newLeaderPercent: 0,
      oldCorePercent: 0,
      topBoardPercent: 0,
      forcedFlat: true,
    });
  });

  it('detects trend-switch instructions from threshold combinations', () => {
    expect(
      detectTrendSwitch({
        newThemeFirstBoardCount: 3,
        newThemeAverageStrength: 88,
        oldLeaderStrength: 65,
        oldLeaderWeakDays: 2,
        topBoardStrength: 80,
        themeTurnoverGrowthPct: 320,
        thresholds: settings.thresholds,
      }).instruction,
    ).toBe('SWITCH_OLD');

    expect(
      detectTrendSwitch({
        newThemeFirstBoardCount: 3,
        newThemeAverageStrength: 88,
        oldLeaderStrength: 78,
        oldLeaderWeakDays: 1,
        topBoardStrength: 83,
        themeTurnoverGrowthPct: 200,
        thresholds: settings.thresholds,
      }).instruction,
    ).toBe('HOLD_NEW');

    expect(
      detectTrendSwitch({
        newThemeFirstBoardCount: 1,
        newThemeAverageStrength: 75,
        oldLeaderStrength: 76,
        oldLeaderWeakDays: 2,
        topBoardStrength: 96,
        themeTurnoverGrowthPct: 100,
        thresholds: settings.thresholds,
      }).instruction,
    ).toBe('TOP_ONLY');

    expect(
      detectTrendSwitch({
        newThemeFirstBoardCount: 1,
        newThemeAverageStrength: 70,
        oldLeaderStrength: 82,
        oldLeaderWeakDays: 0,
        topBoardStrength: 84,
        themeTurnoverGrowthPct: 100,
        thresholds: settings.thresholds,
      }).instruction,
    ).toBe('STAY');
  });

  it('triggers circuit breaker when any disaster threshold is hit', () => {
    const result = evaluateCircuitBreaker({
      config: settings.circuitBreaker,
      metrics: {
        limitDownCount: 60,
        yesterdayLimitUpAvgReturn: -6,
        maxBoardHeight: 3,
      },
    });

    expect(result.triggered).toBe(true);
    expect(result.reasons).toEqual([
      '两市跌停≥50家',
      '昨日涨停今均幅≤-5%',
      '空间板高度≤3板',
    ]);
  });
});

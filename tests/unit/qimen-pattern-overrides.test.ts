/** @jest-environment node */

import { analyzeStockForMarketScreen } from '@/lib/qimen/analysis';
import { evaluateQimenAuspiciousPatterns } from '@/lib/qimen/auspicious-patterns';

describe('qimen pattern overrides', () => {
  const patternInput = analyzeStockForMarketScreen({
    code: '600519',
    name: '贵州茅台',
    market: 'SH',
    listingDate: '2001-08-27',
  }).patternInput;

  it('applies per-pattern weight and level overrides', () => {
    const result = evaluateQimenAuspiciousPatterns(patternInput, {
      patternOverrides: {
        青龙返首: {
          enabled: true,
          level: 'COMPOSITE',
          weight: 18,
        },
      },
    });
    const overriddenMatch = result.activeMatches.find((item) => item.name === '青龙返首');

    expect(overriddenMatch).toMatchObject({
      name: '青龙返首',
      level: 'COMPOSITE',
      weight: 18,
    });
    expect(result.counts.COMPOSITE).toBeGreaterThan(0);
    expect(result.totalScore).toBeGreaterThan(30);
  });

  it('disables overridden patterns without affecting the rest of the result set', () => {
    const baseline = evaluateQimenAuspiciousPatterns(patternInput);
    const disabled = evaluateQimenAuspiciousPatterns(patternInput, {
      patternOverrides: {
        青龙返首: {
          enabled: false,
        },
      },
    });

    expect(baseline.activeMatches.some((item) => item.name === '青龙返首')).toBe(true);
    expect(disabled.activeMatches.some((item) => item.name === '青龙返首')).toBe(false);
    expect(disabled.totalScore).toBeLessThan(baseline.totalScore);
  });
});

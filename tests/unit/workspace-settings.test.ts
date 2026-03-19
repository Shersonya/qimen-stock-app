/** @jest-environment node */

import {
  buildPatternConfigOverride,
  buildRiskConfigOverride,
  createDefaultWorkspaceSettings,
  sanitizeWorkspaceSettings,
  serializeWorkspaceSettings,
} from '@/lib/workspace-settings';

describe('workspace settings helpers', () => {
  it('sanitizes partial input with defaults and valid enums', () => {
    const settings = sanitizeWorkspaceSettings({
      patternMap: {
        青龙返首: {
          enabled: false,
          level: 'B',
          weight: 21,
        },
      },
      risk: {
        minRatingDefault: 'A',
        invalidatingStates: ['空亡', '未知状态'],
      },
      visual: {
        boardAccentColor: '#ffffff',
      },
    });

    expect(settings.patternMap.青龙返首).toMatchObject({
      enabled: false,
      level: 'B',
      weight: 21,
    });
    expect(settings.risk.minRatingDefault).toBe('A');
    expect(settings.risk.invalidatingStates).toEqual(['空亡']);
    expect(settings.visual.boardAccentColor).toBe('#ffffff');
  });

  it('serializes settings and builds API override payloads', () => {
    const settings = createDefaultWorkspaceSettings();

    settings.patternMap.青龙返首 = {
      enabled: false,
      level: 'C',
      weight: 5,
    };
    settings.risk.excludeTopEvilPatterns = false;

    const raw = serializeWorkspaceSettings(settings);
    const patternOverride = buildPatternConfigOverride(settings);
    const riskOverride = buildRiskConfigOverride(settings);

    expect(raw).toContain('"青龙返首"');
    expect(patternOverride.patternOverrides?.青龙返首).toEqual({
      enabled: false,
      level: 'C',
      weight: 5,
    });
    expect(riskOverride).toEqual({
      excludeInvalidCorePalaces: true,
      excludeTopEvilPatterns: false,
    });
  });
});

import type { MarketDashboardRequest } from '@/lib/contracts/qimen';
import {
  buildPatternConfigOverride,
  buildRiskConfigOverride,
  createDefaultWorkspaceSettings,
} from '@/lib/workspace-settings';

type SerializableMarketDashboardRequest = {
  patternConfigOverride: MarketDashboardRequest['patternConfigOverride'] | null;
  riskConfigOverride: MarketDashboardRequest['riskConfigOverride'] | null;
};

export function normalizeMarketDashboardRequest(
  request: MarketDashboardRequest = {},
): SerializableMarketDashboardRequest {
  return JSON.parse(
    JSON.stringify({
      patternConfigOverride: request.patternConfigOverride ?? null,
      riskConfigOverride: request.riskConfigOverride ?? null,
    }),
  ) as SerializableMarketDashboardRequest;
}

export function serializeMarketDashboardRequest(
  request: MarketDashboardRequest = {},
): string {
  return JSON.stringify(normalizeMarketDashboardRequest(request));
}

export function getDefaultMarketDashboardRequest(): MarketDashboardRequest {
  const settings = createDefaultWorkspaceSettings();

  return {
    patternConfigOverride: buildPatternConfigOverride(settings),
    riskConfigOverride: buildRiskConfigOverride(settings),
  };
}

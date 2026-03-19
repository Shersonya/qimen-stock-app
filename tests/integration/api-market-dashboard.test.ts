/** @jest-environment node */

import { NextRequest } from 'next/server';

import { POST } from '@/app/api/market-dashboard/route';
import { getMarketDashboard } from '@/lib/services/market-dashboard';

jest.mock('@/lib/services/market-dashboard');

const mockedGetMarketDashboard = jest.mocked(getMarketDashboard);

function createRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/market-dashboard', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/market-dashboard', () => {
  beforeEach(() => {
    mockedGetMarketDashboard.mockReset();
  });

  it('returns aggregated dashboard data and forwards override payloads', async () => {
    mockedGetMarketDashboard.mockResolvedValueOnce({
      marketSignal: {
        hasBAboveGE: true,
        statusLabel: '有吉气',
        summary: '测试摘要',
        referenceRating: 'A',
        referencePatterns: ['青龙返首'],
      },
      patternHeat: {
        COMPOSITE: 1,
        A: 2,
        B: 3,
        C: 4,
      },
      topSectors: [{ label: '银行', count: 2 }],
      topStocks: [{ code: '000001', name: '平安银行', sector: '银行', rating: 'S', totalScore: 36 }],
      updatedAt: '2026-03-19T10:00:00.000Z',
      universeSize: 1,
      cache: {
        cached: true,
        expiresAt: '2026-03-19T10:30:00.000Z',
      },
    });

    const payload = {
      patternConfigOverride: {
        patternOverrides: {
          青龙返首: {
            enabled: false,
          },
        },
      },
      riskConfigOverride: {
        excludeTopEvilPatterns: false,
      },
    };
    const response = await POST(createRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.marketSignal.statusLabel).toBe('有吉气');
    expect(mockedGetMarketDashboard).toHaveBeenCalledWith(payload);
  });
});

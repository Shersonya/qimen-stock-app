/** @jest-environment node */

import { NextRequest } from 'next/server';

import { POST } from '@/app/api/dragon-head/candidates/route';
import { AppError } from '@/lib/errors';
import { getDragonHeadCandidates } from '@/lib/services/dragon-head';

jest.mock('@/lib/services/dragon-head');

const mockedGetDragonHeadCandidates = jest.mocked(getDragonHeadCandidates);

function createRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/dragon-head/candidates', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/dragon-head/candidates', () => {
  beforeEach(() => {
    mockedGetDragonHeadCandidates.mockReset();
  });

  it('returns candidate payloads and forwards mock mode', async () => {
    mockedGetDragonHeadCandidates.mockResolvedValueOnce({
      asOf: '2026-03-21T10:18:00+08:00',
      total: 1,
      aiAdviceEnabled: true,
      summary: '测试候选摘要',
      sourceStatus: [],
      manualReviewChecklist: ['测试清单'],
      items: [
        {
          stockCode: '000625',
          stockName: '长安汽车',
          market: 'SZ',
          sector: '低空经济',
          latestPrice: 18.36,
          latestChangePct: 7.9,
          boardChangePct: 3.1,
          signalTags: ['新题材首板'],
          isNewThemeLeader: true,
          isOldCoreLeader: false,
          isTopBoard: false,
          canAddToPool: true,
          reviewFlags: ['测试复核'],
          strength: {
            score: 88,
            formulaVersion: 'dragon-head-v1',
            factorBreakdown: [],
            missingFactors: [],
            confidence: 1,
            sourceStatus: [],
          },
        },
      ],
    });

    const payload = {
      mode: 'mock_degraded' as const,
    };
    const response = await POST(createRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(mockedGetDragonHeadCandidates).toHaveBeenCalledWith(payload);
  });

  it('maps service errors into API responses', async () => {
    mockedGetDragonHeadCandidates.mockRejectedValueOnce(
      new AppError('DATA_SOURCE_ERROR', 502),
    );

    const response = await POST(createRequest({}));

    expect(response.status).toBe(502);
  });
});

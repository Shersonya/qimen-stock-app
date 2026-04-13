/** @jest-environment node */

import { NextRequest } from 'next/server';

import { POST } from '@/app/api/dragon-head/monitor/route';
import { AppError } from '@/lib/errors';
import { getDragonHeadMonitor } from '@/lib/services/dragon-head';

jest.mock('@/lib/services/dragon-head');

const mockedGetDragonHeadMonitor = jest.mocked(getDragonHeadMonitor);

function createRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/dragon-head/monitor', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/dragon-head/monitor', () => {
  beforeEach(() => {
    mockedGetDragonHeadMonitor.mockReset();
  });

  it('returns the monitor payload and forwards request config', async () => {
    mockedGetDragonHeadMonitor.mockResolvedValueOnce({
      asOf: '2026-03-21T10:18:00+08:00',
      aiAdviceEnabled: true,
      summary: '测试摘要',
      trendSwitch: {
        instruction: 'HOLD_NEW',
        newThemeFirstBoardCount: 3,
        newThemeAverageStrength: 86,
        oldLeaderStrength: 78,
        oldLeaderWeakDays: 1,
        topBoardStrength: 92,
        themeTurnoverGrowthPct: 200,
        summary: '测试切换',
      },
      positionAllocation: {
        newLeaderPercent: 30,
        oldCorePercent: 50,
        topBoardPercent: 20,
        forcedFlat: false,
        reason: '测试仓位',
      },
      circuitBreaker: {
        triggered: false,
        reasons: [],
        metrics: {
          limitDownCount: 10,
          yesterdayLimitUpAvgReturn: 2,
          maxBoardHeight: 5,
        },
      },
      newTheme: {
        label: '低空经济',
        averageStrength: 86,
        firstBoardCount: 3,
      },
      oldTheme: {
        label: '机器人',
        leaderStrength: 78,
        weakDays: 1,
      },
      topBoard: {
        label: '空间板',
        strength: 92,
      },
      sourceStatus: [],
      manualReviewChecklist: ['测试清单'],
    });

    const payload = {
      mode: 'mock_complete' as const,
    };
    const response = await POST(createRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.aiAdviceEnabled).toBe(true);
    expect(mockedGetDragonHeadMonitor).toHaveBeenCalledWith(payload);
  });

  it('maps service errors into API responses', async () => {
    mockedGetDragonHeadMonitor.mockRejectedValueOnce(new AppError('DATA_SOURCE_ERROR', 502));

    const response = await POST(createRequest({}));

    expect(response.status).toBe(502);
  });
});

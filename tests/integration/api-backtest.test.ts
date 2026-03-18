/** @jest-environment node */

import { NextRequest } from 'next/server';

import { POST } from '@/app/api/backtest/route';
import { ERROR_CODES } from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';
import { runMarketScreenBacktest } from '@/lib/services/backtest';

jest.mock('@/lib/services/backtest');

const mockedRunMarketScreenBacktest = jest.mocked(runMarketScreenBacktest);

function createRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/backtest', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/backtest', () => {
  beforeEach(() => {
    mockedRunMarketScreenBacktest.mockReset();
  });

  it('returns a structured backtest payload on success', async () => {
    mockedRunMarketScreenBacktest.mockResolvedValueOnce({
      generatedAt: '2026-03-18T10:00:00.000Z',
      lookbackDays: 60,
      range: {
        from: '2026-01-01',
        to: '2026-03-18',
      },
      strategyLabel: '当前筛选策略',
      predictionRule: '时干用神落生门或值符定义为涨，其余默认记为观望。',
      includedStocks: 1,
      skippedStocks: [],
      summary: {
        label: 'overall',
        totalSamples: 10,
        evaluatedSamples: 10,
        hitSamples: 6,
        missSamples: 4,
        hitRate: 0.6,
        predictedDirectionCounts: {
          涨: 10,
          跌: 0,
          观望: 0,
        },
        actualDirectionCounts: {
          涨: 6,
          跌: 4,
          观望: 0,
        },
      },
      byStock: {},
      byStrategy: {},
      results: [],
    });

    const response = await POST(
      createRequest({
        items: [],
        lookbackDays: 60,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.hitRate).toBe(0.6);
    expect(body.lookbackDays).toBe(60);
  });

  it('maps service errors to API errors', async () => {
    mockedRunMarketScreenBacktest.mockRejectedValueOnce(
      new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502),
    );

    const response = await POST(createRequest({ items: [] }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error.code).toBe(ERROR_CODES.DATA_SOURCE_ERROR);
  });
});

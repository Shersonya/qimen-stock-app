/** @jest-environment node */

import { NextRequest } from 'next/server';

import { POST } from '@/app/api/tdx-scan/route';
import { AppError } from '@/lib/errors';
import { scanTdxSignals } from '@/lib/services/tdx-scan';

jest.mock('@/lib/services/tdx-scan');

const mockedScanTdxSignals = jest.mocked(scanTdxSignals);

function createRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/tdx-scan', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/tdx-scan', () => {
  beforeEach(() => {
    mockedScanTdxSignals.mockReset();
  });

  it('returns scanned signals on success', async () => {
    mockedScanTdxSignals.mockResolvedValueOnce({
      total: 1,
      page: 1,
      pageSize: 50,
      scanDate: '2026-03-21',
      meta: {
        cached: false,
        universeSource: 'market_pool',
        universeSize: 1234,
      },
      items: [
        {
          stockCode: '300750',
          stockName: '宁德时代',
          market: 'CYB',
          signalDate: '2026-03-20',
          closePrice: 228.5,
          volume: 1285400,
          meiZhu: false,
          meiYangYang: true,
          signalStrength: 5.2,
          trueCGain: 4.6,
          maUp: true,
          fiveLinesBull: true,
          biasRate: 8.4,
          volumeRatio: 2.1,
        },
      ],
    });

    const response = await POST(
      createRequest({
        signalType: 'meiYangYang',
        requireMaUp: true,
        page: 1,
        pageSize: 50,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.meta).toEqual({
      cached: false,
      universeSource: 'market_pool',
      universeSize: 1234,
    });
    expect(mockedScanTdxSignals).toHaveBeenCalledWith({
      signalType: 'meiYangYang',
      requireMaUp: true,
      requireFiveLinesBull: undefined,
      maxBiasRate: undefined,
      minSignalStrength: undefined,
      page: 1,
      pageSize: 50,
    });
  });

  it('maps service errors into API responses', async () => {
    mockedScanTdxSignals.mockRejectedValueOnce(new AppError('DATA_SOURCE_ERROR', 502));

    const response = await POST(createRequest({ signalType: 'both' }));

    expect(response.status).toBe(502);
  });
});

/** @jest-environment node */

import { NextRequest } from 'next/server';

import { POST } from '@/app/api/batch-diagnosis/route';
import { AppError } from '@/lib/errors';
import { batchDiagnose } from '@/lib/services/batch-diagnosis';

jest.mock('@/lib/services/batch-diagnosis');

const mockedBatchDiagnose = jest.mocked(batchDiagnose);

function createRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/batch-diagnosis', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/batch-diagnosis', () => {
  beforeEach(() => {
    mockedBatchDiagnose.mockReset();
  });

  it('returns batch diagnosis results on success', async () => {
    mockedBatchDiagnose.mockResolvedValueOnce([
      {
        stockCode: '000001',
        stockName: '平安银行',
        diagnosisTime: '2026-03-21T10:00:00.000Z',
        rating: 'A',
        totalScore: 81,
        riskLevel: '中',
        action: 'WATCH',
        actionLabel: '观察',
        successProbability: 72,
        summary: '结构偏强',
      },
    ]);

    const response = await POST(createRequest({ stockCodes: ['000001'], poolId: 'pool_1' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].stockCode).toBe('000001');
    expect(body[0].stockName).toBe('平安银行');
    expect(mockedBatchDiagnose).toHaveBeenCalledWith({
      stockCodes: ['000001'],
      poolId: 'pool_1',
    });
  });

  it('maps service errors into API responses', async () => {
    mockedBatchDiagnose.mockRejectedValueOnce(new AppError('API_ERROR', 500));

    const response = await POST(createRequest({ stockCodes: ['000001'] }));

    expect(response.status).toBe(500);
  });
});

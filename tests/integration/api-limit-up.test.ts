/** @jest-environment node */

import { NextRequest } from 'next/server';

import { POST } from '@/app/api/limit-up/route';
import { ERROR_CODES } from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';
import { filterLimitUpStocks } from '@/lib/services/limit-up';

jest.mock('@/lib/services/limit-up');

const mockedFilterLimitUpStocks = jest.mocked(filterLimitUpStocks);

function createRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/limit-up', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/limit-up', () => {
  beforeEach(() => {
    mockedFilterLimitUpStocks.mockReset();
  });

  it('returns screened limit-up stocks on success', async () => {
    mockedFilterLimitUpStocks.mockResolvedValueOnce({
      total: 1,
      page: 1,
      pageSize: 50,
      filterDate: '2026-03-21',
      lookbackDays: 30,
      items: [
        {
          stockCode: '600001',
          stockName: '中国测试A',
          market: 'SH',
          limitUpDates: ['2026-03-20'],
          limitUpCount: 1,
          firstLimitUpDate: '2026-03-20',
          lastLimitUpDate: '2026-03-20',
          latestClose: 11.09,
          latestVolume: 120000,
          sector: '测试板块',
        },
      ],
    });

    const payload = {
      lookbackDays: 30,
      minLimitUpCount: 1,
      sortBy: 'lastLimitUpDate',
      sortOrder: 'asc',
      page: 1,
      pageSize: 50,
    };
    const response = await POST(createRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.items[0].stockCode).toBe('600001');
    expect(mockedFilterLimitUpStocks).toHaveBeenCalledWith(payload);
  });

  it('returns app errors as structured responses', async () => {
    mockedFilterLimitUpStocks.mockRejectedValueOnce(
      new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502),
    );

    const response = await POST(createRequest({ lookbackDays: 30 }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error.code).toBe(ERROR_CODES.DATA_SOURCE_ERROR);
  });
});

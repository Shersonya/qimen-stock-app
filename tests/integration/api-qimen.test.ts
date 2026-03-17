/** @jest-environment node */

import { NextRequest } from 'next/server';

import {
  DEFAULT_LISTING_TIME,
  DEFAULT_TIME_SOURCE,
  ERROR_CODES,
} from '@/api/qimen';
import { POST } from '@/app/api/qimen/route';
import { AppError } from '@/lib/errors';
import { generateQimenChart } from '@/lib/qimen/engine';
import { getStockListingInfo } from '@/lib/services/stock-data';

jest.mock('@/lib/services/stock-data');
jest.mock('@/lib/qimen/engine');

const mockedGetStockListingInfo = jest.mocked(getStockListingInfo);
const mockedGenerateQimenChart = jest.mocked(generateQimenChart);

function createRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/qimen', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/qimen', () => {
  beforeEach(() => {
    mockedGetStockListingInfo.mockReset();
    mockedGenerateQimenChart.mockReset();
  });

  it('returns stock and qimen data on success', async () => {
    mockedGetStockListingInfo.mockResolvedValueOnce({
      code: '600519',
      name: '贵州茅台',
      market: 'SH',
      listingDate: '2001-08-27',
      listingTime: DEFAULT_LISTING_TIME,
      timeSource: DEFAULT_TIME_SOURCE,
    });
    mockedGenerateQimenChart.mockReturnValueOnce({
      yinYang: '阴',
      ju: 2,
      valueStar: '天心星',
      valueDoor: '开门',
      palaces: [],
    });

    const response = await POST(createRequest({ stockCode: '600519' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      stock: {
        code: '600519',
        name: '贵州茅台',
        market: 'SH',
        listingDate: '2001-08-27',
        listingTime: DEFAULT_LISTING_TIME,
        timeSource: DEFAULT_TIME_SOURCE,
      },
      qimen: {
        yinYang: '阴',
        ju: 2,
        valueStar: '天心星',
        valueDoor: '开门',
        palaces: [],
      },
    });
  });

  it('returns 400 for invalid stock code errors', async () => {
    mockedGetStockListingInfo.mockRejectedValueOnce(
      new AppError(ERROR_CODES.INVALID_STOCK_CODE, 400),
    );

    const response = await POST(createRequest({ stockCode: '12' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(ERROR_CODES.INVALID_STOCK_CODE);
  });

  it('returns 400 for unsupported markets such as STAR Market stocks', async () => {
    mockedGetStockListingInfo.mockRejectedValueOnce(
      new AppError(ERROR_CODES.UNSUPPORTED_MARKET, 400),
    );

    const response = await POST(createRequest({ stockCode: '688981' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(ERROR_CODES.UNSUPPORTED_MARKET);
  });

  it('returns 502 when the upstream data source fails', async () => {
    mockedGetStockListingInfo.mockRejectedValueOnce(
      new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502),
    );

    const response = await POST(createRequest({ stockCode: '600519' }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error.code).toBe(ERROR_CODES.DATA_SOURCE_ERROR);
  });
});

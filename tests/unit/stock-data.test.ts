/** @jest-environment node */

import {
  DEFAULT_LISTING_TIME,
  DEFAULT_TIME_SOURCE,
  ERROR_CODES,
} from '@/lib/contracts/qimen';
import { getStockListingInfo } from '@/lib/services/stock-data';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('getStockListingInfo', () => {
  const fetchMock = jest.spyOn(global, 'fetch');

  afterEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    fetchMock.mockRestore();
  });

  it.each([
    ['600519', '上交所主板A股', 'SH'],
    ['000001', '深交所主板A股', 'SZ'],
    ['300750', '深交所创业板A股', 'CYB'],
  ])('maps %s to %s', async (stockCode, zqlb, market) => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        jbzl: {
          agdm: stockCode,
          agjc: '样例股票',
          zqlb,
        },
        fxxg: {
          ssrq: '2020-01-01',
        },
      }),
    );

    await expect(getStockListingInfo(stockCode)).resolves.toEqual({
      code: stockCode,
      name: '样例股票',
      market,
      listingDate: '2020-01-01',
      listingTime: DEFAULT_LISTING_TIME,
      timeSource: DEFAULT_TIME_SOURCE,
    });
  });

  it('rejects an invalid stock code before requesting the data source', async () => {
    await expect(getStockListingInfo('12')).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_STOCK_CODE,
      statusCode: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects unsupported markets such as STAR Market listings', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        jbzl: {
          agdm: '688981',
          agjc: '中芯国际',
          zqlb: '上交所科创板A股',
        },
        fxxg: {
          ssrq: '2020-07-16',
        },
      }),
    );

    await expect(getStockListingInfo('688981')).rejects.toMatchObject({
      code: ERROR_CODES.UNSUPPORTED_MARKET,
      statusCode: 400,
    });
  });

  it('rejects ST stocks globally', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        jbzl: {
          agdm: '600112',
          agjc: '*ST天成',
          zqlb: '上交所主板A股',
        },
        fxxg: {
          ssrq: '1997-11-27',
        },
      }),
    );

    await expect(getStockListingInfo('600112')).rejects.toMatchObject({
      code: ERROR_CODES.ST_STOCK_UNSUPPORTED,
      statusCode: 400,
    });
  });

  it('maps transport failures to DATA_SOURCE_ERROR', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(getStockListingInfo('600519')).rejects.toMatchObject({
      code: ERROR_CODES.DATA_SOURCE_ERROR,
      statusCode: 502,
    });
  });

  it('rejects missing listing dates', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        jbzl: {
          agdm: '600519',
          agjc: '贵州茅台',
          zqlb: '上交所主板A股',
        },
        fxxg: {},
      }),
    );

    await expect(getStockListingInfo('600519')).rejects.toMatchObject({
      code: ERROR_CODES.LISTING_DATE_MISSING,
      statusCode: 502,
    });
  });
});

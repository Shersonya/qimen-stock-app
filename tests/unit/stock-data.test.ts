/** @jest-environment node */

import {
  DEFAULT_LISTING_TIME,
  DEFAULT_TIME_SOURCE,
  ERROR_CODES,
  type Market,
} from '@/lib/contracts/qimen';
import {
  getStockListingInfo,
  resetStockListingCacheForTests,
} from '@/lib/services/stock-data';
import { getStockDailyHistory } from '@/lib/services/stock-history';

jest.mock('@/lib/services/stock-history');

const mockedGetStockDailyHistory = jest.mocked(getStockDailyHistory);

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
    mockedGetStockDailyHistory.mockReset();
    resetStockListingCacheForTests();
  });

  afterAll(() => {
    fetchMock.mockRestore();
  });

  it.each([
    ['600519', '上交所主板A股', 'SH'],
    ['000001', '深交所主板A股', 'SZ'],
    ['300750', '深交所创业板A股', 'CYB'],
    ['688981', '上交所科创板A股', 'STAR'],
  ] satisfies Array<[string, string, Market]>)(
    'maps %s to %s',
    async (stockCode, zqlb, market) => {
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
    },
  );

  it('maps BJ listings from the alternate eastmoney survey payload shape', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        SecurityCode: '920047',
        SecurityShortName: '诺思兰德',
        SecuCode: '920047.BJ',
        Market: 'BJ',
        fxxg: {
          ssrq: '2020-11-24',
        },
      }),
    );

    await expect(getStockListingInfo('920047')).resolves.toEqual({
      code: '920047',
      name: '诺思兰德',
      market: 'BJ',
      listingDate: '2020-11-24',
      listingTime: DEFAULT_LISTING_TIME,
      timeSource: DEFAULT_TIME_SOURCE,
    });
  });

  it('canonicalizes legacy BJ codes through the search suggestion fallback', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: -1 }))
      .mockResolvedValueOnce(
        jsonResponse({
          QuotationCodeTable: {
            Data: [
              {
                Code: '920670',
                UnifiedCode: '920670',
                Name: '数字人',
                SecurityTypeName: '京A',
              },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          SecurityCode: '920670',
          SecurityShortName: '数字人',
          SecuCode: '920670.BJ',
          Market: 'BJ',
          fxxg: {
            ssrq: '2023-04-19',
          },
        }),
      );

    await expect(getStockListingInfo('835670')).resolves.toEqual({
      code: '920670',
      name: '数字人',
      market: 'BJ',
      listingDate: '2023-04-19',
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
    expect(mockedGetStockDailyHistory).not.toHaveBeenCalled();
  });

  it('rejects unsupported non-A-share search results', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        QuotationCodeTable: {
          Data: [
            {
              Code: '111111',
              UnifiedCode: '111111',
              Name: '22仲恺债',
              SecurityTypeName: '债券',
            },
          ],
        },
      }),
    );

    await expect(getStockListingInfo('111111')).rejects.toMatchObject({
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

  it('falls back to history when the survey payload misses the listing date', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          jbzl: {
            agdm: '688981',
            agjc: '中芯国际',
            zqlb: '上交所科创板A股',
          },
          fxxg: {},
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          QuotationCodeTable: {
            Data: [
              {
                Code: '688981',
                UnifiedCode: '688981',
                Name: '中芯国际',
                SecurityTypeName: '科创板',
              },
            ],
          },
        }),
      );
    mockedGetStockDailyHistory.mockResolvedValueOnce([
      {
        tradeDate: '2020-07-16',
        open: 0,
        close: 0,
        high: 0,
        low: 0,
        volume: 0,
        amount: 0,
      },
    ]);

    await expect(getStockListingInfo('688981')).resolves.toEqual({
      code: '688981',
      name: '中芯国际',
      market: 'STAR',
      listingDate: '2020-07-16',
      listingTime: DEFAULT_LISTING_TIME,
      timeSource: DEFAULT_TIME_SOURCE,
    });
  });

  it('rejects missing listing dates after exhausting the history fallback', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          jbzl: {
            agdm: '688981',
            agjc: '中芯国际',
            zqlb: '上交所科创板A股',
          },
          fxxg: {},
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          QuotationCodeTable: {
            Data: [
              {
                Code: '688981',
                UnifiedCode: '688981',
                Name: '中芯国际',
                SecurityTypeName: '科创板',
              },
            ],
          },
        }),
      );
    mockedGetStockDailyHistory.mockResolvedValueOnce([]);

    await expect(getStockListingInfo('688981')).rejects.toMatchObject({
      code: ERROR_CODES.LISTING_DATE_MISSING,
      statusCode: 502,
    });
  });
});

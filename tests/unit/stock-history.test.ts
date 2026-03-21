/** @jest-environment node */

import { ERROR_CODES } from '@/lib/contracts/qimen';
import {
  getStockDailyHistory,
  parseHistoryKlineRow,
  resetStockHistoryStateForTests,
} from '@/lib/services/stock-history';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('parseHistoryKlineRow', () => {
  it('parses eastmoney kline rows into structured history points', () => {
    expect(
      parseHistoryKlineRow('2026-03-01,10.10,10.45,10.60,9.98,120000,234000000'),
    ).toEqual({
      tradeDate: '2026-03-01',
      open: 10.1,
      close: 10.45,
      high: 10.6,
      low: 9.98,
      volume: 120000,
      amount: 234000000,
    });
  });

  it('returns null for invalid rows', () => {
    expect(parseHistoryKlineRow('invalid')).toBeNull();
  });
});

describe('getStockDailyHistory', () => {
  const fetchMock = jest.spyOn(global, 'fetch');

  beforeEach(() => {
    resetStockHistoryStateForTests();
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    fetchMock.mockRestore();
  });

  it('reads daily history from the eastmoney endpoint', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          klines: [
            '2026-03-01,10.10,10.45,10.60,9.98,120000,234000000',
            '2026-03-02,10.45,10.20,10.55,10.08,98000,188000000',
          ],
        },
      }),
    );

    await expect(
      getStockDailyHistory('600519', 'SH', {
        beg: '20260201',
        end: '20260318',
      }),
    ).resolves.toHaveLength(2);
  });

  it('normalizes hyphenated date options before calling eastmoney', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          klines: [],
        },
      }),
    );

    await getStockDailyHistory('000001', 'SZ', {
      beg: '2026-02-01',
      end: '2026-03-18',
    });

    const [requestUrl] = fetchMock.mock.calls[0] ?? [];
    const url = typeof requestUrl === 'string' ? requestUrl : requestUrl?.toString() ?? '';

    expect(url).toContain('beg=20260201');
    expect(url).toContain('end=20260318');
  });

  it('maps transport failures to DATA_SOURCE_ERROR', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(getStockDailyHistory('000001', 'SZ')).rejects.toMatchObject({
      code: ERROR_CODES.DATA_SOURCE_ERROR,
      statusCode: 502,
    });
  });

  it('falls back to the tencent endpoint after eastmoney transport failures', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('eastmoney-1'))
      .mockRejectedValueOnce(new Error('eastmoney-2'))
      .mockRejectedValueOnce(new Error('eastmoney-3'))
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          data: {
            sz000001: {
              qfqday: [
                ['2026-02-28', '10.10', '10.30', '10.50', '10.00', '120000', {}, '1.5', '2345.67', ''],
                ['2026-03-02', '10.30', '10.45', '10.60', '10.25', '98000', {}, '1.3', '1880.12', ''],
              ],
            },
          },
        }),
      );

    await expect(
      getStockDailyHistory('000001', 'SZ', {
        beg: '20260201',
        end: '20260318',
      }),
    ).resolves.toEqual([
      {
        tradeDate: '2026-02-28',
        open: 10.1,
        close: 10.3,
        high: 10.5,
        low: 10,
        volume: 120000,
        amount: 23456700,
      },
      {
        tradeDate: '2026-03-02',
        open: 10.3,
        close: 10.45,
        high: 10.6,
        low: 10.25,
        volume: 98000,
        amount: 18801200,
      },
    ]);

    const fourthCall = fetchMock.mock.calls[3]?.[0];
    const requestUrl =
      typeof fourthCall === 'string' ? fourthCall : fourthCall?.toString() ?? '';

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(requestUrl).toContain('web.ifzq.gtimg.cn');
    expect(requestUrl).toContain('param=sz000001,day,,,800,qfq');
  });
});

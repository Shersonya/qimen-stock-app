/** @jest-environment node */

import { ERROR_CODES } from '@/lib/contracts/qimen';
import {
  getStockDailyHistory,
  parseHistoryKlineRow,
  parseSinaHistoryJsonp,
  parseSinaHistoryKlineRow,
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

describe('parseSinaHistoryKlineRow', () => {
  it('parses sina kline rows into structured history points', () => {
    expect(
      parseSinaHistoryKlineRow({
        day: '2026-03-20',
        open: '1452.960',
        high: '1462.500',
        low: '1439.000',
        close: '1445.000',
        volume: '2613234',
      }),
    ).toEqual({
      tradeDate: '2026-03-20',
      open: 1452.96,
      close: 1445,
      high: 1462.5,
      low: 1439,
      volume: 2613234,
      amount: 377612313000,
    });
  });
});

describe('parseSinaHistoryJsonp', () => {
  it('parses sina jsonp payloads into history points', () => {
    expect(
      parseSinaHistoryJsonp(
        "/*<script>location.href='//sina.com';</script>*/\nvar _history=([{\"day\":\"2026-03-19\",\"open\":\"1472.960\",\"high\":\"1473.000\",\"low\":\"1446.000\",\"close\":\"1452.870\",\"volume\":\"3031859\"}]);",
      ),
    ).toEqual([
      {
        tradeDate: '2026-03-19',
        open: 1472.96,
        high: 1473,
        low: 1446,
        close: 1452.87,
        volume: 3031859,
        amount: 440489698533,
      },
    ]);
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
    expect(requestUrl).toContain('param=sz000001,day,,,5000,qfq');
  });

  it('uses board-specific fallback prefixes for STAR and BJ history requests', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('eastmoney-1'))
      .mockRejectedValueOnce(new Error('eastmoney-2'))
      .mockRejectedValueOnce(new Error('eastmoney-3'))
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          data: {
            sh688981: {
              qfqday: [
                ['2026-03-18', '105.00', '106.00', '107.00', '104.50', '123000', {}, '1.2', '2345.67', ''],
              ],
            },
          },
        }),
      );

    await expect(getStockDailyHistory('688981', 'STAR')).resolves.toHaveLength(1);

    const fourthCall = fetchMock.mock.calls[3]?.[0];
    const starRequestUrl =
      typeof fourthCall === 'string' ? fourthCall : fourthCall?.toString() ?? '';

    expect(starRequestUrl).toContain('param=sh688981,day,,,5000,qfq');

    resetStockHistoryStateForTests();
    fetchMock.mockReset();
    fetchMock
      .mockRejectedValueOnce(new Error('eastmoney-4'))
      .mockRejectedValueOnce(new Error('eastmoney-5'))
      .mockRejectedValueOnce(new Error('eastmoney-6'))
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          data: {
            bj920047: {
              qfqday: [
                ['2026-03-18', '24.50', '24.80', '25.10', '24.20', '91000', {}, '1.1', '1678.90', ''],
              ],
            },
          },
        }),
      );

    await expect(getStockDailyHistory('920047', 'BJ')).resolves.toHaveLength(1);

    const fourthBjCall = fetchMock.mock.calls[3]?.[0];
    const bjRequestUrl =
      typeof fourthBjCall === 'string' ? fourthBjCall : fourthBjCall?.toString() ?? '';

    expect(bjRequestUrl).toContain('param=bj920047,day,,,5000,qfq');
  });

  it('falls back to the sina endpoint when eastmoney history is unavailable', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('eastmoney-1'))
      .mockRejectedValueOnce(new Error('eastmoney-2'))
      .mockRejectedValueOnce(new Error('eastmoney-3'))
      .mockRejectedValueOnce(new Error('tencent unavailable'))
      .mockResolvedValueOnce(
      new Response(
        "/*<script>location.href='//sina.com';</script>*/\nvar _history=([{\"day\":\"2026-03-18\",\"open\":\"1489.000\",\"high\":\"1496.500\",\"low\":\"1463.150\",\"close\":\"1468.800\",\"volume\":\"3555100\"},{\"day\":\"2026-03-19\",\"open\":\"1472.960\",\"high\":\"1473.000\",\"low\":\"1446.000\",\"close\":\"1452.870\",\"volume\":\"3031859\"},{\"day\":\"2026-03-20\",\"open\":\"1452.960\",\"high\":\"1462.500\",\"low\":\"1439.000\",\"close\":\"1445.000\",\"volume\":\"2613234\"}]);",
        {
          status: 200,
          headers: {
            'Content-Type': 'application/javascript',
          },
        },
      ),
    );

    await expect(
      getStockDailyHistory('600519', 'SH', {
        beg: '20260319',
        end: '20260320',
      }),
    ).resolves.toEqual([
      {
        tradeDate: '2026-03-19',
        open: 1472.96,
        high: 1473,
        low: 1446,
        close: 1452.87,
        volume: 3031859,
        amount: 440489698533,
      },
      {
        tradeDate: '2026-03-20',
        open: 1452.96,
        high: 1462.5,
        low: 1439,
        close: 1445,
        volume: 2613234,
        amount: 377612313000,
      },
    ]);
  });
});

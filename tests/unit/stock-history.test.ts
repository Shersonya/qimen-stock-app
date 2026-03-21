/** @jest-environment node */

import { ERROR_CODES } from '@/lib/contracts/qimen';
import {
  getStockDailyHistory,
  parseHistoryKlineRow,
  parseSinaHistoryJsonp,
  parseSinaHistoryKlineRow,
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

  it('maps transport failures to DATA_SOURCE_ERROR', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    fetchMock.mockRejectedValueOnce(new Error('fallback down'));

    await expect(getStockDailyHistory('000001', 'SZ')).rejects.toMatchObject({
      code: ERROR_CODES.DATA_SOURCE_ERROR,
      statusCode: 502,
    });
  });

  it('falls back to the sina endpoint when eastmoney history is unavailable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('eastmoney unavailable'));
    fetchMock.mockResolvedValueOnce(
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

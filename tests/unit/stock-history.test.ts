/** @jest-environment node */

import { ERROR_CODES } from '@/lib/contracts/qimen';
import {
  getStockDailyHistory,
  parseHistoryKlineRow,
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
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(getStockDailyHistory('000001', 'SZ')).rejects.toMatchObject({
      code: ERROR_CODES.DATA_SOURCE_ERROR,
      statusCode: 502,
    });
  });
});

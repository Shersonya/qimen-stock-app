/** @jest-environment node */

import {
  calculateTenMinuteSpeed,
  getStockIntradaySpeed10m,
  parseEastMoneyIntradayRow,
  type StockIntradayPoint,
} from '@/lib/services/stock-intraday';

describe('stock intraday service', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  function createPoint(index: number): StockIntradayPoint {
    const close = 10 + index * 0.1;

    return {
      time: `2026-04-23 09:${String(30 + index).padStart(2, '0')}`,
      open: close,
      close,
      high: close,
      low: close,
      volume: 1000 + index,
      amount: 100000 + index,
    };
  }

  it('parses EastMoney minute kline rows', () => {
    expect(
      parseEastMoneyIntradayRow(
        '2026-04-23 09:31,10.10,10.20,10.30,10.00,1200,123456',
      ),
    ).toEqual({
      time: '2026-04-23 09:31',
      open: 10.1,
      close: 10.2,
      high: 10.3,
      low: 10,
      volume: 1200,
      amount: 123456,
    });

    expect(parseEastMoneyIntradayRow('invalid')).toBeNull();
  });

  it('calculates ten-minute speed from the latest and ten-minute-prior closes', () => {
    const points = Array.from({ length: 12 }, (_unused, index) => createPoint(index));

    expect(calculateTenMinuteSpeed(points)).toBe(0.099);
    expect(calculateTenMinuteSpeed(points.slice(0, 10))).toBeNull();
  });

  it('returns null instead of throwing when the minute endpoint is unavailable', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network'));

    await expect(getStockIntradaySpeed10m('000001', 'SZ')).resolves.toBeNull();
  });

  it('reads minute klines and returns ten-minute speed', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            klines: Array.from({ length: 12 }, (_unused, index) => {
              const close = (10 + index * 0.1).toFixed(2);

              return `2026-04-23 09:${String(30 + index).padStart(2, '0')},${close},${close},${close},${close},1000,100000`;
            }),
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    await expect(getStockIntradaySpeed10m('000001', 'SZ')).resolves.toBe(0.099);
  });
});

/** @jest-environment node */

import { scanTdxSignals, resetTdxScanCacheForTests } from '@/lib/services/tdx-scan';
import type { Market } from '@/lib/contracts/qimen';
import { filterLimitUpStocks } from '@/lib/services/limit-up';
import { getStockDailyHistory } from '@/lib/services/stock-history';
import { calculateTdxIndicators } from '@/lib/tdx/engine';

jest.mock('@/data/stocks', () => ({
  MOCK_STOCKS: [
    { code: '000001', name: '样本A', market: 'SZ' },
    { code: '000002', name: '样本B', market: 'SZ' },
    { code: '000003', name: '样本C', market: 'SZ' },
  ],
}));
jest.mock('@/lib/services/stock-history');
jest.mock('@/lib/tdx/engine');
jest.mock('@/lib/services/limit-up');

const mockedGetStockDailyHistory = jest.mocked(getStockDailyHistory);
const mockedCalculateTdxIndicators = jest.mocked(calculateTdxIndicators);
const mockedFilterLimitUpStocks = jest.mocked(filterLimitUpStocks);

type HistoryPoint = Awaited<ReturnType<typeof getStockDailyHistory>>[number];

function createHistory(length: number): HistoryPoint[] {
  return Array.from({ length }, (_unused, index) => ({
    tradeDate: `2026-02-${String((index % 28) + 1).padStart(2, '0')}`,
    open: 10 + index * 0.1,
    close: 10 + index * 0.1,
    high: 10.2 + index * 0.1,
    low: 9.8 + index * 0.1,
    volume: 100000 + index * 100,
    amount: 1000000 + index * 1000,
  }));
}

function createIndicator(args: {
  signalStrength?: number;
  meiZhu?: boolean;
  meiYangYang?: boolean;
  maUp?: boolean;
  fiveLinesBull?: boolean;
  biasRate?: number;
} = {}) {
  const {
    signalStrength = 0,
    meiZhu = false,
    meiYangYang = false,
    maUp = true,
    fiveLinesBull = true,
    biasRate = 5,
  } = args;

  return Array.from({ length: 180 }, () => ({
    X_14: 1.8,
    X_74: signalStrength,
    virtualVolume: 120000,
    realVolume: 100000,
    volumeRatio: 1.8,
    angle20: 12,
    trueC: 10.5,
    trueCGain: 3.2,
    MA5: 10.2,
    MA10: 10.1,
    MA20: 10,
    MA60: 9.8,
    MA120: 9.5,
    maUp,
    fiveLinesBull,
    biasRate,
    meiZhu: meiZhu ? 0.5 : 0,
    shadowPressure: 10.8,
    meiYangYang,
  })) as ReturnType<typeof calculateTdxIndicators>;
}

describe('tdx scan service', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    resetTdxScanCacheForTests();
    mockedGetStockDailyHistory.mockReset();
    mockedCalculateTdxIndicators.mockReset();
    mockedFilterLimitUpStocks.mockReset();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('filters, sorts, paginates, and caches repeated history fetches', async () => {
    const historyA = createHistory(180);
    const historyB = createHistory(180).map((item) => ({
      ...item,
      close: item.close + 5,
      open: item.open + 5,
      high: item.high + 5,
      low: item.low + 5,
    }));
    const historyC = createHistory(180).map((item) => ({
      ...item,
      close: item.close + 20,
      open: item.open + 20,
      high: item.high + 20,
      low: item.low + 20,
    }));

    mockedGetStockDailyHistory
      .mockResolvedValueOnce(historyA)
      .mockResolvedValueOnce(historyB)
      .mockResolvedValueOnce(historyC);
    mockedCalculateTdxIndicators.mockImplementation((bars) => {
      const lastClose = bars.at(-1)?.close ?? 0;

      if (lastClose < 35) {
        return createIndicator({ signalStrength: 3.5, meiZhu: true });
      }

      if (lastClose < 40) {
        return createIndicator({ signalStrength: 5.2, meiYangYang: true });
      }

      return createIndicator({ signalStrength: 1.1, meiZhu: false, meiYangYang: false });
    });

    const first = await scanTdxSignals({
      signalType: 'both',
      page: 1,
      pageSize: 1,
    });

    expect(first.total).toBe(2);
    expect(first.items[0]?.stockCode).toBe('000001');
    expect(first.meta).toMatchObject({
      cached: false,
      universeSource: 'local_stock_universe',
      universeSize: expect.any(Number),
    });
    expect(first.meta.notice).toContain('本地全市场股票快照');

    const second = await scanTdxSignals({
      signalType: 'both',
      page: 2,
      pageSize: 1,
    });

    expect(second.items[0]?.stockCode).toBe('000002');
    expect(second.meta).toMatchObject({
      cached: true,
      universeSource: 'local_stock_universe',
      universeSize: expect.any(Number),
    });
    expect(mockedGetStockDailyHistory).toHaveBeenCalledTimes(3);
    expect(mockedFilterLimitUpStocks).not.toHaveBeenCalled();
  });

  it('keeps the overall scan alive when one stock history request fails', async () => {
    mockedGetStockDailyHistory
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(createHistory(180));
    mockedCalculateTdxIndicators.mockReturnValueOnce(
      createIndicator({ signalStrength: 4.5, meiYangYang: true }),
    );

    const result = await scanTdxSignals({
      signalType: 'meiYangYang',
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.stockCode).toBe('000002');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[TDX Scan] Failed to process 000001:',
      expect.any(Error),
    );
  });

  it('applies signal strength and trend filters', async () => {
    mockedGetStockDailyHistory.mockResolvedValue(createHistory(180));
    mockedCalculateTdxIndicators.mockReturnValue(
      createIndicator({
        signalStrength: 2.5,
        meiZhu: true,
        maUp: false,
        fiveLinesBull: false,
        biasRate: 14,
      }),
    );

    const result = await scanTdxSignals({
      signalType: 'meiZhu',
      requireMaUp: true,
      requireFiveLinesBull: true,
      minSignalStrength: 3,
      maxBiasRate: 10,
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(0);
  });
});

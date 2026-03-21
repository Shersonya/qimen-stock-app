/** @jest-environment node */

import { scanTdxSignals, resetTdxScanCacheForTests } from '@/lib/services/tdx-scan';
import { ERROR_CODES } from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';
import { filterLimitUpStocks } from '@/lib/services/limit-up';
import { getMarketStockPool } from '@/lib/services/market-screen';
import { getStockDailyHistory } from '@/lib/services/stock-history';
import { calculateTdxIndicators } from '@/lib/tdx/engine';

jest.mock('@/lib/services/market-screen');
jest.mock('@/lib/services/stock-history');
jest.mock('@/lib/tdx/engine');
jest.mock('@/lib/services/limit-up');

const mockedGetMarketStockPool = jest.mocked(getMarketStockPool);
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

function createMarketItem(
  code: string,
  name: string,
  market: 'SH' | 'SZ' | 'CYB',
) {
  return {
    stock: {
      code,
      name,
      market,
      listingDate: '2025-01-01',
      sector: '测试行业',
    },
  } as Awaited<ReturnType<typeof getMarketStockPool>>[number];
}

describe('tdx scan service', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    resetTdxScanCacheForTests();
    mockedGetMarketStockPool.mockReset();
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

    mockedGetMarketStockPool.mockResolvedValue([
      createMarketItem('600001', '样本A', 'SH'),
      createMarketItem('300001', '样本B', 'CYB'),
      createMarketItem('000001', '样本C', 'SZ'),
    ]);
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
    expect(first.items[0]?.stockCode).toBe('300001');

    const second = await scanTdxSignals({
      signalType: 'both',
      page: 2,
      pageSize: 1,
    });

    expect(second.items[0]?.stockCode).toBe('600001');
    expect(mockedGetStockDailyHistory).toHaveBeenCalledTimes(3);
  });

  it('keeps the overall scan alive when one stock history request fails', async () => {
    mockedGetMarketStockPool.mockResolvedValue([
      createMarketItem('600001', '样本A', 'SH'),
      createMarketItem('300001', '样本B', 'CYB'),
    ]);
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
    expect(result.items[0]?.stockCode).toBe('300001');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[TDX Scan] Failed to process 600001:',
      expect.any(Error),
    );
  });

  it('applies signal strength and trend filters', async () => {
    mockedGetMarketStockPool.mockResolvedValue([
      createMarketItem('600001', '样本A', 'SH'),
    ]);
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

  it('falls back to recent limit-up stocks when the market pool source is unavailable', async () => {
    mockedGetMarketStockPool.mockRejectedValueOnce(
      new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502),
    );
    mockedFilterLimitUpStocks.mockResolvedValueOnce({
      total: 1,
      page: 1,
      pageSize: 200,
      filterDate: '2026-03-20',
      lookbackDays: 5,
      items: [
        {
          stockCode: '600001',
          stockName: '样本A',
          market: 'SH',
          limitUpDates: ['2026-03-20'],
          limitUpCount: 1,
          firstLimitUpDate: '2026-03-20',
          lastLimitUpDate: '2026-03-20',
          latestClose: 12.3,
          latestVolume: 120000,
          sector: '测试行业',
        },
      ],
    });
    mockedGetStockDailyHistory.mockResolvedValueOnce(createHistory(180));
    mockedCalculateTdxIndicators.mockReturnValueOnce(
      createIndicator({ signalStrength: 4.2, meiZhu: true }),
    );

    const result = await scanTdxSignals({
      signalType: 'both',
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.stockCode).toBe('600001');
    expect(mockedFilterLimitUpStocks).toHaveBeenCalledWith(
      expect.objectContaining({
        lookbackDays: 5,
        pageSize: 200,
      }),
    );
  });
});

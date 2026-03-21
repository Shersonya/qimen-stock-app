/** @jest-environment node */

import {
  filterLimitUpStocks,
  isLimitUp,
  resetLimitUpCacheForTests,
} from '@/lib/services/limit-up';
import { getMarketStockPool } from '@/lib/services/market-screen';
import { isStStockName } from '@/lib/services/stock-data';
import { getStockDailyHistory } from '@/lib/services/stock-history';

jest.mock('@/lib/services/market-screen');
jest.mock('@/lib/services/stock-data');
jest.mock('@/lib/services/stock-history');

const mockedGetMarketStockPool = jest.mocked(getMarketStockPool);
const mockedIsStStockName = jest.mocked(isStStockName);
const mockedGetStockDailyHistory = jest.mocked(getStockDailyHistory);

type HistoryBar = Awaited<ReturnType<typeof getStockDailyHistory>>[number];

function makeDate(baseDate: string, offsetDays: number): string {
  const [year, month, day] = baseDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offsetDays);

  return date.toISOString().slice(0, 10);
}

function createHistory(args: {
  startDate: string;
  length: number;
  stockCode: string;
  market: 'SH' | 'SZ' | 'CYB';
  limitUpIndices?: number[];
  closeBase?: number;
}): HistoryBar[] {
  const {
    startDate,
    length,
    market,
    limitUpIndices = [],
    closeBase = 10,
  } = args;
  const limitUpSet = new Set(limitUpIndices);
  const ratio = market === 'CYB' ? 1.199 : 1.099;
  let previousClose = closeBase;

  return Array.from({ length }, (_unused, index) => {
    const tradeDate = makeDate(startDate, index);
    const nextClose = limitUpSet.has(index) ? Number((previousClose * ratio).toFixed(2)) : previousClose;
    const bar: HistoryBar = {
      tradeDate,
      open: Number((nextClose * 0.99).toFixed(2)),
      close: nextClose,
      high: Number((nextClose * 1.01).toFixed(2)),
      low: Number((nextClose * 0.98).toFixed(2)),
      volume: 100000 + index * 1000,
      amount: Number((nextClose * (100000 + index * 1000) * 10).toFixed(2)),
    };

    previousClose = nextClose;

    return bar;
  });
}

function createMarketItem(
  stockCode: string,
  stockName: string,
  market: 'SH' | 'SZ' | 'CYB',
): Awaited<ReturnType<typeof getMarketStockPool>>[number] {
  return {
    stock: {
      code: stockCode,
      name: stockName,
      market,
      listingDate: '2025-01-01',
      sector: '测试板块',
    },
  } as Awaited<ReturnType<typeof getMarketStockPool>>[number];
}

describe('limit-up screening', () => {
  beforeEach(() => {
    resetLimitUpCacheForTests();
    mockedGetMarketStockPool.mockReset();
    mockedIsStStockName.mockReset();
    mockedGetStockDailyHistory.mockReset();
    mockedIsStStockName.mockImplementation((name) =>
      /^(ST|\*ST|SST|S\*ST)/i.test(name.trim()),
    );
  });

  it('detects limit-up thresholds by board and excludes 688 stocks', () => {
    expect(isLimitUp(10.99, 10, '600000')).toBe(true);
    expect(isLimitUp(10.98, 10, '600000')).toBe(false);
    expect(isLimitUp(11.99, 10, '300000')).toBe(true);
    expect(isLimitUp(11.98, 10, '300000')).toBe(false);
    expect(isLimitUp(12, 10, '688001')).toBe(false);
  });

  it('filters stocks, sorts results, paginates, and caches repeated requests', async () => {
    mockedGetMarketStockPool.mockResolvedValue([
      createMarketItem('600001', '中国测试A', 'SH'),
      createMarketItem('300001', '中国测试B', 'CYB'),
      createMarketItem('600002', '中国测试C', 'SH'),
      createMarketItem('688001', '中国测试D', 'SH'),
      createMarketItem('000004', '中国测试E', 'SZ'),
      createMarketItem('600005', 'ST测试', 'SH'),
    ]);

    mockedGetStockDailyHistory.mockImplementation(async (stockCode, market) => {
      if (stockCode === '600001') {
        return createHistory({
          startDate: '2025-12-01',
          length: 65,
          stockCode,
          market,
          limitUpIndices: [40, 60],
        });
      }

      if (stockCode === '300001') {
        return createHistory({
          startDate: '2025-12-01',
          length: 65,
          stockCode,
          market,
          limitUpIndices: [55],
          closeBase: 12,
        });
      }

      if (stockCode === '600002') {
        return createHistory({
          startDate: '2025-12-01',
          length: 65,
          stockCode,
          market,
        });
      }

      if (stockCode === '000004') {
        return createHistory({
          startDate: '2026-01-20',
          length: 59,
          stockCode,
          market,
          limitUpIndices: [50],
        });
      }

      if (stockCode === '600005') {
        return createHistory({
          startDate: '2025-12-01',
          length: 65,
          stockCode,
          market,
          limitUpIndices: [50],
        });
      }

      return [];
    });

    const first = await filterLimitUpStocks({
      lookbackDays: 30,
      minLimitUpCount: 1,
      sortBy: 'limitUpCount',
      sortOrder: 'desc',
      page: 1,
      pageSize: 2,
    });

    expect(first.total).toBe(2);
    expect(first.items.map((item) => item.stockCode)).toEqual(['600001', '300001']);
    expect(first.items[0]).toMatchObject({
      limitUpCount: 2,
      firstLimitUpDate: '2026-01-10',
      lastLimitUpDate: '2026-01-30',
    });
    expect(first.items[1]).toMatchObject({
      market: 'CYB',
      limitUpCount: 1,
    });

    const second = await filterLimitUpStocks({
      lookbackDays: 30,
      minLimitUpCount: 1,
      sortBy: 'limitUpCount',
      sortOrder: 'desc',
      page: 2,
      pageSize: 2,
    });

    expect(second.items).toEqual([]);
    expect(mockedGetStockDailyHistory).toHaveBeenCalledTimes(4);
    expect(mockedGetStockDailyHistory).toHaveBeenCalledWith(
      '600001',
      'SH',
      expect.objectContaining({
        beg: expect.any(String),
        end: expect.any(String),
      }),
    );

    const sortedByDate = await filterLimitUpStocks({
      lookbackDays: 30,
      minLimitUpCount: 1,
      sortBy: 'lastLimitUpDate',
      sortOrder: 'asc',
      page: 1,
      pageSize: 10,
    });

    expect(sortedByDate.items.map((item) => item.stockCode)).toEqual(['300001', '600001']);
    expect(mockedGetStockDailyHistory).toHaveBeenCalledTimes(8);
  });

  it('honors ST and new-stock exclusions by default', async () => {
    mockedGetMarketStockPool.mockResolvedValue([
      createMarketItem('600001', '中国测试A', 'SH'),
      createMarketItem('600005', 'ST测试', 'SH'),
      createMarketItem('000004', '中国测试E', 'SZ'),
    ]);

    mockedGetStockDailyHistory.mockImplementation(async (stockCode, market) => {
      if (stockCode === '600001') {
        return createHistory({
          startDate: '2025-12-01',
          length: 65,
          stockCode,
          market,
          limitUpIndices: [60],
        });
      }

      if (stockCode === '000004') {
        return createHistory({
          startDate: '2026-01-20',
          length: 59,
          stockCode,
          market,
          limitUpIndices: [50],
        });
      }

      return [];
    });

    const result = await filterLimitUpStocks({
      lookbackDays: 30,
      page: 1,
      pageSize: 10,
    });

    expect(result.items.map((item) => item.stockCode)).toEqual(['600001']);
    expect(mockedIsStStockName).toHaveBeenCalledWith('ST测试');
  });
});

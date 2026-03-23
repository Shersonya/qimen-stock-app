/** @jest-environment node */

import type { Market } from '@/lib/contracts/qimen';
import {
  filterLimitUpStocks,
  isLimitUp,
  resetLimitUpCacheForTests,
} from '@/lib/services/limit-up';
import { getStockListingInfo, isStStockName } from '@/lib/services/stock-data';
import { getStockDailyHistory } from '@/lib/services/stock-history';

jest.mock('@/lib/services/stock-data');
jest.mock('@/lib/services/stock-history');

const mockedIsStStockName = jest.mocked(isStStockName);
const mockedGetStockListingInfo = jest.mocked(getStockListingInfo);
const mockedGetStockDailyHistory = jest.mocked(getStockDailyHistory);

type HistoryBar = Awaited<ReturnType<typeof getStockDailyHistory>>[number];
type LimitUpPoolItem = {
  c: string;
  m: number;
  n: string;
  p: number;
  amount: number;
  hybk: string;
};

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
  market: Market;
  limitUpIndices?: number[];
  closeBase?: number;
}): HistoryBar[] {
  const {
    startDate,
    length,
    stockCode,
    market,
    limitUpIndices = [],
    closeBase = 10,
  } = args;
  const limitUpSet = new Set(limitUpIndices);
  const ratio = market === 'CYB' || market === 'STAR' ? 1.199 : 1.099;
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function createLimitUpPoolItem(
  stockCode: string,
  stockName: string,
  marketFlag: number,
  latestClose: number,
  sector = '测试板块',
): LimitUpPoolItem {
  return {
    c: stockCode,
    m: marketFlag,
    n: stockName,
    p: Math.round(latestClose * 1000),
    amount: Math.round(latestClose * 120000 * 100),
    hybk: sector,
  };
}

describe('limit-up screening', () => {
  const fetchMock = jest.spyOn(global, 'fetch');

  beforeEach(() => {
    resetLimitUpCacheForTests();
    mockedIsStStockName.mockReset();
    mockedGetStockListingInfo.mockReset();
    mockedGetStockDailyHistory.mockReset();
    fetchMock.mockReset();
    mockedIsStStockName.mockImplementation((name) =>
      /^(ST|\*ST|SST|S\*ST)/i.test(name.trim()),
    );
  });

  afterAll(() => {
    fetchMock.mockRestore();
  });

  it('detects limit-up thresholds by board and excludes 688 stocks', () => {
    expect(isLimitUp(10.99, 10, '600000')).toBe(true);
    expect(isLimitUp(10.98, 10, '600000')).toBe(false);
    expect(isLimitUp(11.99, 10, '300000')).toBe(true);
    expect(isLimitUp(11.98, 10, '300000')).toBe(false);
    expect(isLimitUp(11.99, 10, '688001')).toBe(true);
    expect(isLimitUp(11.98, 10, '688001')).toBe(false);
  });

  it('filters stocks, sorts results, paginates, and caches repeated requests', async () => {
    const tradingDates = createHistory({
      startDate: '2025-12-31',
      length: 80,
      stockCode: '000001',
      market: 'SH',
    }).map((item) => item.tradeDate);
    const recentTradingDates = tradingDates.slice(-5);
    const poolByDate: Record<string, LimitUpPoolItem[]> = {
      '20260316': [
        createLimitUpPoolItem('600001', '中国测试A', 1, 12.8),
        createLimitUpPoolItem('688001', '中国测试D', 1, 26.4),
      ],
      '20260318': [
        createLimitUpPoolItem('600001', '中国测试A', 1, 13.4),
        createLimitUpPoolItem('000004', '中国测试E', 0, 9.1),
        createLimitUpPoolItem('600005', 'ST测试', 1, 8.3),
      ],
      '20260320': [
        createLimitUpPoolItem('300001', '中国测试B', 0, 24.6, '创业板'),
      ],
    };

    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input));
      const date = url.searchParams.get('date');

      return jsonResponse({
        data: {
          tc: (date && poolByDate[date]?.length) || 0,
          pool: (date && poolByDate[date]) || [],
        },
      });
    });

    mockedGetStockDailyHistory.mockImplementation(async (stockCode, market) => {
      if (stockCode === '000001' && market === 'SH') {
        return createHistory({
          startDate: '2025-12-31',
          length: 80,
          stockCode,
          market,
        });
      }

      return [];
    });
    mockedGetStockListingInfo.mockImplementation(async (stockCode) => {
      if (stockCode === '600001') {
        return {
          code: stockCode,
          name: '中国测试A',
          market: 'SH',
          listingDate: '2025-12-01',
          listingTime: '09:30',
          timeSource: 'default',
        };
      }

      if (stockCode === '300001') {
        return {
          code: stockCode,
          name: '中国测试B',
          market: 'CYB',
          listingDate: '2025-12-01',
          listingTime: '09:30',
          timeSource: 'default',
        };
      }

      return {
        code: stockCode,
        name: '中国测试E',
        market: 'SZ',
        listingDate: '2026-02-01',
        listingTime: '09:30',
        timeSource: 'default',
      };
    });

    const first = await filterLimitUpStocks({
      lookbackDays: 5,
      minLimitUpCount: 1,
      sortBy: 'limitUpCount',
      sortOrder: 'desc',
      page: 1,
      pageSize: 2,
    });

    expect(first.total).toBe(2);
    expect(first.filterDate).toBe(recentTradingDates[recentTradingDates.length - 1]);
    expect(first.items.map((item) => item.stockCode)).toEqual(['600001', '300001']);
    expect(first.items[0]).toMatchObject({
      limitUpCount: 2,
      firstLimitUpDate: '2026-03-16',
      lastLimitUpDate: '2026-03-18',
      latestClose: 13.4,
    });
    expect(first.items[1]).toMatchObject({
      market: 'CYB',
      limitUpCount: 1,
      sector: '创业板',
    });

    const second = await filterLimitUpStocks({
      lookbackDays: 5,
      minLimitUpCount: 1,
      sortBy: 'limitUpCount',
      sortOrder: 'desc',
      page: 2,
      pageSize: 2,
    });

    expect(second.items).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(mockedGetStockDailyHistory).toHaveBeenCalledTimes(1);
    expect(mockedGetStockListingInfo).toHaveBeenCalledTimes(3);
    expect(mockedGetStockDailyHistory).toHaveBeenCalledWith(
      '000001',
      'SH',
      expect.objectContaining({
        beg: expect.any(String),
        end: expect.any(String),
      }),
    );

    const sortedByDate = await filterLimitUpStocks({
      lookbackDays: 5,
      minLimitUpCount: 1,
      sortBy: 'lastLimitUpDate',
      sortOrder: 'asc',
      page: 1,
      pageSize: 10,
    });

    expect(sortedByDate.items.map((item) => item.stockCode)).toEqual(['600001', '300001']);
    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(mockedGetStockDailyHistory).toHaveBeenCalledTimes(2);
    expect(mockedGetStockListingInfo).toHaveBeenCalledTimes(6);
  });

  it('honors ST and new-stock exclusions by default', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input));
      const date = url.searchParams.get('date');

      return jsonResponse({
        data: {
          tc: date === '20260320' ? 3 : 0,
          pool:
            date === '20260320'
              ? [
                  createLimitUpPoolItem('600001', '中国测试A', 1, 12.2),
                  createLimitUpPoolItem('600005', 'ST测试', 1, 8.6),
                  createLimitUpPoolItem('000004', '中国测试E', 0, 9.3),
                ]
              : [],
        },
      });
    });

    mockedGetStockDailyHistory.mockImplementation(async (stockCode, market) => {
      if (stockCode === '000001' && market === 'SH') {
        return createHistory({
          startDate: '2025-12-31',
          length: 80,
          stockCode,
          market,
        });
      }

      return [];
    });
    mockedGetStockListingInfo.mockImplementation(async (stockCode) => {
      if (stockCode === '600001') {
        return {
          code: stockCode,
          name: '中国测试A',
          market: 'SH',
          listingDate: '2025-12-01',
          listingTime: '09:30',
          timeSource: 'default',
        };
      }

      return {
        code: stockCode,
        name: '中国测试E',
        market: 'SZ',
        listingDate: '2026-02-01',
        listingTime: '09:30',
        timeSource: 'default',
      };
    });

    const result = await filterLimitUpStocks({
      lookbackDays: 5,
      page: 1,
      pageSize: 10,
    });

    expect(result.items.map((item) => item.stockCode)).toEqual(['600001']);
    expect(mockedIsStStockName).toHaveBeenCalledWith('ST测试');
  });

  it('applies the 20% threshold to kechuang stocks when they are not excluded', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input));
      const date = url.searchParams.get('date');

      return jsonResponse({
        data: {
          tc: date === '20260320' ? 1 : 0,
          pool:
            date === '20260320'
              ? [createLimitUpPoolItem('688001', '科创样本', 1, 24.2, '科创板')]
              : [],
        },
      });
    });
    mockedGetStockDailyHistory.mockImplementation(async (stockCode, market) => {
      if (stockCode === '000001' && market === 'SH') {
        return createHistory({
          startDate: '2025-12-31',
          length: 80,
          stockCode,
          market,
        });
      }
      return [];
    });
    mockedGetStockListingInfo.mockResolvedValue({
      code: '688001',
      name: '科创样本',
      market: 'STAR',
      listingDate: '2025-12-01',
      listingTime: '09:30',
      timeSource: 'default',
    });

    const result = await filterLimitUpStocks({
      lookbackDays: 5,
      excludeKechuang: false,
      excludeNewStock: false,
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      stockCode: '688001',
      limitUpCount: 1,
    });
  });
});

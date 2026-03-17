/** @jest-environment node */

import { ERROR_CODES } from '@/lib/contracts/qimen';
import {
  getMarketStockPool,
  resetMarketStockPoolCacheForTests,
  screenMarketStocks,
} from '@/lib/services/market-screen';
import { analyzeStockWindows } from '@/lib/qimen/analysis';

jest.mock('@/lib/qimen/analysis');

const mockedAnalyzeStockWindows = jest.mocked(analyzeStockWindows);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function createWindow(stem: string, palaceName: string, position: number, door: string, star: string, god: string) {
  return {
    stem,
    palaceName,
    position,
    door,
    star,
    god,
  };
}

describe('market-screen service', () => {
  const fetchMock = jest.spyOn(global, 'fetch');

  beforeEach(() => {
    fetchMock.mockReset();
    mockedAnalyzeStockWindows.mockReset();
    resetMarketStockPoolCacheForTests();
  });

  afterAll(() => {
    fetchMock.mockRestore();
  });

  it('builds the market pool from non-ST stocks that have listing dates', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          diff: [
            { f12: '600519', f14: '贵州茅台', f26: '20010827' },
            { f12: '000001', f14: '平安银行', f26: '19910403' },
            { f12: '300750', f14: '宁德时代', f26: '20180611' },
            { f12: '600112', f14: '*ST天成', f26: '19971127' },
            { f12: '000002', f14: '万科A' },
          ],
        },
      }),
    );
    mockedAnalyzeStockWindows.mockImplementation((stock) => ({
      stock,
      hourWindow: createWindow('甲', '坎', 1, '开门', '天冲星', '玄武'),
      dayWindow: createWindow('乙', '离', 9, '生门', '天心星', '六合'),
      monthWindow: createWindow('丙', '兑', 7, '景门', '天任星', '九天'),
    }));

    const pool = await getMarketStockPool();

    expect(pool.map((item) => item.stock.code)).toEqual(['000001', '300750', '600519']);
    expect(mockedAnalyzeStockWindows).toHaveBeenCalledTimes(3);
  });

  it('requires filters and applies AND matching with pagination', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          diff: [
            { f12: '600519', f14: '贵州茅台', f26: '20010827' },
            { f12: '000001', f14: '平安银行', f26: '19910403' },
            { f12: '300750', f14: '宁德时代', f26: '20180611' },
          ],
        },
      }),
    );
    mockedAnalyzeStockWindows.mockImplementation((stock) => {
      if (stock.code === '000001') {
        return {
          stock,
          hourWindow: createWindow('甲', '坎', 1, '开门', '天冲星', '玄武'),
          dayWindow: createWindow('乙', '离', 9, '生门', '天心星', '六合'),
          monthWindow: createWindow('丙', '兑', 7, '景门', '天任星', '九天'),
        };
      }

      if (stock.code === '300750') {
        return {
          stock,
          hourWindow: createWindow('丁', '巽', 4, '开门', '天辅星', '太阴'),
          dayWindow: createWindow('戊', '坤', 2, '杜门', '天心星', '值符'),
          monthWindow: createWindow('己', '乾', 6, '景门', '天任星', '九地'),
        };
      }

      return {
        stock,
        hourWindow: createWindow('庚', '艮', 8, '死门', '天芮星', '白虎'),
        dayWindow: createWindow('辛', '震', 3, '生门', '天柱星', '腾蛇'),
        monthWindow: createWindow('壬', '离', 9, '开门', '天英星', '九天'),
      };
    });

    await expect(
      screenMarketStocks({
        filters: {},
      }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.MARKET_FILTER_REQUIRED,
      statusCode: 400,
    });

    const firstPage = await screenMarketStocks({
      filters: {
        hour: { door: '开门' },
        day: { star: '天心星' },
        month: { god: '九天' },
      },
      page: 1,
      pageSize: 1,
    });

    expect(firstPage.total).toBe(1);
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.items[0]?.stock.code).toBe('000001');

    const pagedResult = await screenMarketStocks({
      filters: {
        hour: { door: '开门' },
      },
      page: 2,
      pageSize: 1,
    });

    expect(pagedResult.total).toBe(2);
    expect(pagedResult.items).toHaveLength(1);
    expect(pagedResult.items[0]?.stock.code).toBe('300750');
  });
});

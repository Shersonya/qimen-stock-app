/** @jest-environment node */

import { ERROR_CODES } from '@/lib/contracts/qimen';
import {
  getMarketStockPool,
  resetMarketStockPoolCacheForTests,
  screenMarketStocks,
} from '@/lib/services/market-screen';
import { evaluateQimenAuspiciousPatterns } from '@/lib/qimen/auspicious-patterns';
import { analyzeStockForMarketScreen } from '@/lib/qimen/analysis';

jest.mock('@/lib/qimen/analysis');
jest.mock('@/lib/qimen/auspicious-patterns');

const mockedAnalyzeStockForMarketScreen = jest.mocked(analyzeStockForMarketScreen);
const mockedEvaluateQimenAuspiciousPatterns = jest.mocked(
  evaluateQimenAuspiciousPatterns,
);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function createWindow(
  stem: string,
  palaceName: string,
  position: number,
  door: string,
  star: string,
  god: string,
) {
  return {
    stem,
    palaceName,
    position,
    door,
    star,
    god,
  };
}

function createSnapshot(stock: {
  code: string;
  name: string;
  market: 'SH' | 'SZ' | 'CYB';
  listingDate: string;
}) {
  return {
    stock,
    hourWindow: createWindow('甲', '坎', 1, '开门', '天冲星', '玄武'),
    dayWindow: createWindow('乙', '离', 9, '生门', '天心星', '六合'),
    monthWindow: createWindow('丙', '兑', 7, '景门', '天任星', '九天'),
    patternInput: {
      stock_id: stock.code,
      stock_name: stock.name,
      qimen_data: {
        天盘干: [],
        地盘干: [],
        门盘: [],
        神盘: [],
        宫位信息: [],
        值使门: '生门',
        全局时间: {
          日干支: '甲子',
          时干支: '甲戌',
          是否伏吟: false,
        },
      },
    },
  };
}

function createPatternEvaluation(
  overrides: Partial<ReturnType<typeof evaluateQimenAuspiciousPatterns>> = {},
): ReturnType<typeof evaluateQimenAuspiciousPatterns> {
  return {
    stockId: '000001',
    stockName: '平安银行',
    marketSignal: {
      hasBAboveGE: true,
    },
    baseScore: 36,
    totalScore: 36,
    rating: 'S',
    activeMatches: [
      {
        name: '青龙返首',
        level: 'A',
        weight: 10,
        meaning: '主力资金在利好驱动下入场，短期动能强劲。',
        palaceId: 1,
        palaceLabel: '坎1宫',
      },
      {
        name: '真诈格',
        level: 'COMPOSITE',
        weight: 15,
        meaning: '良好门势、三奇与太阴同宫，长线利好或价值重估信号更强。',
        palaceId: 9,
        palaceLabel: '离9宫',
      },
    ],
    invalidPalaces: [],
    counts: {
      COMPOSITE: 1,
      A: 1,
      B: 0,
      C: 0,
    },
    corePatternsLabel: '[COMPOSITE]真诈格(离9宫)、[A]青龙返首(坎1宫)',
    energyLabel: '顶级机会(资金驱动)',
    summary: '主力资金在利好驱动下入场，短期动能强劲。',
    corePalaces: {
      timeStemPalaceId: 1,
      valueDoorPalaceId: 9,
      shengDoorPalaceId: 9,
      skyWuPalaceId: 2,
    },
    ...overrides,
  };
}

describe('market-screen service', () => {
  const fetchMock = jest.spyOn(global, 'fetch');

  beforeEach(() => {
    fetchMock.mockReset();
    mockedAnalyzeStockForMarketScreen.mockReset();
    mockedEvaluateQimenAuspiciousPatterns.mockReset();
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
    mockedAnalyzeStockForMarketScreen.mockImplementation((stock) => createSnapshot(stock));
    mockedEvaluateQimenAuspiciousPatterns.mockImplementation(() => createPatternEvaluation());

    const pool = await getMarketStockPool();

    expect(pool.map((item) => item.stock.code)).toEqual(['000001', '300750', '600519']);
    expect(mockedAnalyzeStockForMarketScreen).toHaveBeenCalledTimes(3);
    expect(pool[0]?.patternSummary?.totalScore).toBe(36);
  });

  it('retries transient upstream failures before succeeding', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockRejectedValueOnce(new Error('empty reply'))
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            diff: [
              { f12: '000001', f14: '平安银行', f26: '19910403' },
            ],
          },
        }),
      );
    mockedAnalyzeStockForMarketScreen.mockImplementation((stock) => createSnapshot(stock));
    mockedEvaluateQimenAuspiciousPatterns.mockImplementation(() => createPatternEvaluation());

    const pool = await getMarketStockPool();

    expect(pool).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('keeps legacy window filtering compatible and exposes pattern summaries', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          diff: [
            { f12: '600519', f14: '贵州茅台', f26: '20010827' },
            { f12: '000001', f14: '平安银行', f26: '19910403' },
          ],
        },
      }),
    );
    mockedAnalyzeStockForMarketScreen.mockImplementation((stock) => {
      if (stock.code === '000001') {
        return {
          ...createSnapshot(stock),
          hourWindow: createWindow('甲', '坎', 1, '开门', '天冲星', '玄武'),
        };
      }

      return {
        ...createSnapshot(stock),
        hourWindow: createWindow('丁', '巽', 4, '死门', '天辅星', '太阴'),
      };
    });
    mockedEvaluateQimenAuspiciousPatterns.mockImplementation((input) => {
      if (input.stock_id === '000001') {
        return createPatternEvaluation();
      }

      return createPatternEvaluation({
          totalScore: 12,
          rating: 'B',
          counts: {
            COMPOSITE: 0,
            A: 0,
            B: 1,
            C: 1,
          },
        });
    });

    const result = await screenMarketStocks({
      filters: {
        hour: { door: '开门' },
      },
      page: 1,
      pageSize: 50,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.stock.code).toBe('000001');
    expect(result.items[0]?.patternSummary).toMatchObject({
      totalScore: 36,
      isEligible: true,
    });
  });

  it('supports auspicious-pattern filters and rejects ineligible stocks', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          diff: [
            { f12: '000001', f14: '平安银行', f26: '19910403' },
            { f12: '300750', f14: '宁德时代', f26: '20180611' },
          ],
        },
      }),
    );
    mockedAnalyzeStockForMarketScreen.mockImplementation((stock) => {
      if (stock.code === '000001') {
        return createSnapshot(stock);
      }

      return {
        ...createSnapshot(stock),
        hourWindow: createWindow('丁', '巽', 4, '死门', '天辅星', '白虎'),
      };
    });
    mockedEvaluateQimenAuspiciousPatterns
      .mockImplementationOnce(() => createPatternEvaluation())
      .mockImplementationOnce(() =>
        createPatternEvaluation({
          activeMatches: [],
          counts: {
            COMPOSITE: 0,
            A: 0,
            B: 0,
            C: 1,
          },
          energyLabel: '结构机会(等待催化)',
          corePatternsLabel: '',
          summary: '当前样本未识别到有效吉格。',
          totalScore: 3,
          rating: 'C',
        }),
      );

    const result = await screenMarketStocks({
      filters: {
        hour: { door: '' },
        day: { star: '' },
        month: { god: '' },
        pattern: {
          names: ['青龙返首'],
          hourOnly: true,
          minScore: 20,
          palacePositions: [1],
        },
      },
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.stock.code).toBe('000001');
    expect(result.items[0]?.patternSummary?.hourPatternNames).toEqual(['青龙返首']);
  });

  it('falls back to the last cached stock pool when refresh fails', async () => {
    jest.useFakeTimers();

    try {
      jest.setSystemTime(new Date('2026-03-21T10:00:00.000Z'));
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          data: {
            diff: [
              { f12: '000001', f14: '平安银行', f26: '19910403' },
            ],
          },
        }),
      );
      mockedAnalyzeStockForMarketScreen.mockImplementation((stock) => createSnapshot(stock));
      mockedEvaluateQimenAuspiciousPatterns.mockImplementation(() => createPatternEvaluation());

      const first = await getMarketStockPool();

      expect(first).toHaveLength(1);

      jest.setSystemTime(new Date('2026-03-21T10:31:00.000Z'));
      fetchMock.mockRejectedValue(new Error('upstream down'));
      const secondPromise = getMarketStockPool();

      await jest.advanceTimersByTimeAsync(1000);

      const second = await secondPromise;

      expect(second).toHaveLength(1);
      expect(second[0]?.stock.code).toBe('000001');
    } finally {
      jest.useRealTimers();
    }
  });

  it('blocks screening when the market environment is explicitly unfavorable', async () => {
    await expect(
      screenMarketStocks({
        marketSignal: {
          hasBAboveGE: false,
        },
        filters: {
          hour: { door: '开门' },
        },
      }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.MARKET_ENVIRONMENT_UNFAVORABLE,
      statusCode: 400,
    });
  });
});

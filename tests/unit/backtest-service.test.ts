/** @jest-environment node */

import { runMarketScreenBacktest } from '@/lib/services/backtest';
import { getStockDailyHistory } from '@/lib/services/stock-history';

jest.mock('@/lib/services/stock-history');

const mockedGetStockDailyHistory = jest.mocked(getStockDailyHistory);

describe('market-screen backtest service', () => {
  beforeEach(() => {
    mockedGetStockDailyHistory.mockReset();
  });

  it('converts screened stocks into historical backtest samples', async () => {
    mockedGetStockDailyHistory.mockResolvedValue([
      {
        tradeDate: '2026-03-01',
        open: 10,
        close: 10,
        high: 10.2,
        low: 9.8,
        volume: 1000,
        amount: 10000,
      },
      {
        tradeDate: '2026-03-02',
        open: 10.1,
        close: 10.6,
        high: 10.8,
        low: 10,
        volume: 1200,
        amount: 13000,
      },
      {
        tradeDate: '2026-03-03',
        open: 10.6,
        close: 10.4,
        high: 10.7,
        low: 10.2,
        volume: 900,
        amount: 9900,
      },
    ]);

    const result = await runMarketScreenBacktest({
      items: [
        {
          stock: {
            code: '000001',
            name: '平安银行',
            market: 'SZ',
            listingDate: '1991-04-03',
            sector: '银行',
          },
          patternSummary: {
            totalScore: 36,
            rating: 'S',
            energyLabel: '顶级机会(资金驱动)',
            summary: '主力资金在利好驱动下入场，短期动能强劲。',
            corePatternsLabel: '[A]青龙返首(坎1宫)',
            matchedPatternNames: ['青龙返首'],
            hourPatternNames: ['青龙返首'],
            counts: {
              COMPOSITE: 0,
              A: 1,
              B: 0,
              C: 0,
            },
            bullishSignal: true,
            predictedDirection: '涨',
            isEligible: true,
            exclusionReason: null,
            palacePositions: [1],
            matches: [
              {
                name: '青龙返首',
                level: 'A',
                weight: 10,
                meaning: '主力资金在利好驱动下入场，短期动能强劲。',
                palaceId: 1,
                palaceLabel: '坎1宫',
              },
            ],
            invalidPalaces: [],
          },
        },
      ],
      lookbackDays: 20,
      strategyLabel: '吉格筛选',
    });

    expect(result.summary.totalSamples).toBe(2);
    expect(result.summary.hitSamples).toBe(1);
    expect(result.summary.hitRate).toBeCloseTo(0.5);
    expect(result.byStock['000001']?.totalSamples).toBe(2);
    expect(result.byStrategy['吉格筛选']?.totalSamples).toBe(2);
    expect(result.predictionRule).toContain('生门或值符定义为涨');
  });

  it('skips stocks that fail to load historical data', async () => {
    mockedGetStockDailyHistory.mockRejectedValue(new Error('upstream down'));

    const result = await runMarketScreenBacktest({
      items: [
        {
          stock: {
            code: '600519',
            name: '贵州茅台',
            market: 'SH',
            listingDate: '2001-08-27',
          },
          patternSummary: {
            totalScore: 12,
            rating: 'B',
            energyLabel: '高强度(趋势共振)',
            summary: '看多待确认。',
            corePatternsLabel: '[B]天显时格(离9宫)',
            matchedPatternNames: ['天显时格'],
            hourPatternNames: ['天显时格'],
            counts: {
              COMPOSITE: 0,
              A: 0,
              B: 1,
              C: 0,
            },
            bullishSignal: false,
            predictedDirection: '观望',
            isEligible: true,
            exclusionReason: null,
            palacePositions: [9],
            matches: [],
            invalidPalaces: [],
          },
        },
      ],
    });

    expect(result.summary.totalSamples).toBe(0);
    expect(result.skippedStocks).toEqual(['600519 数据拉取失败']);
  });
});

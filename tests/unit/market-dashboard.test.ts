/** @jest-environment node */

import { ERROR_CODES } from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';
import { getMarketDashboard } from '@/lib/services/market-dashboard';
import { evaluateQimenAuspiciousPatterns } from '@/lib/qimen/auspicious-patterns';
import { generateQimenChart } from '@/lib/qimen/engine';
import { getDragonHeadMonitor } from '@/lib/services/dragon-head';
import {
  getMarketStockPool,
  getMarketStockPoolCacheMeta,
} from '@/lib/services/market-screen';

jest.mock('@/lib/qimen/engine');
jest.mock('@/lib/qimen/auspicious-patterns');
jest.mock('@/lib/services/market-screen');
jest.mock('@/lib/services/dragon-head');

const mockedGenerateQimenChart = jest.mocked(generateQimenChart);
const mockedEvaluateQimenAuspiciousPatterns = jest.mocked(
  evaluateQimenAuspiciousPatterns,
);
const mockedGetMarketStockPool = jest.mocked(getMarketStockPool);
const mockedGetMarketStockPoolCacheMeta = jest.mocked(getMarketStockPoolCacheMeta);
const mockedGetDragonHeadMonitor = jest.mocked(getDragonHeadMonitor);

describe('market dashboard service', () => {
  beforeEach(() => {
    mockedGenerateQimenChart.mockReset();
    mockedEvaluateQimenAuspiciousPatterns.mockReset();
    mockedGetMarketStockPool.mockReset();
    mockedGetMarketStockPoolCacheMeta.mockReset();
    mockedGetDragonHeadMonitor.mockReset();
    mockedGetDragonHeadMonitor.mockResolvedValue({
      asOf: '2026-03-19T10:00:00.000Z',
      aiAdviceEnabled: true,
      summary: '测试龙头摘要',
      trendSwitch: {
        instruction: 'STAY',
        newThemeFirstBoardCount: 0,
        newThemeAverageStrength: 0,
        oldLeaderStrength: 0,
        oldLeaderWeakDays: 0,
        topBoardStrength: 0,
        themeTurnoverGrowthPct: 0,
        summary: '测试切换摘要',
      },
      positionAllocation: {
        newLeaderPercent: 0,
        oldCorePercent: 0,
        topBoardPercent: 0,
        forcedFlat: true,
        reason: '测试仓位',
      },
      circuitBreaker: {
        triggered: false,
        reasons: [],
        metrics: {
          limitDownCount: 0,
          yesterdayLimitUpAvgReturn: 0,
          maxBoardHeight: 5,
        },
      },
      newTheme: {
        label: '新题材',
        averageStrength: 0,
        firstBoardCount: 0,
      },
      oldTheme: {
        label: '老题材',
        leaderStrength: 0,
        weakDays: 0,
      },
      topBoard: {
        label: '最高标',
        strength: 0,
      },
      sourceStatus: [],
      manualReviewChecklist: [],
    });
  });

  it('aggregates signal, heat, sectors, and cache metadata for the dashboard', async () => {
    mockedGetMarketStockPool.mockResolvedValueOnce([
      {
        stock: {
          code: '000001',
          name: '平安银行',
          market: 'SZ',
          listingDate: '1991-04-03',
          sector: '银行',
        },
        hourWindow: { stem: '甲', palaceName: '坎', position: 1, door: '开门', star: '天冲星', god: '玄武' },
        dayWindow: { stem: '乙', palaceName: '离', position: 9, door: '生门', star: '天心星', god: '六合' },
        monthWindow: { stem: '丙', palaceName: '兑', position: 7, door: '景门', star: '天任星', god: '九天' },
        patternSummary: {
          totalScore: 36,
          rating: 'S',
          energyLabel: '顶级机会(资金驱动)',
          summary: '测试摘要',
          corePatternsLabel: '[A]青龙返首(坎1宫)',
          matchedPatternNames: ['青龙返首'],
          hourPatternNames: ['青龙返首'],
          counts: { COMPOSITE: 0, A: 1, B: 0, C: 2 },
          bullishSignal: true,
          predictedDirection: '涨',
          isEligible: true,
          exclusionReason: null,
          palacePositions: [1],
          matches: [],
          invalidPalaces: [],
        },
      },
      {
        stock: {
          code: '600519',
          name: '贵州茅台',
          market: 'SH',
          listingDate: '2001-08-27',
          sector: '白酒',
        },
        hourWindow: { stem: '乙', palaceName: '离', position: 9, door: '生门', star: '天柱星', god: '腾蛇' },
        dayWindow: { stem: '壬', palaceName: '离', position: 9, door: '生门', star: '天柱星', god: '腾蛇' },
        monthWindow: { stem: '丙', palaceName: '艮', position: 8, door: '惊门', star: '天辅星', god: '白虎' },
        patternSummary: {
          totalScore: 28,
          rating: 'A',
          energyLabel: '高强度(趋势共振)',
          summary: '测试摘要',
          corePatternsLabel: '[A]青龙返首(坎1宫)',
          matchedPatternNames: ['青龙返首'],
          hourPatternNames: ['青龙返首'],
          counts: { COMPOSITE: 1, A: 1, B: 1, C: 0 },
          bullishSignal: true,
          predictedDirection: '涨',
          isEligible: true,
          exclusionReason: null,
          palacePositions: [1, 9],
          matches: [],
          invalidPalaces: [],
        },
      },
    ]);
    mockedGetMarketStockPoolCacheMeta.mockReturnValue({
      cached: true,
      updatedAt: '2026-03-19T10:00:00.000Z',
      expiresAt: '2026-03-19T10:30:00.000Z',
      source: 'live_market_pool',
      notice: null,
    });
    mockedGenerateQimenChart.mockReturnValue({
      yinYang: '阴',
      ju: 2,
      valueStar: '天心星',
      valueDoor: '开门',
      palaces: [
        { index: 0, position: 4, name: '巽', star: '天芮星', door: '休门', god: '太阴', wuxing: '木' },
        { index: 1, position: 9, name: '离', star: '天柱星', door: '生门', god: '腾蛇', wuxing: '火' },
      ],
      meta: {
        analysisTime: '2026-03-19T10:00:00.000Z',
        solarTerm: '春分',
        xunHead: '甲子',
        xunHeadGan: '戊',
        yearGanzhi: '丙午',
        monthGanzhi: '己卯',
        dayGanzhi: '甲辰',
        hourGanzhi: '乙巳',
        rikong: '子丑',
        shikong: '寅卯',
        isFuyin: false,
        isFanyin: false,
        isWubuyushi: false,
        valueStarPalace: 9,
        valueDoorPalace: 3,
      },
    });
    mockedEvaluateQimenAuspiciousPatterns.mockReturnValue({
      stockId: 'MARKET',
      stockName: '全市场',
      marketSignal: {
        hasBAboveGE: true,
      },
      baseScore: 25,
      totalScore: 25,
      rating: 'A',
      activeMatches: [
        {
          name: '青龙返首',
          level: 'A',
          weight: 10,
          meaning: '测试',
          palaceId: 9,
          palaceLabel: '离9宫',
        },
      ],
      invalidPalaces: [],
      counts: {
        COMPOSITE: 0,
        A: 1,
        B: 0,
        C: 0,
      },
      corePatternsLabel: '[A]青龙返首(离9宫)',
      energyLabel: '高强度(趋势共振)',
      summary: '测试摘要',
      corePalaces: {
        timeStemPalaceId: 1,
        valueDoorPalaceId: 9,
        shengDoorPalaceId: 9,
        skyWuPalaceId: 2,
      },
    });

    const result = await getMarketDashboard();

    expect(result.marketSignal.statusLabel).toBe('有吉气');
    expect(result.patternHeat).toEqual({
      COMPOSITE: 1,
      A: 2,
      B: 1,
      C: 2,
    });
    expect(result.topSectors).toEqual([
      { label: '白酒', count: 1 },
      { label: '银行', count: 1 },
    ]);
    expect(result.topStocks[0]).toMatchObject({
      code: '000001',
      totalScore: 36,
    });
    expect(result.cache.cached).toBe(true);
    expect(result.dragonHead.summary).toBe('测试龙头摘要');
  });

  it('degrades gracefully when the market stock pool source is temporarily unavailable', async () => {
    mockedGetMarketStockPool.mockRejectedValueOnce(
      new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502),
    );
    mockedGetMarketStockPoolCacheMeta.mockReturnValue({
      cached: false,
      updatedAt: null,
      expiresAt: null,
      source: undefined,
      notice: null,
    });
    mockedGenerateQimenChart.mockReturnValue({
      yinYang: '阴',
      ju: 2,
      valueStar: '天心星',
      valueDoor: '开门',
      palaces: [
        { index: 0, position: 4, name: '巽', star: '天芮星', door: '休门', god: '太阴', wuxing: '木' },
      ],
      meta: {
        analysisTime: '2026-03-19T10:00:00.000Z',
        solarTerm: '春分',
        xunHead: '甲子',
        xunHeadGan: '戊',
        yearGanzhi: '丙午',
        monthGanzhi: '己卯',
        dayGanzhi: '甲辰',
        hourGanzhi: '乙巳',
        rikong: '子丑',
        shikong: '寅卯',
        isFuyin: false,
        isFanyin: false,
        isWubuyushi: false,
        valueStarPalace: 9,
        valueDoorPalace: 3,
      },
    });
    mockedEvaluateQimenAuspiciousPatterns.mockReturnValue({
      stockId: 'MARKET',
      stockName: '全市场',
      marketSignal: {
        hasBAboveGE: false,
      },
      baseScore: 5,
      totalScore: 5,
      rating: 'C',
      activeMatches: [],
      invalidPalaces: [],
      counts: {
        COMPOSITE: 0,
        A: 0,
        B: 0,
        C: 1,
      },
      corePatternsLabel: '',
      energyLabel: '结构机会(等待催化)',
      summary: '测试摘要',
      corePalaces: {
        timeStemPalaceId: 1,
        valueDoorPalaceId: 9,
        shengDoorPalaceId: 9,
        skyWuPalaceId: 2,
      },
    });

    const result = await getMarketDashboard();

    expect(result.universeSize).toBe(0);
    expect(result.patternHeat).toEqual({
      COMPOSITE: 0,
      A: 0,
      B: 0,
      C: 0,
    });
    expect(result.topSectors).toEqual([]);
    expect(result.topStocks).toEqual([]);
    expect(result.marketSignal.summary).toContain('当前全市场样本源暂时不可用');
  });

  it('surfaces bundled fallback metadata after the stock pool resolves', async () => {
    mockedGetMarketStockPool.mockResolvedValueOnce([
      {
        stock: {
          code: '601975',
          name: '招商南油',
          market: 'SH',
          listingDate: '2019-01-08',
          sector: '航运',
        },
        hourWindow: { stem: '甲', palaceName: '坎', position: 1, door: '开门', star: '天冲星', god: '玄武' },
        dayWindow: { stem: '乙', palaceName: '离', position: 9, door: '生门', star: '天心星', god: '六合' },
        monthWindow: { stem: '丙', palaceName: '兑', position: 7, door: '景门', star: '天任星', god: '九天' },
        patternSummary: {
          totalScore: 30,
          rating: 'A',
          energyLabel: '高强度(趋势共振)',
          summary: '测试摘要',
          corePatternsLabel: '[A]青龙返首(坎1宫)',
          matchedPatternNames: ['青龙返首'],
          hourPatternNames: ['青龙返首'],
          counts: { COMPOSITE: 0, A: 1, B: 0, C: 0 },
          bullishSignal: true,
          predictedDirection: '涨',
          isEligible: true,
          exclusionReason: null,
          palacePositions: [1],
          matches: [],
          invalidPalaces: [],
        },
      },
    ]);
    mockedGetMarketStockPoolCacheMeta
      .mockReturnValueOnce({
        cached: false,
        updatedAt: null,
        expiresAt: null,
        source: undefined,
        notice: null,
      })
      .mockReturnValueOnce({
        cached: true,
        updatedAt: '2026-03-20T10:00:00.000Z',
        expiresAt: '2026-03-20T10:30:00.000Z',
        source: 'bundled_limit_up_snapshot',
        notice: '全市场主样本源暂不可用，已切换到内置涨停活跃股样本。',
      });
    mockedGenerateQimenChart.mockReturnValue({
      yinYang: '阴',
      ju: 2,
      valueStar: '天心星',
      valueDoor: '开门',
      palaces: [
        { index: 0, position: 4, name: '巽', star: '天芮星', door: '休门', god: '太阴', wuxing: '木' },
      ],
      meta: {
        analysisTime: '2026-03-19T10:00:00.000Z',
        solarTerm: '春分',
        xunHead: '甲子',
        xunHeadGan: '戊',
        yearGanzhi: '丙午',
        monthGanzhi: '己卯',
        dayGanzhi: '甲辰',
        hourGanzhi: '乙巳',
        rikong: '子丑',
        shikong: '寅卯',
        isFuyin: false,
        isFanyin: false,
        isWubuyushi: false,
        valueStarPalace: 9,
        valueDoorPalace: 3,
      },
    });
    mockedEvaluateQimenAuspiciousPatterns.mockReturnValue({
      stockId: 'MARKET',
      stockName: '全市场',
      marketSignal: {
        hasBAboveGE: true,
      },
      baseScore: 25,
      totalScore: 25,
      rating: 'A',
      activeMatches: [],
      invalidPalaces: [],
      counts: {
        COMPOSITE: 0,
        A: 1,
        B: 0,
        C: 0,
      },
      corePatternsLabel: '[A]青龙返首(离9宫)',
      energyLabel: '高强度(趋势共振)',
      summary: '测试摘要',
      corePalaces: {
        timeStemPalaceId: 1,
        valueDoorPalaceId: 9,
        shengDoorPalaceId: 9,
        skyWuPalaceId: 2,
      },
    });

    const result = await getMarketDashboard();

    expect(result.cache.source).toBe('bundled_limit_up_snapshot');
    expect(result.cache.notice).toContain('内置涨停活跃股样本');
    expect(result.marketSignal.summary).toContain('内置涨停活跃股样本');
  });
});

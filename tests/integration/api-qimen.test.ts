/** @jest-environment node */

import { NextRequest } from 'next/server';

import {
  DEFAULT_LISTING_TIME,
  DEFAULT_TIME_SOURCE,
  ERROR_CODES,
} from '@/lib/contracts/qimen';
import { POST } from '@/app/api/qimen/route';
import { AppError } from '@/lib/errors';
import { generatePlumAnalysisFromOpenPrice } from '@/lib/plum/engine';
import { generateQimenChart } from '@/lib/qimen/engine';
import { evaluateQimenAuspiciousPatterns } from '@/lib/qimen/auspicious-patterns';
import { analyzeStockForMarketScreen } from '@/lib/qimen/analysis';
import { buildDeepDiagnosisReport } from '@/lib/qimen/deep-diagnosis';
import { buildQimenPatternAnalysis } from '@/lib/qimen/pattern-report';
import { getStockListingInfo } from '@/lib/services/stock-data';
import { getStockOpenPrice } from '@/lib/services/stock-quote';

jest.mock('@/lib/services/stock-data');
jest.mock('@/lib/qimen/engine');
jest.mock('@/lib/services/stock-quote');
jest.mock('@/lib/plum/engine');
jest.mock('@/lib/qimen/analysis');
jest.mock('@/lib/qimen/auspicious-patterns');
jest.mock('@/lib/qimen/pattern-report');
jest.mock('@/lib/qimen/deep-diagnosis');

const mockedGetStockListingInfo = jest.mocked(getStockListingInfo);
const mockedGenerateQimenChart = jest.mocked(generateQimenChart);
const mockedGetStockOpenPrice = jest.mocked(getStockOpenPrice);
const mockedGeneratePlumAnalysisFromOpenPrice = jest.mocked(generatePlumAnalysisFromOpenPrice);
const mockedAnalyzeStockForMarketScreen = jest.mocked(analyzeStockForMarketScreen);
const mockedEvaluateQimenAuspiciousPatterns = jest.mocked(
  evaluateQimenAuspiciousPatterns,
);
const mockedBuildQimenPatternAnalysis = jest.mocked(buildQimenPatternAnalysis);
const mockedBuildDeepDiagnosisReport = jest.mocked(buildDeepDiagnosisReport);

function createRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/qimen', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/qimen', () => {
  beforeEach(() => {
    mockedGetStockListingInfo.mockReset();
    mockedGenerateQimenChart.mockReset();
    mockedGetStockOpenPrice.mockReset();
    mockedGeneratePlumAnalysisFromOpenPrice.mockReset();
    mockedAnalyzeStockForMarketScreen.mockReset();
    mockedEvaluateQimenAuspiciousPatterns.mockReset();
    mockedBuildQimenPatternAnalysis.mockReset();
    mockedBuildDeepDiagnosisReport.mockReset();
  });

  it('returns stock and qimen data on success', async () => {
    mockedGetStockListingInfo.mockResolvedValueOnce({
      code: '600519',
      name: '贵州茅台',
      market: 'SH',
      listingDate: '2001-08-27',
      listingTime: DEFAULT_LISTING_TIME,
      timeSource: DEFAULT_TIME_SOURCE,
    });
    mockedGenerateQimenChart.mockReturnValueOnce({
      yinYang: '阴',
      ju: 2,
      valueStar: '天心星',
      valueDoor: '开门',
      palaces: [],
    });
    mockedGetStockOpenPrice.mockResolvedValueOnce('1468.00');
    mockedGeneratePlumAnalysisFromOpenPrice.mockReturnValueOnce({
      status: 'ready',
      priceBasis: 'open',
      priceValue: '1468.00',
      upperNumber: 1468,
      lowerNumber: 0,
      movingLine: 4,
      upperTrigram: '震',
      lowerTrigram: '坤',
      original: {
        code: '震坤',
        name: '雷地豫',
        words: '利建侯行师。',
        whiteWords: '《豫》卦利于封建诸侯和行军作战。',
        picture: '雷出地奋，豫。',
        whitePicture: '雷从地中奋起，是豫卦的卦象。',
        stockSuggestion: '震荡后转强。',
        yaoci: '初六：鸣豫，凶。',
      },
      mutual: {
        code: '坎艮',
        name: '水山蹇',
        words: '利西南，不利东北。',
        whiteWords: '《蹇》卦利于西南，不利于东北。',
        picture: '山上有水，蹇。',
        whitePicture: '山上有水，是蹇卦的卦象。',
        stockSuggestion: '遇阻观望。',
        yaoci: '六二：王臣蹇蹇。',
      },
      changed: {
        code: '兑坤',
        name: '泽地萃',
        words: '亨，王假有庙。',
        whiteWords: '《萃》卦亨通，君王来到宗庙。',
        picture: '泽上于地，萃。',
        whitePicture: '湖泽汇聚于地上，是萃卦的卦象。',
        stockSuggestion: '量能聚集。',
        yaoci: '九四：大吉，无咎。',
      },
    });
    mockedAnalyzeStockForMarketScreen.mockReturnValueOnce({
      stock: {
        code: '600519',
        name: '贵州茅台',
        market: 'SH',
        listingDate: '2001-08-27',
      },
      hourWindow: {
        stem: '乙',
        palaceName: '坎',
        position: 1,
        door: '生门',
        star: '天冲星',
        god: '值符',
      },
      dayWindow: {
        stem: '壬',
        palaceName: '离',
        position: 9,
        door: '开门',
        star: '天心星',
        god: '六合',
      },
      monthWindow: {
        stem: '丙',
        palaceName: '兑',
        position: 7,
        door: '景门',
        star: '天任星',
        god: '九天',
      },
      patternInput: {
        stock_id: '600519',
        stock_name: '贵州茅台',
        qimen_data: {
          天盘干: [],
          地盘干: [],
          门盘: [],
          神盘: [],
          宫位信息: [],
          值使门: '开门',
          全局时间: {
            日干支: '壬戌',
            时干支: '乙巳',
            是否伏吟: false,
          },
        },
      },
    });
    mockedEvaluateQimenAuspiciousPatterns.mockReturnValueOnce({
      stockId: '600519',
      stockName: '贵州茅台',
      marketSignal: {
        hasBAboveGE: true,
      },
      baseScore: 25,
      totalScore: 25,
      rating: 'A',
      activeMatches: [],
      invalidPalaces: [],
      counts: {
        COMPOSITE: 1,
        A: 1,
        B: 0,
        C: 0,
      },
      corePatternsLabel: '[A]青龙返首(坎1宫)',
      energyLabel: '高强度(趋势共振)',
      summary: '主力资金在利好驱动下入场，短期动能强劲。',
      corePalaces: {
        timeStemPalaceId: 1,
        valueDoorPalaceId: 9,
        shengDoorPalaceId: 1,
        skyWuPalaceId: 2,
      },
    });
    mockedBuildQimenPatternAnalysis.mockReturnValueOnce({
      totalScore: 25,
      rating: 'A',
      energyLabel: '高强度(趋势共振)',
      summary: '主力资金在利好驱动下入场，短期动能强劲。',
      corePatternsLabel: '[A]青龙返首(坎1宫)',
      bullishSignal: true,
      predictedDirection: '涨',
      matchedPatternNames: ['青龙返首'],
      hourPatternNames: ['青龙返首'],
      counts: {
        COMPOSITE: 0,
        A: 1,
        B: 0,
        C: 0,
      },
      invalidPalaces: [],
      palaceAnnotations: [],
    });
    mockedBuildDeepDiagnosisReport.mockReturnValueOnce({
      basis: {
        stockCode: '600519',
        stockName: '贵州茅台',
        analysisTime: '2001-08-27T01:30:00.000Z',
        yearGanzhi: '辛巳',
        monthGanzhi: '丙申',
        dayGanzhi: '壬戌',
        hourGanzhi: '乙巳',
      },
      coreConclusion: '测试结论',
      action: 'WATCH',
      actionLabel: '观望',
      successProbability: 61,
      riskLevel: '中',
      firstImpression: '测试首印象',
      globalPattern: {
        isFuyin: false,
        isFanyin: false,
        isWubuyushi: false,
        rikong: '子丑',
        shikong: '寅卯',
        summary: '测试摘要',
      },
      useShen: [],
      palaceReadings: [],
      decisionRationale: [],
      outlooks: [],
      keyTimingHints: [],
      actionGuide: [],
      note: '测试备注',
    });

    const patternConfigOverride = {
      patternOverrides: {
        青龙返首: {
          enabled: false,
        },
      },
    };
    const response = await POST(
      createRequest({
        stockCode: '600519',
        patternConfigOverride,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedEvaluateQimenAuspiciousPatterns).toHaveBeenCalledWith(
      expect.objectContaining({
        stock_id: '600519',
      }),
      patternConfigOverride,
    );
    expect(body).toEqual({
      stock: {
        code: '600519',
        name: '贵州茅台',
        market: 'SH',
        listingDate: '2001-08-27',
        listingTime: DEFAULT_LISTING_TIME,
        timeSource: DEFAULT_TIME_SOURCE,
      },
      qimen: {
        yinYang: '阴',
        ju: 2,
        valueStar: '天心星',
        valueDoor: '开门',
        palaces: [],
      },
      plum: {
        status: 'ready',
        priceBasis: 'open',
        priceValue: '1468.00',
        upperNumber: 1468,
        lowerNumber: 0,
        movingLine: 4,
        upperTrigram: '震',
        lowerTrigram: '坤',
        original: {
          code: '震坤',
          name: '雷地豫',
          words: '利建侯行师。',
          whiteWords: '《豫》卦利于封建诸侯和行军作战。',
          picture: '雷出地奋，豫。',
          whitePicture: '雷从地中奋起，是豫卦的卦象。',
          stockSuggestion: '震荡后转强。',
          yaoci: '初六：鸣豫，凶。',
        },
        mutual: {
          code: '坎艮',
          name: '水山蹇',
          words: '利西南，不利东北。',
          whiteWords: '《蹇》卦利于西南，不利于东北。',
          picture: '山上有水，蹇。',
          whitePicture: '山上有水，是蹇卦的卦象。',
          stockSuggestion: '遇阻观望。',
          yaoci: '六二：王臣蹇蹇。',
        },
        changed: {
          code: '兑坤',
          name: '泽地萃',
          words: '亨，王假有庙。',
          whiteWords: '《萃》卦亨通，君王来到宗庙。',
          picture: '泽上于地，萃。',
          whitePicture: '湖泽汇聚于地上，是萃卦的卦象。',
          stockSuggestion: '量能聚集。',
          yaoci: '九四：大吉，无咎。',
        },
      },
      patternAnalysis: {
        totalScore: 25,
        rating: 'A',
        energyLabel: '高强度(趋势共振)',
        summary: '主力资金在利好驱动下入场，短期动能强劲。',
        corePatternsLabel: '[A]青龙返首(坎1宫)',
        bullishSignal: true,
        predictedDirection: '涨',
        matchedPatternNames: ['青龙返首'],
        hourPatternNames: ['青龙返首'],
        counts: {
          COMPOSITE: 0,
          A: 1,
          B: 0,
          C: 0,
        },
        invalidPalaces: [],
        palaceAnnotations: [],
      },
      deepDiagnosis: {
        basis: {
          stockCode: '600519',
          stockName: '贵州茅台',
          analysisTime: '2001-08-27T01:30:00.000Z',
          yearGanzhi: '辛巳',
          monthGanzhi: '丙申',
          dayGanzhi: '壬戌',
          hourGanzhi: '乙巳',
        },
        coreConclusion: '测试结论',
        action: 'WATCH',
        actionLabel: '观望',
        successProbability: 61,
        riskLevel: '中',
        firstImpression: '测试首印象',
        globalPattern: {
          isFuyin: false,
          isFanyin: false,
          isWubuyushi: false,
          rikong: '子丑',
          shikong: '寅卯',
          summary: '测试摘要',
        },
        useShen: [],
        palaceReadings: [],
        decisionRationale: [],
        outlooks: [],
        keyTimingHints: [],
        actionGuide: [],
        note: '测试备注',
      },
    });
  });

  it('returns qimen together with a plum unavailable state when open price is missing', async () => {
    mockedGetStockListingInfo.mockResolvedValueOnce({
      code: '000001',
      name: '平安银行',
      market: 'SZ',
      listingDate: '1991-04-03',
      listingTime: DEFAULT_LISTING_TIME,
      timeSource: DEFAULT_TIME_SOURCE,
    });
    mockedGenerateQimenChart.mockReturnValueOnce({
      yinYang: '阳',
      ju: 9,
      valueStar: '天禽',
      valueDoor: '死门',
      palaces: [],
    });
    mockedGetStockOpenPrice.mockResolvedValueOnce(null);
    mockedAnalyzeStockForMarketScreen.mockReturnValueOnce({
      stock: {
        code: '000001',
        name: '平安银行',
        market: 'SZ',
        listingDate: '1991-04-03',
      },
      hourWindow: {
        stem: '甲',
        palaceName: '坎',
        position: 1,
        door: '死门',
        star: '天冲星',
        god: '玄武',
      },
      dayWindow: {
        stem: '乙',
        palaceName: '离',
        position: 9,
        door: '生门',
        star: '天心星',
        god: '六合',
      },
      monthWindow: {
        stem: '丙',
        palaceName: '兑',
        position: 7,
        door: '景门',
        star: '天任星',
        god: '九天',
      },
      patternInput: {
        stock_id: '000001',
        stock_name: '平安银行',
        qimen_data: {
          天盘干: [],
          地盘干: [],
          门盘: [],
          神盘: [],
          宫位信息: [],
          值使门: '死门',
          全局时间: {
            日干支: '甲子',
            时干支: '甲子',
            是否伏吟: false,
          },
        },
      },
    });
    mockedEvaluateQimenAuspiciousPatterns.mockReturnValueOnce({
      stockId: '000001',
      stockName: '平安银行',
      marketSignal: {
        hasBAboveGE: true,
      },
      baseScore: 0,
      totalScore: 0,
      rating: 'C',
      activeMatches: [],
      invalidPalaces: [],
      counts: {
        COMPOSITE: 0,
        A: 0,
        B: 0,
        C: 0,
      },
      corePatternsLabel: '',
      energyLabel: '结构机会(等待催化)',
      summary: '当前样本未识别到有效吉格。',
      corePalaces: {
        timeStemPalaceId: 1,
        valueDoorPalaceId: 1,
        shengDoorPalaceId: 8,
        skyWuPalaceId: 2,
      },
    });
    mockedBuildQimenPatternAnalysis.mockReturnValueOnce({
      totalScore: 0,
      rating: 'C',
      energyLabel: '结构机会(等待催化)',
      summary: '当前样本未识别到有效吉格。',
      corePatternsLabel: '',
      bullishSignal: false,
      predictedDirection: '观望',
      matchedPatternNames: [],
      hourPatternNames: [],
      counts: {
        COMPOSITE: 0,
        A: 0,
        B: 0,
        C: 0,
      },
      invalidPalaces: [],
      palaceAnnotations: [],
    });
    mockedBuildDeepDiagnosisReport.mockReturnValueOnce({
      basis: {
        stockCode: '000001',
        stockName: '平安银行',
        analysisTime: '1991-04-03T01:30:00.000Z',
        yearGanzhi: '辛未',
        monthGanzhi: '辛卯',
        dayGanzhi: '甲子',
        hourGanzhi: '甲子',
      },
      coreConclusion: '测试结论',
      action: 'SELL',
      actionLabel: '不宜操作 / 可考虑卖出',
      successProbability: 66,
      riskLevel: '高',
      firstImpression: '测试首印象',
      globalPattern: {
        isFuyin: false,
        isFanyin: false,
        isWubuyushi: false,
        rikong: '戌亥',
        shikong: '申酉',
        summary: '测试摘要',
      },
      useShen: [],
      palaceReadings: [],
      decisionRationale: [],
      outlooks: [],
      keyTimingHints: [],
      actionGuide: [],
      note: '测试备注',
    });

    const response = await POST(createRequest({ stockCode: '000001' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.plum).toEqual({
      status: 'unavailable',
      code: ERROR_CODES.PLUM_PRICE_UNAVAILABLE,
      message: '当日开盘价缺失，暂时无法起梅花卦。',
    });
    expect(body.deepDiagnosis).toBeTruthy();
    expect(mockedGeneratePlumAnalysisFromOpenPrice).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid stock code errors', async () => {
    mockedGetStockListingInfo.mockRejectedValueOnce(
      new AppError(ERROR_CODES.INVALID_STOCK_CODE, 400),
    );

    const response = await POST(createRequest({ stockCode: '12' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(ERROR_CODES.INVALID_STOCK_CODE);
  });

  it('returns 400 when the upstream stock lookup reports an unsupported market', async () => {
    mockedGetStockListingInfo.mockRejectedValueOnce(
      new AppError(ERROR_CODES.UNSUPPORTED_MARKET, 400),
    );

    const response = await POST(createRequest({ stockCode: '111111' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(ERROR_CODES.UNSUPPORTED_MARKET);
  });

  it('returns 400 when the stock is classified as ST', async () => {
    mockedGetStockListingInfo.mockRejectedValueOnce(
      new AppError(ERROR_CODES.ST_STOCK_UNSUPPORTED, 400),
    );

    const response = await POST(createRequest({ stockCode: '600112' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(ERROR_CODES.ST_STOCK_UNSUPPORTED);
  });

  it('returns 502 when the upstream data source fails', async () => {
    mockedGetStockListingInfo.mockRejectedValueOnce(
      new AppError(ERROR_CODES.DATA_SOURCE_ERROR, 502),
    );

    const response = await POST(createRequest({ stockCode: '600519' }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error.code).toBe(ERROR_CODES.DATA_SOURCE_ERROR);
  });
});

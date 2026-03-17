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
import { getStockListingInfo } from '@/lib/services/stock-data';
import { getStockOpenPrice } from '@/lib/services/stock-quote';

jest.mock('@/lib/services/stock-data');
jest.mock('@/lib/qimen/engine');
jest.mock('@/lib/services/stock-quote');
jest.mock('@/lib/plum/engine');

const mockedGetStockListingInfo = jest.mocked(getStockListingInfo);
const mockedGenerateQimenChart = jest.mocked(generateQimenChart);
const mockedGetStockOpenPrice = jest.mocked(getStockOpenPrice);
const mockedGeneratePlumAnalysisFromOpenPrice = jest.mocked(generatePlumAnalysisFromOpenPrice);

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

    const response = await POST(createRequest({ stockCode: '600519' }));
    const body = await response.json();

    expect(response.status).toBe(200);
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

    const response = await POST(createRequest({ stockCode: '000001' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.plum).toEqual({
      status: 'unavailable',
      code: ERROR_CODES.PLUM_PRICE_UNAVAILABLE,
      message: '当日开盘价缺失，暂时无法起梅花卦。',
    });
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

  it('returns 400 for unsupported markets such as STAR Market stocks', async () => {
    mockedGetStockListingInfo.mockRejectedValueOnce(
      new AppError(ERROR_CODES.UNSUPPORTED_MARKET, 400),
    );

    const response = await POST(createRequest({ stockCode: '688981' }));
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

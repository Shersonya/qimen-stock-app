/** @jest-environment node */

import { NextRequest } from 'next/server';

import { POST } from '@/app/api/market-screen/route';
import { ERROR_CODES } from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';
import { screenMarketStocks } from '@/lib/services/market-screen';

jest.mock('@/lib/services/market-screen');

const mockedScreenMarketStocks = jest.mocked(screenMarketStocks);

function createRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/market-screen', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/market-screen', () => {
  beforeEach(() => {
    mockedScreenMarketStocks.mockReset();
  });

  it('returns screened stocks on success', async () => {
    mockedScreenMarketStocks.mockResolvedValueOnce({
      total: 1,
      page: 1,
      pageSize: 50,
      items: [
        {
          stock: {
            code: '000001',
            name: '平安银行',
            market: 'SZ',
            listingDate: '1991-04-03',
            sector: '银行',
          },
          hourWindow: {
            stem: '甲',
            palaceName: '坎',
            position: 1,
            door: '开门',
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
          patternSummary: {
            totalScore: 36,
            rating: 'S',
            energyLabel: '顶级机会(资金驱动)',
            summary: '主力资金在利好驱动下入场，短期动能强劲。',
            corePatternsLabel: '[COMPOSITE]真诈格(离9宫)、[A]青龙返首(坎1宫)',
            matchedPatternNames: ['真诈格', '青龙返首'],
            hourPatternNames: ['青龙返首'],
            counts: {
              COMPOSITE: 1,
              A: 1,
              B: 0,
              C: 0,
            },
            bullishSignal: false,
            predictedDirection: '观望',
            isEligible: true,
            exclusionReason: null,
            palacePositions: [1, 9],
            matches: [
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
          },
        },
      ],
    });

    const response = await POST(
      createRequest({
        filters: {
          hour: { door: '开门' },
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.items[0].stock.code).toBe('000001');
    expect(body.items[0].patternSummary.totalScore).toBe(36);
  });

  it('returns 400 when no filter condition is provided', async () => {
    mockedScreenMarketStocks.mockRejectedValueOnce(
      new AppError(ERROR_CODES.MARKET_FILTER_REQUIRED, 400),
    );

    const response = await POST(createRequest({ filters: {} }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(ERROR_CODES.MARKET_FILTER_REQUIRED);
  });

  it('returns 400 when the market environment is unfavorable', async () => {
    mockedScreenMarketStocks.mockRejectedValueOnce(
      new AppError(ERROR_CODES.MARKET_ENVIRONMENT_UNFAVORABLE, 400),
    );

    const response = await POST(
      createRequest({
        marketSignal: {
          hasBAboveGE: false,
        },
        filters: {
          pattern: {
            names: ['青龙返首'],
          },
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(ERROR_CODES.MARKET_ENVIRONMENT_UNFAVORABLE);
  });
});

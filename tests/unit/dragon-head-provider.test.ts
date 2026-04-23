/** @jest-environment node */

import { getDragonHeadCandidates } from '@/lib/services/dragon-head';
import { filterLimitUpStocks } from '@/lib/services/limit-up';
import { getStockIntradaySpeed10m } from '@/lib/services/stock-intraday';
import { scanTdxSignals } from '@/lib/services/tdx-scan';

jest.mock('@/lib/services/limit-up');
jest.mock('@/lib/services/stock-intraday');
jest.mock('@/lib/services/tdx-scan');

const mockedFilterLimitUpStocks = jest.mocked(filterLimitUpStocks);
const mockedGetStockIntradaySpeed10m = jest.mocked(getStockIntradaySpeed10m);
const mockedScanTdxSignals = jest.mocked(scanTdxSignals);

describe('dragon-head provider integration', () => {
  beforeEach(() => {
    mockedFilterLimitUpStocks.mockReset();
    mockedGetStockIntradaySpeed10m.mockReset();
    mockedScanTdxSignals.mockReset();
  });

  it('uses intraday ten-minute speed when minute data is available', async () => {
    mockedScanTdxSignals.mockResolvedValueOnce({
      total: 1,
      page: 1,
      pageSize: 8,
      scanDate: '2026-04-23',
      meta: {
        cached: false,
        universeSource: 'market_pool',
        universeSize: 1,
      },
      items: [
        {
          stockCode: '000001',
          stockName: '平安银行',
          market: 'SZ',
          signalDate: '2026-04-23',
          closePrice: 10.8,
          volume: 100000,
          trueCGain: 0.05,
          volumeRatio: 2.4,
          meiZhu: true,
          meiYangYang: true,
          signalStrength: 80,
          biasRate: 0,
          maUp: true,
          fiveLinesBull: true,
        },
      ],
    });
    mockedGetStockIntradaySpeed10m.mockResolvedValueOnce(0.061);
    mockedFilterLimitUpStocks.mockResolvedValueOnce({
      total: 1,
      page: 1,
      pageSize: 8,
      filterDate: '2026-04-23',
      lookbackDays: 30,
      items: [
        {
          stockCode: '000001',
          stockName: '平安银行',
          market: 'SZ',
          sector: '银行',
          limitUpDates: ['2026-04-23'],
          limitUpCount: 1,
          firstLimitUpDate: '2026-04-23',
          lastLimitUpDate: '2026-04-23',
          latestClose: 10.8,
          latestVolume: 100000,
        },
      ],
      meta: {
        source: 'live',
      },
    });

    const result = await getDragonHeadCandidates();
    const candidate = result.items[0]!;

    expect(mockedGetStockIntradaySpeed10m).toHaveBeenCalledWith('000001', 'SZ');
    expect(candidate.strength.missingFactors).not.toContain('speed10m');
    expect(candidate.strength.factorBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'speed10m',
          rawValue: 0.061,
          available: true,
        }),
      ]),
    );
    expect(result.sourceStatus[0]).toMatchObject({
      provider: 'intradayQuote',
      source: 'tdx_daily_proxy+eastmoney_minute',
    });
  });
});

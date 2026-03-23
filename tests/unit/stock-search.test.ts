/** @jest-environment node */

import {
  STOCK_SEARCH_AMBIGUOUS_MESSAGE,
  STOCK_SEARCH_EMPTY_MESSAGE,
  STOCK_SEARCH_INVALID_CODE_MESSAGE,
  findStockByCode,
  formatStockDisplay,
  getBestMatch,
  resolveStock,
  searchStocks,
} from '@/lib/stockSearch';
import { MOCK_STOCKS } from '@/data/stocks';

describe('stockSearch', () => {
  it('loads a complete local A-share pool instead of a tiny demo list', () => {
    expect(MOCK_STOCKS.length).toBeGreaterThan(5500);
    expect(findStockByCode('688981')).toMatchObject({
      code: '688981',
      market: 'STAR',
    });
    expect(findStockByCode('920047')).toMatchObject({
      code: '920047',
      market: 'BJ',
    });
  });

  it('prioritizes exact code matches above other suggestions', () => {
    const results = searchStocks('600519');

    expect(results[0]).toMatchObject({
      code: '600519',
      name: '贵州茅台',
      matchType: 'code-exact',
    });
  });

  it('supports fuzzy Chinese name lookup and mixed code prefixes', () => {
    expect(searchStocks('茅台')[0]).toMatchObject({
      code: '600519',
      name: '贵州茅台',
    });
    expect(searchStocks('中芯')[0]).toMatchObject({
      code: '688981',
      name: '中芯国际',
    });
    expect(searchStocks('诺思兰')[0]).toMatchObject({
      code: '920047',
      name: '诺思兰德',
    });

    const broadCodeResults = searchStocks('300');

    expect(broadCodeResults).toHaveLength(12);
    expect(broadCodeResults.every((item) => item.code.startsWith('300'))).toBe(true);
    expect(searchStocks('30075')[0]).toMatchObject({
      code: '300750',
      name: '宁德时代',
    });
  });

  it('returns many real fuzzy matches for broad single-character queries', () => {
    const results = searchStocks('川');

    expect(results).toHaveLength(12);
    expect(results.map((item) => item.name)).toEqual(
      expect.arrayContaining(['川能动力', '川投能源', '川仪股份']),
    );
  });

  it('formats selected stocks as code plus name', () => {
    expect(formatStockDisplay(findStockByCode('600519')!)).toBe('600519 贵州茅台');
    expect(formatStockDisplay(findStockByCode('000002')!)).toBe('000002 万科A');
  });

  it('resolves a unique fuzzy match for automatic submission', () => {
    const resolution = resolveStock('宁德');

    expect(resolution.isConfident).toBe(true);
    expect(resolution.stock).toMatchObject({
      code: '300750',
      name: '宁德时代',
    });
  });

  it('rejects invalid numeric codes with a clear message', () => {
    const resolution = resolveStock('123456');

    expect(resolution).toEqual({
      stock: null,
      suggestions: [],
      isConfident: false,
      reason: 'invalid-code',
      errorMessage: STOCK_SEARCH_INVALID_CODE_MESSAGE,
    });
  });

  it('flags ambiguous fuzzy matches instead of guessing', () => {
    const resolution = resolveStock('平安');

    expect(resolution.isConfident).toBe(false);
    expect(resolution.reason).toBe('ambiguous');
    expect(resolution.errorMessage).toBe(STOCK_SEARCH_AMBIGUOUS_MESSAGE);
    expect(resolution.suggestions.map((item) => item.code)).toEqual(
      expect.arrayContaining(['000001', '601318']),
    );
  });

  it('returns null best match when the query is ambiguous or absent', () => {
    expect(getBestMatch('平安')).toBeNull();
    expect(getBestMatch('不存在')).toBeNull();
    expect(resolveStock('不存在').errorMessage).toBe(STOCK_SEARCH_EMPTY_MESSAGE);
  });
});

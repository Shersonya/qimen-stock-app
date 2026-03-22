/** @jest-environment node */

import { generatePlumAnalysisFromOpenPrice } from '@/lib/plum/engine';
import plumData from '@/lib/plum/meihua-data.json';

describe('generatePlumAnalysisFromOpenPrice', () => {
  it('reproduces the legacy Python plum calculation for a known sample', () => {
    const result = generatePlumAnalysisFromOpenPrice('9.14');

    expect(result).toMatchObject({
      status: 'ready',
      priceBasis: 'open',
      priceValue: '9.14',
      upperNumber: 9,
      lowerNumber: 14,
      movingLine: 5,
      upperTrigram: '乾',
      lowerTrigram: '坎',
    });
    expect(result.original.name).toBe('天水讼');
    expect(result.mutual.name).toBe('火泽睽');
    expect(result.changed.name).toBe('火水未济');
  });

  it('keeps boundary cases stable when integer and decimal parts are zero', () => {
    const result = generatePlumAnalysisFromOpenPrice('0.00');

    expect(result.upperNumber).toBe(0);
    expect(result.lowerNumber).toBe(0);
    expect(result.movingLine).toBe(6);
    expect(result.original.code).toBe('坤坤');
  });

  it('loads the full 64-gua dataset', () => {
    expect(Object.keys(plumData)).toHaveLength(64);
    expect(plumData['乾坤']).toMatchObject({
      name: '天地否',
      stock_suggestion: expect.any(String),
      yaoci: expect.any(String),
    });
  });
});

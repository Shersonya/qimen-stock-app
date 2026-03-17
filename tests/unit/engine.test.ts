/** @jest-environment node */

import { generateQimenChart } from '@/lib/qimen/engine';

describe('generateQimenChart', () => {
  it('returns a stable nine-palace board that matches the benchmarked 拆补盘', () => {
    const result = generateQimenChart(new Date('2001-08-27T09:30:00+08:00'));

    expect(result.yinYang).toBe('阴');
    expect(result.ju).toBe(7);
    expect(result.valueStar).toBe('天冲');
    expect(result.valueDoor).toBe('伤门');
    expect(result.palaces).toHaveLength(9);
    expect(result.palaces.map((item) => item.position)).toEqual([
      4, 9, 2, 3, 5, 7, 8, 1, 6,
    ]);
    expect(result.palaces[4]).toMatchObject({
      name: '中',
      star: '天禽',
      door: '--',
      god: '--',
    });
  });
});

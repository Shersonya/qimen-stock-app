/** @jest-environment node */

import { generateQimenChart } from '@/lib/qimen/engine';

describe('generateQimenChart', () => {
  it('returns a vendor-aligned nine-palace board with stems and optional debug metadata', () => {
    const result = generateQimenChart(
      new Date('2001-08-27T09:30:00+08:00'),
      { includeDebug: true },
    );

    expect(result.yinYang).toBe('阴');
    expect(result.ju).toBe(2);
    expect(result.valueStar).toBe('天心星');
    expect(result.valueDoor).toBe('开门');
    expect(result.debug).toMatchObject({
      source: '@yhjs/dunjia@1.0.1',
      solarTerm: '处暑',
      dayGanzhi: '壬戌',
      hourGanzhi: '乙巳',
      xunHead: '甲寅',
      xunHeadGan: '癸',
      valueStarPalace: 2,
      valueDoorPalace: 3,
    });
    expect(result.palaces).toHaveLength(9);
    expect(result.palaces.map((item) => item.position)).toEqual([
      4, 9, 2, 3, 5, 7, 8, 1, 6,
    ]);
    expect(result.palaces[0]).toMatchObject({
      name: '巽',
      skyGan: '戊',
      groundGan: '丙',
      star: '天芮星',
      door: '休门',
      god: '太阴',
    });
    expect(result.palaces[4]).toMatchObject({
      name: '中',
      skyGan: '--',
      groundGan: '--',
      star: '--',
      door: '--',
      god: '--',
    });
  });

  it('keeps the default output stable when debug metadata is not requested', () => {
    const result = generateQimenChart(new Date('2001-08-27T09:30:00+08:00'));

    expect(result.debug).toBeUndefined();
    expect(result.valueStar).toBe('天心星');
    expect(result.valueDoor).toBe('开门');
  });
});

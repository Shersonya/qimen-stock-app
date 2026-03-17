/** @jest-environment node */

import type { VendorBoard } from '@yhjs/dunjia';

import {
  analyzeStockWindows,
  findWindowBySkyStem,
  getGanzhiSnapshot,
  toChinaDate,
} from '@/lib/qimen/analysis';

describe('qimen analysis helpers', () => {
  it('extracts the exact month, day, and hour ganzhi from China time', () => {
    expect(getGanzhiSnapshot(toChinaDate('2001-08-27'))).toEqual({
      monthGanzhi: '丙申',
      dayGanzhi: '壬戌',
      hourGanzhi: '乙巳',
    });
  });

  it('derives hour, day, and month windows from sky stems', () => {
    expect(
      analyzeStockWindows({
        code: '600519',
        name: '贵州茅台',
        market: 'SH',
        listingDate: '2001-08-27',
      }),
    ).toEqual({
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
        door: '死门',
        star: '天冲星',
        god: '玄武',
      },
      dayWindow: {
        stem: '壬',
        palaceName: '离',
        position: 9,
        door: '生门',
        star: '天柱星',
        god: '腾蛇',
      },
      monthWindow: {
        stem: '丙',
        palaceName: '艮',
        position: 8,
        door: '惊门',
        star: '天辅星',
        god: '白虎',
      },
    });
  });

  it('falls back to skyExtraGan when the stem is not found on skyGan', () => {
    const board = {
      meta: {
        xunHeadGan: '戊',
      },
      palaces: [
        {
          name: '巽',
          position: 4,
          skyGan: '戊',
          skyExtraGan: '丁',
          door: { name: '休门' },
          star: { name: '天芮星' },
          god: { name: '太阴' },
        },
      ],
    } as VendorBoard;

    expect(findWindowBySkyStem(board, '丁')).toEqual({
      stem: '丁',
      palaceName: '巽',
      position: 4,
      door: '休门',
      star: '天芮星',
      god: '太阴',
    });
  });

  it('maps 甲 stem to the board xun head gan before locating the window', () => {
    const board = {
      meta: {
        xunHeadGan: '壬',
      },
      palaces: [
        {
          name: '乾',
          position: 6,
          skyGan: '壬',
          skyExtraGan: '丙',
          door: { name: '伤门' },
          star: { name: '天芮星' },
          god: { name: '值符' },
        },
      ],
    } as VendorBoard;

    expect(findWindowBySkyStem(board, '甲')).toEqual({
      stem: '甲',
      palaceName: '乾',
      position: 6,
      door: '伤门',
      star: '天芮星',
      god: '值符',
    });
  });
});

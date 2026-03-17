/** @jest-environment node */

import { generateQimenChart } from '@/lib/qimen/engine';

const benchmarkFixtures = [
  {
    datetime: '1990-12-19T09:30:00+08:00',
    expected: {
      yinYang: '阴',
      ju: 7,
      valueStar: '禽芮',
      valueDoor: '死门',
    },
  },
  {
    datetime: '1994-07-20T09:30:00+08:00',
    expected: {
      yinYang: '阴',
      ju: 5,
      valueStar: '天蓬',
      valueDoor: '休门',
    },
  },
  {
    datetime: '2010-05-31T09:30:00+08:00',
    expected: {
      yinYang: '阳',
      ju: 5,
      valueStar: '天柱',
      valueDoor: '惊门',
    },
  },
  {
    datetime: '1991-04-03T09:30:00+08:00',
    expected: {
      yinYang: '阳',
      ju: 9,
      valueStar: '天禽',
      valueDoor: '死门',
    },
  },
  {
    datetime: '2018-06-11T09:30:00+08:00',
    expected: {
      yinYang: '阳',
      ju: 9,
      valueStar: '天英',
      valueDoor: '景门',
    },
  },
] as const;

describe('generateQimenChart benchmarks', () => {
  it.each(benchmarkFixtures)(
    'matches the xuebz.com 拆补盘 benchmark for $datetime',
    ({ datetime, expected }) => {
      const result = generateQimenChart(new Date(datetime));

      expect(result).toMatchObject(expected);
    },
  );
});

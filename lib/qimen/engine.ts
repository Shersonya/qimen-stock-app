import { Solar } from 'lunar-typescript';

import type { QimenPalace, QimenResult } from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';

const EMPTY_SLOT = '--';
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
const SANQI_LIUYI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'] as const;
const GRID_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6] as const;
const PALACE_CLOCKWISE: number[] = [2, 7, 6, 1, 8, 3, 4, 9];
const PALACE_COUNTER_CLOCKWISE: number[] = [2, 9, 4, 3, 8, 1, 6, 7];
const STAR_SEQUENCE = ['天心', '天蓬', '天任', '天冲', '天辅', '天英', '天芮', '天柱'] as const;
const GATE_SEQUENCE = ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门'] as const;
const DEITIES = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'] as const;

const PALACE_NAMES: Record<number, string> = {
  1: '坎',
  2: '坤',
  3: '震',
  4: '巽',
  5: '中',
  6: '乾',
  7: '兑',
  8: '艮',
  9: '离',
};

const LIUJIA_XUN: Record<string, string> = {
  甲子: '戊',
  甲戌: '己',
  甲申: '庚',
  甲午: '辛',
  甲辰: '壬',
  甲寅: '癸',
};

const STAR_ORIGINAL_POSITIONS: Record<string, number> = {
  天蓬: 1,
  天芮: 2,
  天冲: 3,
  天辅: 4,
  天禽: 5,
  天心: 6,
  天柱: 7,
  天任: 8,
  天英: 9,
};

const GATE_ORIGINAL_POSITIONS: Record<string, number> = {
  休门: 1,
  生门: 8,
  伤门: 3,
  杜门: 4,
  景门: 9,
  死门: 2,
  惊门: 7,
  开门: 6,
};

const YANG_DUN_TERMS = new Set([
  '冬至',
  '小寒',
  '大寒',
  '立春',
  '雨水',
  '惊蛰',
  '春分',
  '清明',
  '谷雨',
  '立夏',
  '小满',
  '芒种',
]);

const YANG_DUN_TABLE: Record<string, readonly [number, number, number]> = {
  冬至: [1, 7, 4],
  小寒: [2, 8, 5],
  大寒: [3, 9, 6],
  立春: [8, 5, 2],
  雨水: [9, 6, 3],
  惊蛰: [1, 7, 4],
  春分: [3, 9, 6],
  清明: [4, 1, 7],
  谷雨: [5, 2, 8],
  立夏: [4, 1, 7],
  小满: [5, 2, 8],
  芒种: [6, 3, 9],
};

const YIN_DUN_TABLE: Record<string, readonly [number, number, number]> = {
  夏至: [9, 3, 6],
  小暑: [8, 2, 5],
  大暑: [7, 1, 4],
  立秋: [2, 5, 8],
  处暑: [1, 4, 7],
  白露: [9, 3, 6],
  秋分: [7, 1, 4],
  寒露: [6, 9, 3],
  霜降: [5, 8, 2],
  立冬: [6, 9, 3],
  小雪: [5, 8, 2],
  大雪: [4, 7, 1],
};

type YinYang = '阳' | '阴';

type PalaceState = {
  star: string;
  door: string;
  god: string;
};

function getStemAndBranch(ganzhi: string): { stem: string; branch: string } {
  const [stem = '', branch = ''] = Array.from(ganzhi);
  return { stem, branch };
}

function getXunShou(ganzhi: string): string {
  const jiaZi = Array.from({ length: 60 }, (_, index) => {
    return STEMS[index % STEMS.length] + BRANCHES[index % BRANCHES.length];
  });
  const index = jiaZi.indexOf(ganzhi);

  if (index < 0) {
    throw new AppError('API_ERROR', 500, `无法识别干支：${ganzhi}`);
  }

  return jiaZi[Math.floor(index / 10) * 10]!;
}

function getYuanIndex(branch: string): 0 | 1 | 2 {
  if (['子', '午', '卯', '酉'].includes(branch)) {
    return 0;
  }

  if (['寅', '申', '巳', '亥'].includes(branch)) {
    return 1;
  }

  return 2;
}

function resolveChartMeta(datetime: Date): {
  solarTerm: string;
  hourGanzhi: string;
  yinYang: YinYang;
  ju: number;
} {
  const solar = Solar.fromYmdHms(
    datetime.getFullYear(),
    datetime.getMonth() + 1,
    datetime.getDate(),
    datetime.getHours(),
    datetime.getMinutes(),
    datetime.getSeconds(),
  );
  const lunar = solar.getLunar();
  const prevJieQi = lunar.getPrevJieQi();

  if (!prevJieQi) {
    throw new AppError('API_ERROR', 500, '无法获取排盘所需节气。');
  }

  const solarTerm = prevJieQi.getName();
  const dayGanzhi = lunar.getDayInGanZhiExact();
  const hourGanzhi = lunar.getTimeInGanZhi();
  const { stem, branch } = getStemAndBranch(dayGanzhi);
  let stemIndex = STEMS.indexOf(stem as (typeof STEMS)[number]);
  let branchIndex = BRANCHES.indexOf(branch as (typeof BRANCHES)[number]);

  if (stemIndex < 0 || branchIndex < 0) {
    throw new AppError('API_ERROR', 500, '无法解析排盘所需日柱。');
  }

  if (datetime.getHours() >= 23) {
    stemIndex = (stemIndex + 1) % STEMS.length;
    branchIndex = (branchIndex + 1) % BRANCHES.length;
  }

  const fuTouOffset = stemIndex % 5;
  const fuTouBranch = BRANCHES[
    ((branchIndex - fuTouOffset) % BRANCHES.length + BRANCHES.length) %
      BRANCHES.length
  ]!;
  const yuanIndex = getYuanIndex(fuTouBranch);
  const yinYang: YinYang = YANG_DUN_TERMS.has(solarTerm) ? '阳' : '阴';
  const juTable =
    yinYang === '阳' ? YANG_DUN_TABLE[solarTerm] : YIN_DUN_TABLE[solarTerm];

  if (!juTable) {
    throw new AppError('API_ERROR', 500, `当前节气暂不支持排盘：${solarTerm}`);
  }

  return {
    solarTerm,
    hourGanzhi,
    yinYang,
    ju: juTable[yuanIndex],
  };
}

function buildEarthPlate(ju: number, yinYang: YinYang): Map<number, string> {
  const earthPlate = new Map<number, string>();

  SANQI_LIUYI.forEach((stem, index) => {
    let palace = yinYang === '阳' ? ((ju - 1 + index) % 9) + 1 : ju - index;

    while (palace < 1) {
      palace += 9;
    }

    earthPlate.set(palace, stem);
  });

  return earthPlate;
}

function findStemPalace(earthPlate: Map<number, string>, stem: string): number {
  for (const [palace, itemStem] of earthPlate.entries()) {
    if (itemStem === stem) {
      return palace;
    }
  }

  return 5;
}

function getValueStarOrigin(hourGanzhi: string, earthPlate: Map<number, string>) {
  const xunShou = getXunShou(hourGanzhi);
  const valueStem = LIUJIA_XUN[xunShou] ?? '戊';
  const originPalace = findStemPalace(earthPlate, valueStem);
  const valueStar =
    Object.entries(STAR_ORIGINAL_POSITIONS).find(
      ([, palace]) => palace === originPalace,
    )?.[0] ?? '天禽';

  return {
    xunShou,
    valueStar,
    originPalace,
  };
}

function getValueStarPalace(
  hourGanzhi: string,
  xunShou: string,
  earthPlate: Map<number, string>,
): number {
  const { stem } = getStemAndBranch(hourGanzhi);
  const actualStem = stem === '甲' ? LIUJIA_XUN[xunShou] ?? '戊' : stem;
  const rawPalace = findStemPalace(earthPlate, actualStem);

  return rawPalace === 5 ? 2 : rawPalace;
}

function getValueDoor(
  hourGanzhi: string,
  originPalace: number,
  yinYang: YinYang,
): { valueDoor: string; doorPalace: number } {
  const actualOriginPalace = originPalace === 5 ? 2 : originPalace;
  const valueDoor =
    Object.entries(GATE_ORIGINAL_POSITIONS).find(
      ([, palace]) => palace === actualOriginPalace,
    )?.[0] ?? '休门';
  const xunShou = getXunShou(hourGanzhi);
  const { branch } = getStemAndBranch(hourGanzhi);
  const { branch: xunBranch } = getStemAndBranch(xunShou);
  const stepCount =
    (BRANCHES.indexOf(branch as (typeof BRANCHES)[number]) -
      BRANCHES.indexOf(xunBranch as (typeof BRANCHES)[number]) +
      BRANCHES.length) %
    BRANCHES.length;
  let doorPalace = originPalace;

  for (let index = 0; index < stepCount; index += 1) {
    doorPalace += yinYang === '阳' ? 1 : -1;

    if (doorPalace > 9) {
      doorPalace = 1;
    }

    if (doorPalace < 1) {
      doorPalace = 9;
    }
  }

  if (doorPalace === 5) {
    doorPalace = 2;
  }

  return {
    valueDoor,
    doorPalace,
  };
}

function arrangeStars(
  valueStar: string,
  valueStarPalace: number,
): Map<number, string> {
  const stars = new Map<number, string>();
  const effectiveStar = valueStar === '天禽' ? '天芮' : valueStar;
  const sequenceIndex = STAR_SEQUENCE.indexOf(
    effectiveStar as (typeof STAR_SEQUENCE)[number],
  );
  const palaceIndex = PALACE_CLOCKWISE.indexOf(valueStarPalace === 5 ? 2 : valueStarPalace);

  for (let index = 0; index < PALACE_CLOCKWISE.length; index += 1) {
    const palace = PALACE_CLOCKWISE[(palaceIndex + index) % PALACE_CLOCKWISE.length]!;
    const star = STAR_SEQUENCE[(sequenceIndex + index) % STAR_SEQUENCE.length]!;
    stars.set(palace, star);
  }

  stars.set(5, '天禽');

  return stars;
}

function arrangeDoors(valueDoor: string, valueDoorPalace: number): Map<number, string> {
  const doors = new Map<number, string>();
  const sequenceIndex = GATE_SEQUENCE.indexOf(
    valueDoor as (typeof GATE_SEQUENCE)[number],
  );
  const palaceIndex = PALACE_CLOCKWISE.indexOf(valueDoorPalace === 5 ? 2 : valueDoorPalace);

  for (let index = 0; index < PALACE_CLOCKWISE.length; index += 1) {
    const palace = PALACE_CLOCKWISE[(palaceIndex + index) % PALACE_CLOCKWISE.length]!;
    const door = GATE_SEQUENCE[(sequenceIndex + index) % GATE_SEQUENCE.length]!;
    doors.set(palace, door);
  }

  return doors;
}

function arrangeGods(valueStarPalace: number, yinYang: YinYang): Map<number, string> {
  const gods = new Map<number, string>();
  const sequence = yinYang === '阳' ? PALACE_CLOCKWISE : PALACE_COUNTER_CLOCKWISE;
  const palaceIndex = sequence.indexOf(valueStarPalace === 5 ? 2 : valueStarPalace);

  DEITIES.forEach((god, index) => {
    gods.set(sequence[(palaceIndex + index) % sequence.length]!, god);
  });

  return gods;
}

function buildPalaces(
  stars: Map<number, string>,
  doors: Map<number, string>,
  gods: Map<number, string>,
): Map<number, PalaceState> {
  const palaces = new Map<number, PalaceState>();

  for (let palace = 1; palace <= 9; palace += 1) {
    palaces.set(palace, {
      star: palace === 5 ? '天禽' : EMPTY_SLOT,
      door: EMPTY_SLOT,
      god: EMPTY_SLOT,
    });
  }

  for (const [palace, star] of stars.entries()) {
    palaces.get(palace)!.star = star;
  }

  for (const [palace, door] of doors.entries()) {
    palaces.get(palace)!.door = door;
  }

  for (const [palace, god] of gods.entries()) {
    palaces.get(palace)!.god = god;
  }

  palaces.get(5)!.door = EMPTY_SLOT;
  palaces.get(5)!.god = EMPTY_SLOT;

  return palaces;
}

function mapPalaces(palaces: Map<number, PalaceState>): QimenPalace[] {
  return GRID_ORDER.map((position, index) => {
    const palace = palaces.get(position);

    if (!palace) {
      throw new AppError('API_ERROR', 500, `奇门盘缺少宫位：${position}`);
    }

    return {
      index,
      position,
      name: PALACE_NAMES[position],
      star: palace.star,
      door: palace.door,
      god: palace.god,
    };
  });
}

function formatValueStar(valueStar: string): string {
  return valueStar === '天芮' ? '禽芮' : valueStar;
}

export function generateQimenChart(datetime: Date): QimenResult {
  const { hourGanzhi, yinYang, ju } = resolveChartMeta(datetime);
  const earthPlate = buildEarthPlate(ju, yinYang);
  const { xunShou, valueStar, originPalace } = getValueStarOrigin(
    hourGanzhi,
    earthPlate,
  );
  const valueStarPalace = getValueStarPalace(hourGanzhi, xunShou, earthPlate);
  const { valueDoor, doorPalace } = getValueDoor(hourGanzhi, originPalace, yinYang);
  const stars = arrangeStars(valueStar, valueStarPalace);
  const doors = arrangeDoors(valueDoor, doorPalace);
  const gods = arrangeGods(valueStarPalace, yinYang);
  const palaces = buildPalaces(stars, doors, gods);

  return {
    yinYang,
    ju,
    valueStar: formatValueStar(valueStar),
    valueDoor,
    palaces: mapPalaces(palaces),
  };
}

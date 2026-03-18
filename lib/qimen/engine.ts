import { TimeDunjia, type VendorBoard, type VendorPalace } from '@yhjs/dunjia';
import { Solar } from 'lunar-typescript';

import type {
  QimenDebugSnapshot,
  QimenPalace,
  QimenResult,
} from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';

const EMPTY_SLOT = '--';
const QIMEN_ENGINE_SOURCE = '@yhjs/dunjia@1.0.1';

type ChinaDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type GenerateQimenChartOptions = {
  includeDebug?: boolean;
};

function getChinaDateParts(datetime: Date): ChinaDateParts {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(datetime);
  const getPart = (type: Intl.DateTimeFormatPartTypes) => {
    const value = parts.find((part) => part.type === type)?.value;

    if (!value) {
      throw new AppError('API_ERROR', 500, `无法解析中国时区时间片段：${type}`);
    }

    return Number(value);
  };

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
    second: getPart('second'),
  };
}

function buildSolar(datetime: Date) {
  const chinaDate = getChinaDateParts(datetime);

  return Solar.fromYmdHms(
    chinaDate.year,
    chinaDate.month,
    chinaDate.day,
    chinaDate.hour,
    chinaDate.minute,
    chinaDate.second,
  );
}

function normalizeText(value: string | null | undefined) {
  return value && value.trim() ? value : EMPTY_SLOT;
}

function buildVendorBoard(datetime: Date): VendorBoard {
  try {
    return TimeDunjia.create({
      datetime,
      type: 'hour',
    });
  } catch (error) {
    throw new AppError(
      'API_ERROR',
      500,
      `排盘引擎计算失败：${error instanceof Error ? error.message : '未知错误'}`,
    );
  }
}

function findValueStarPalace(board: VendorBoard): VendorPalace {
  const palace = board.palaces.find((item) => item.god?.name === '值符' && item.star);

  if (!palace) {
    throw new AppError('API_ERROR', 500, '无法定位值符星所在宫位。');
  }

  return palace;
}

function findValueDoorPalace(
  board: VendorBoard,
  valueStarPalace: VendorPalace,
): VendorPalace {
  const originPalace = valueStarPalace.star?.originPalace;
  const palace = board.palaces.find(
    (item) => originPalace != null && item.door?.originPalace === originPalace,
  );

  if (!palace) {
    throw new AppError('API_ERROR', 500, '无法定位值使门所在宫位。');
  }

  return palace;
}

function mapPalace(palace: VendorPalace): QimenPalace {
  return {
    index: palace.index,
    position: palace.position,
    name: palace.name ?? '中',
    skyGan: normalizeText(palace.skyGan),
    groundGan: normalizeText(palace.groundGan),
    star: normalizeText(palace.star?.name),
    door: normalizeText(palace.door?.name),
    god: normalizeText(palace.god?.name),
  };
}

function buildDebugSnapshot(
  datetime: Date,
  board: VendorBoard,
  valueStarPalace: VendorPalace,
  valueDoorPalace: VendorPalace,
): QimenDebugSnapshot {
  const lunar = buildSolar(datetime).getLunar();

  return {
    source: QIMEN_ENGINE_SOURCE,
    solarTerm: board.meta.solarTerm,
    monthGanzhi: lunar.getMonthInGanZhiExact(),
    dayGanzhi: lunar.getDayInGanZhiExact(),
    hourGanzhi: lunar.getTimeInGanZhi(),
    xunHead: board.meta.xunHead,
    xunHeadGan: board.meta.xunHeadGan,
    yinYang: board.meta.yinyang,
    ju: board.meta.juNumber,
    valueStarPalace: valueStarPalace.position,
    valueDoorPalace: valueDoorPalace.position,
  };
}

export function inspectQimenChart(datetime: Date): Required<QimenResult> {
  const board = buildVendorBoard(datetime);
  const valueStarPalace = findValueStarPalace(board);
  const valueDoorPalace = findValueDoorPalace(board, valueStarPalace);
  const palaces = board.palaces.map(mapPalace);

  return {
    yinYang: board.meta.yinyang,
    ju: board.meta.juNumber,
    valueStar: normalizeText(valueStarPalace.star?.name),
    valueDoor: normalizeText(valueDoorPalace.door?.name),
    palaces,
    debug: buildDebugSnapshot(datetime, board, valueStarPalace, valueDoorPalace),
  };
}

export function generateQimenChart(
  datetime: Date,
  options: GenerateQimenChartOptions = {},
): QimenResult {
  const inspected = inspectQimenChart(datetime);

  if (options.includeDebug) {
    return inspected;
  }

  return {
    yinYang: inspected.yinYang,
    ju: inspected.ju,
    valueStar: inspected.valueStar,
    valueDoor: inspected.valueDoor,
    palaces: inspected.palaces,
  };
}

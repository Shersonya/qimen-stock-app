import { TimeDunjia, type VendorBoard, type VendorPalace } from '@yhjs/dunjia';
import { Solar } from 'lunar-typescript';

import {
  DEFAULT_LISTING_TIME,
  ERROR_CODES,
  type MarketScreenResultItem,
  type MarketScreenWindow,
  type Market,
} from '@/lib/contracts/qimen';
import { AppError } from '@/lib/errors';

const EMPTY_SLOT = '--';

type ChinaDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type ScreenableStock = {
  code: string;
  name: string;
  market: Market;
  listingDate: string;
};

type GanzhiSnapshot = {
  monthGanzhi: string;
  dayGanzhi: string;
  hourGanzhi: string;
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
      throw new AppError(ERROR_CODES.API_ERROR, 500, `无法解析中国时区时间片段：${type}`);
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

function getStem(ganzhi: string): string {
  return Array.from(ganzhi)[0] ?? '';
}

function normalizeStemForLookup(board: VendorBoard, stem: string): string {
  if (stem === '甲') {
    return board.meta.xunHeadGan;
  }

  return stem;
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

export function toChinaDate(
  listingDate: string,
  listingTime = DEFAULT_LISTING_TIME,
): Date {
  return new Date(`${listingDate}T${listingTime}:00+08:00`);
}

export function getGanzhiSnapshot(datetime: Date): GanzhiSnapshot {
  const lunar = buildSolar(datetime).getLunar();

  return {
    monthGanzhi: lunar.getMonthInGanZhiExact(),
    dayGanzhi: lunar.getDayInGanZhiExact(),
    hourGanzhi: lunar.getTimeInGanZhi(),
  };
}

function toWindowResult(stem: string, palace: VendorPalace): MarketScreenWindow {
  return {
    stem,
    palaceName: palace.name ?? '中',
    position: palace.position,
    door: palace.door?.name ?? EMPTY_SLOT,
    star: palace.star?.name ?? EMPTY_SLOT,
    god: palace.god?.name ?? EMPTY_SLOT,
  };
}

export function findWindowBySkyStem(
  board: VendorBoard,
  stem: string,
): MarketScreenWindow {
  const lookupStem = normalizeStemForLookup(board, stem);
  const palace = board.palaces.find(
    (item) => item.skyGan === lookupStem || item.skyExtraGan === lookupStem,
  );

  if (!palace) {
    throw new AppError(
      ERROR_CODES.API_ERROR,
      500,
      `天盘中未找到干 ${stem} 对应的用神窗口。`,
    );
  }

  return toWindowResult(stem, palace);
}

export function analyzeStockWindows(
  stock: ScreenableStock,
): MarketScreenResultItem {
  const datetime = toChinaDate(stock.listingDate);
  const board = TimeDunjia.create({ datetime });
  const ganzhi = getGanzhiSnapshot(datetime);

  return {
    stock: {
      code: stock.code,
      name: stock.name,
      market: stock.market,
      listingDate: stock.listingDate,
    },
    hourWindow: findWindowBySkyStem(board, getStem(ganzhi.hourGanzhi)),
    dayWindow: findWindowBySkyStem(board, getStem(ganzhi.dayGanzhi)),
    monthWindow: findWindowBySkyStem(board, getStem(ganzhi.monthGanzhi)),
  };
}

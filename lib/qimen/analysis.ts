import { TimeDunjia, type VendorBoard, type VendorPalace } from '@yhjs/dunjia';
import { Solar } from 'lunar-typescript';

import {
  DEFAULT_LISTING_TIME,
  ERROR_CODES,
  type MarketScreenResultItem,
  type MarketScreenWindow,
  type Market,
} from '@/lib/contracts/qimen';
import type { RawQimenStockInput } from '@/lib/qimen/auspicious-patterns';
import { generateQimenChart } from '@/lib/qimen/engine';
import { AppError } from '@/lib/errors';

const EMPTY_SLOT = '--';
const PALACE_WUXING_MAP: Record<number, string> = {
  1: '水',
  2: '土',
  3: '木',
  4: '木',
  5: '土',
  6: '金',
  7: '金',
  8: '土',
  9: '火',
};

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

export type MarketScreenAnalysisSnapshot = MarketScreenResultItem & {
  patternInput: RawQimenStockInput;
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

function buildPatternInput(
  stock: ScreenableStock,
  board: VendorBoard,
  ganzhi: GanzhiSnapshot,
): RawQimenStockInput {
  const qimen = generateQimenChart(toChinaDate(stock.listingDate));

  return {
    stock_id: stock.code,
    stock_name: stock.name,
    qimen_data: {
      天盘干: board.palaces.map((palace) => palace.skyGan ?? ''),
      地盘干: board.palaces.map((palace) => palace.groundGan ?? ''),
      门盘: board.palaces.map((palace) => palace.door?.name ?? '--'),
      神盘: board.palaces.map((palace) => palace.god?.name ?? '--'),
      宫位信息: board.palaces.map((palace) => ({
        id: palace.position,
        五行: PALACE_WUXING_MAP[palace.position] ?? '',
        八卦: palace.name ?? '中',
      })),
      值使门: qimen.valueDoor,
      全局时间: {
        日干支: ganzhi.dayGanzhi,
        时干支: ganzhi.hourGanzhi,
        是否伏吟: false,
      },
    },
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

export function analyzeStockForMarketScreen(
  stock: ScreenableStock,
): MarketScreenAnalysisSnapshot {
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
    patternInput: buildPatternInput(stock, board, ganzhi),
  };
}

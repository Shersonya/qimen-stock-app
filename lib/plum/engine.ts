import meihuaData from '@/lib/plum/meihua-data.json';
import type {
  PlumReadyResult,
  PlumStage,
} from '@/lib/contracts/qimen';

const GUA_NAME_MAP: Record<number, string> = {
  0: '坤',
  1: '震',
  2: '坎',
  3: '兑',
  4: '艮',
  5: '离',
  6: '巽',
  7: '乾',
};

const OLD_TO_NEW_GUA_MAP: Record<number, number> = {
  0: 0,
  1: 7,
  2: 3,
  3: 5,
  4: 1,
  5: 6,
  6: 2,
  7: 4,
};

const MOVING_LINE_INDEX_MAP: Record<1 | 2 | 3 | 4 | 5 | 6, number> = {
  1: 3,
  2: 4,
  3: 5,
  4: 0,
  5: 1,
  6: 2,
};

type PlumDataRecord = {
  name: string;
  words: string;
  white_words: string;
  stock_suggestion: string;
  yaoci: string;
  picture: string;
  white_picture: string;
};

const plumDataMap = meihuaData as Record<string, PlumDataRecord>;

function normalizePriceValue(priceValue: string): string {
  const trimmed = priceValue.trim();

  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) {
    throw new Error(`无效的梅花开盘价格式：${priceValue}`);
  }

  const [integerPart, decimalPart = ''] = trimmed.split('.');
  const normalizedIntegerPart = String(Number(integerPart));
  const normalizedDecimalPart = decimalPart.padEnd(2, '0').slice(0, 2);

  return `${normalizedIntegerPart}.${normalizedDecimalPart}`;
}

function baseGuaToYao(gua: number, yaoLength = 3): number[] {
  const result: number[] = [];
  let current = gua;

  while (current >= 1) {
    result.push(current % 2 === 0 ? 0 : 1);
    current = Math.floor(current / 2);
  }

  while (result.length < yaoLength) {
    result.push(0);
  }

  return result;
}

function baseYaoToGua(yaoArray: number[]): number {
  const resultArray = [...yaoArray];

  while (resultArray.length > 0 && resultArray[resultArray.length - 1] === 0) {
    resultArray.pop();
  }

  return resultArray.reduce((sum, yao, index) => {
    if (yao === 0) {
      return sum;
    }

    return sum + 2 ** index;
  }, 0);
}

function toMappedGua(inputNumber: number): number {
  return OLD_TO_NEW_GUA_MAP[inputNumber % 8] ?? 0;
}

function toMovingLine(upperNumber: number, lowerNumber: number): 1 | 2 | 3 | 4 | 5 | 6 {
  const value = (upperNumber + lowerNumber) % 6;

  return (value === 0 ? 6 : value) as 1 | 2 | 3 | 4 | 5 | 6;
}

function toStage(code: string): PlumStage {
  const data = plumDataMap[code];

  if (!data) {
    throw new Error(`缺少梅花卦象数据：${code}`);
  }

  return {
    code,
    name: data.name,
    words: data.words,
    whiteWords: data.white_words,
    picture: data.picture,
    whitePicture: data.white_picture,
    stockSuggestion: data.stock_suggestion,
    yaoci: data.yaoci,
  };
}

function toStageCode(upperGua: number, lowerGua: number): string {
  return `${GUA_NAME_MAP[upperGua]}${GUA_NAME_MAP[lowerGua]}`;
}

export function generatePlumAnalysisFromOpenPrice(
  rawPriceValue: string,
): PlumReadyResult {
  const priceValue = normalizePriceValue(rawPriceValue);
  const [integerPart, decimalPart] = priceValue.split('.');
  const upperNumber = Number(integerPart);
  const lowerNumber = Number(decimalPart);
  const upperGua = toMappedGua(upperNumber);
  const lowerGua = toMappedGua(lowerNumber);
  const movingLine = toMovingLine(upperNumber, lowerNumber);
  const yaoList = [
    ...baseGuaToYao(upperGua),
    ...baseGuaToYao(lowerGua),
  ];

  const original = toStage(toStageCode(upperGua, lowerGua));

  const mutualLowerYao = [yaoList[1], yaoList[2], yaoList[3]];
  const mutualUpperYao = [yaoList[2], yaoList[3], yaoList[4]];
  const mutualUpperGua = baseYaoToGua(mutualUpperYao);
  const mutualLowerGua = baseYaoToGua(mutualLowerYao);
  const mutual = toStage(toStageCode(mutualUpperGua, mutualLowerGua));

  const changedYaoList = [...yaoList];
  const changedIndex = MOVING_LINE_INDEX_MAP[movingLine];
  changedYaoList[changedIndex] = changedYaoList[changedIndex] === 1 ? 0 : 1;
  const changedUpperGua = baseYaoToGua(changedYaoList.slice(0, 3));
  const changedLowerGua = baseYaoToGua(changedYaoList.slice(3, 6));
  const changed = toStage(toStageCode(changedUpperGua, changedLowerGua));

  return {
    status: 'ready',
    priceBasis: 'open',
    priceValue,
    upperNumber,
    lowerNumber,
    movingLine,
    upperTrigram: GUA_NAME_MAP[upperGua],
    lowerTrigram: GUA_NAME_MAP[lowerGua],
    original,
    mutual,
    changed,
  };
}

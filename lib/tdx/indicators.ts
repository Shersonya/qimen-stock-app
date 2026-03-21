function rollingWindowStart(index: number, period: number) {
  return Math.max(0, index - period + 1);
}

export function MA(data: number[], period: number): number[] {
  if (period <= 0) {
    return data.map(() => 0);
  }

  const result: number[] = [];
  let rollingSum = 0;

  for (let index = 0; index < data.length; index += 1) {
    rollingSum += data[index] ?? 0;

    if (index >= period) {
      rollingSum -= data[index - period] ?? 0;
    }

    const windowSize = Math.min(index + 1, period);

    result.push(windowSize > 0 ? rollingSum / windowSize : 0);
  }

  return result;
}

export function REF(data: number[], n: number): number[] {
  return data.map((_, index) => {
    const target = index - n;

    return target >= 0 ? data[target] ?? 0 : 0;
  });
}

export function LLV(data: number[], period: number): number[] {
  return data.map((_, index) => {
    const start = rollingWindowStart(index, period);
    const values = data.slice(start, index + 1);

    return values.length > 0 ? Math.min(...values) : 0;
  });
}

export function HHV(data: number[], period: number): number[] {
  return data.map((_, index) => {
    const start = rollingWindowStart(index, period);
    const values = data.slice(start, index + 1);

    return values.length > 0 ? Math.max(...values) : 0;
  });
}

export function COUNT(condition: boolean[], period: number): number[] {
  return condition.map((_, index) => {
    const start = rollingWindowStart(index, period);
    let count = 0;

    for (let cursor = start; cursor <= index; cursor += 1) {
      if (condition[cursor]) {
        count += 1;
      }
    }

    return count;
  });
}

export function BARSLAST(condition: boolean[]): number[] {
  const result: number[] = [];
  let lastTrueIndex = -1;

  for (let index = 0; index < condition.length; index += 1) {
    if (condition[index]) {
      lastTrueIndex = index;
      result.push(0);
      continue;
    }

    result.push(lastTrueIndex === -1 ? index + 1 : index - lastTrueIndex);
  }

  return result;
}

export function ATAN(data: number[]): number[] {
  return data.map((value) => Math.atan(value));
}

export function MOD(a: number[], b: number[]): number[] {
  return a.map((value, index) => {
    const divisor = b[index] ?? 0;

    return divisor === 0 ? 0 : value % divisor;
  });
}

export function IF_FUNC(
  cond: boolean[],
  trueVal: number[],
  falseVal: number[],
): number[] {
  return cond.map((value, index) => (value ? trueVal[index] ?? 0 : falseVal[index] ?? 0));
}

export function NOT(cond: boolean[]): boolean[] {
  return cond.map((value) => !value);
}

export function MAX(a: number[], b: number[]): number[] {
  return a.map((value, index) => Math.max(value, b[index] ?? 0));
}

export function MIN(a: number[], b: number[]): number[] {
  return a.map((value, index) => Math.min(value, b[index] ?? 0));
}

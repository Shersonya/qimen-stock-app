const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';

function toUtcDateParts(value: string) {
  const normalized = value.trim();

  if (/^\d{8}$/.test(normalized)) {
    return {
      year: Number(normalized.slice(0, 4)),
      month: Number(normalized.slice(4, 6)),
      day: Number(normalized.slice(6, 8)),
    };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return {
      year: Number(normalized.slice(0, 4)),
      month: Number(normalized.slice(5, 7)),
      day: Number(normalized.slice(8, 10)),
    };
  }

  return null;
}

export function getShanghaiDateString(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: SHANGHAI_TIME_ZONE,
  }).format(date);
}

export function normalizeDateString(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  const parts = toUtcDateParts(value);

  if (!parts) {
    return null;
  }

  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function toCompactDateString(value: string | undefined | null) {
  const normalized = normalizeDateString(value);

  return normalized ? normalized.replaceAll('-', '') : null;
}

export function shiftDateString(value: string, deltaDays: number) {
  const normalized = normalizeDateString(value);

  if (!normalized) {
    return value;
  }

  const [year, month, day] = normalized.split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day));
  nextDate.setUTCDate(nextDate.getUTCDate() + deltaDays);

  return nextDate.toISOString().slice(0, 10);
}

export function getDateRangeLength(value: {
  beg?: string;
  end?: string;
}) {
  const begin = normalizeDateString(value.beg);
  const end = normalizeDateString(value.end);

  if (!begin || !end) {
    return null;
  }

  const [beginYear, beginMonth, beginDay] = begin.split('-').map(Number);
  const [endYear, endMonth, endDay] = end.split('-').map(Number);
  const beginDate = Date.UTC(beginYear, beginMonth - 1, beginDay);
  const endDate = Date.UTC(endYear, endMonth - 1, endDay);
  const diff = Math.floor((endDate - beginDate) / (24 * 60 * 60 * 1000));

  return diff >= 0 ? diff : null;
}

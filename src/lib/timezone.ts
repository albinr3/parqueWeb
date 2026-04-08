export const DEFAULT_TIMEZONE = 'America/Santo_Domingo';

type DateParts = { year: number; month: number; day: number };

function parseDateOnly(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { year, month, day };
}

function parseDateTimeWithoutZone(value: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
} | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(
      value
    );
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] ? Number(match[6]) : 0;
  const millisecond = match[7] ? Number(match[7].padEnd(3, '0')) : 0;

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second) ||
    !Number.isInteger(millisecond)
  ) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  if (second < 0 || second > 59) return null;
  if (millisecond < 0 || millisecond > 999) return null;

  return { year, month, day, hour, minute, second, millisecond };
}

function hasExplicitTimeZone(value: string): boolean {
  return /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(value);
}

function getDatePartsInTimeZone(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return { year, month, day };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  const second = Number(parts.find((part) => part.type === 'second')?.value);

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timeZone: string
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  const adjusted = new Date(utcGuess.getTime() - offset);
  const adjustedOffset = getTimeZoneOffsetMs(adjusted, timeZone);

  if (offset !== adjustedOffset) {
    return new Date(utcGuess.getTime() - adjustedOffset);
  }

  return adjusted;
}

function addOneDay(year: number, month: number, day: number): DateParts {
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

export function getDayBoundsUtc(
  dateStr: string | null,
  timeZone: string = DEFAULT_TIMEZONE
): { startOfDay: Date; endOfDay: Date; date: string } {
  const parsedDate = dateStr ? parseDateOnly(dateStr.trim()) : null;
  const base = parsedDate ?? getDatePartsInTimeZone(new Date(), timeZone);
  const next = addOneDay(base.year, base.month, base.day);

  const startOfDay = zonedDateTimeToUtc(base.year, base.month, base.day, 0, 0, 0, 0, timeZone);
  const nextStartOfDay = zonedDateTimeToUtc(next.year, next.month, next.day, 0, 0, 0, 0, timeZone);
  const endOfDay = new Date(nextStartOfDay.getTime() - 1);

  const date = `${String(base.year).padStart(4, '0')}-${String(base.month).padStart(2, '0')}-${String(base.day).padStart(2, '0')}`;

  return { startOfDay, endOfDay, date };
}

export function parseDateParamInTimeZone(
  value: string,
  {
    timeZone = DEFAULT_TIMEZONE,
    endOfDayForDateOnly = false,
  }: { timeZone?: string; endOfDayForDateOnly?: boolean } = {}
): Date | null {
  const raw = value.trim();
  if (!raw) return null;

  const dateOnly = parseDateOnly(raw);
  if (dateOnly) {
    if (!endOfDayForDateOnly) {
      return zonedDateTimeToUtc(dateOnly.year, dateOnly.month, dateOnly.day, 0, 0, 0, 0, timeZone);
    }

    const next = addOneDay(dateOnly.year, dateOnly.month, dateOnly.day);
    const nextStart = zonedDateTimeToUtc(next.year, next.month, next.day, 0, 0, 0, 0, timeZone);
    return new Date(nextStart.getTime() - 1);
  }

  if (hasExplicitTimeZone(raw)) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const dateTimeNoZone = parseDateTimeWithoutZone(raw);
  if (dateTimeNoZone) {
    return zonedDateTimeToUtc(
      dateTimeNoZone.year,
      dateTimeNoZone.month,
      dateTimeNoZone.day,
      dateTimeNoZone.hour,
      dateTimeNoZone.minute,
      dateTimeNoZone.second,
      dateTimeNoZone.millisecond,
      timeZone
    );
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

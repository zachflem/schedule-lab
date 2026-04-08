import { RecurrenceWeekdayEnum } from '../../src/shared/validation/schemas';

export interface CycleWindow {
  start: Date;
  end: Date;
}

export const MAX_CYCLES = 12;

export const WEEKDAY_MAP: Record<string, number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0,
};

export function addToDate(date: Date, value: number, unit: string): Date {
  const d = new Date(date);
  switch (unit) {
    case 'hours':   d.setHours(d.getHours() + value); break;
    case 'days':    d.setDate(d.getDate() + value); break;
    case 'weeks':   d.setDate(d.getDate() + value * 7); break;
    case 'months':  d.setMonth(d.getMonth() + value); break;
  }
  return d;
}

/** Returns a full ISO datetime string by combining a YYYY-MM-DD date with a HH:MM time. */
export function combineDateTime(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}:00.000Z`;
}

/** Returns YYYY-MM-DD from a Date object. */
export function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function generateIntervalCycles(
  startDate: Date,
  intervalValue: number,
  intervalUnit: string,
  downtimeValue: number,
  downtimeUnit: string,
  endLimit: Date | null,
): CycleWindow[] {
  const cycles: CycleWindow[] = [];
  let cursor = new Date(startDate);

  while (cycles.length < MAX_CYCLES) {
    const cycleStart = new Date(cursor);
    const cycleEnd = addToDate(cursor, intervalValue, intervalUnit);

    if (endLimit && cycleStart >= endLimit) break;

    cycles.push({ start: cycleStart, end: cycleEnd });
    cursor = addToDate(cycleEnd, downtimeValue, downtimeUnit);
  }

  return cycles;
}

export function generateWeekdayCycles(
  startDate: Date,
  weekdays: string[],
  startTime: string,
  endTime: string,
  endLimit: Date | null,
): CycleWindow[] {
  const cycles: CycleWindow[] = [];
  const targetDays = new Set(weekdays.map(d => WEEKDAY_MAP[d]));
  const cursor = new Date(startDate);
  
  // Walk up to 2 years of days to find MAX_CYCLES occurrences
  const absoluteLimit = new Date(startDate);
  absoluteLimit.setFullYear(absoluteLimit.getFullYear() + 2);
  const limit = endLimit && endLimit < absoluteLimit ? endLimit : absoluteLimit;

  while (cycles.length < MAX_CYCLES && cursor < limit) {
    if (targetDays.has(cursor.getDay())) {
      const dateStr = toDateStr(cursor);
      // Build start/end as Date objects for consistency (treating as UTC day)
      const cycleStart = new Date(`${dateStr}T${startTime}:00.000Z`);
      const cycleEnd = new Date(`${dateStr}T${endTime}:00.000Z`);
      cycles.push({ start: cycleStart, end: cycleEnd });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return cycles;
}

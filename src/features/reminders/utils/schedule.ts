import { DayOfWeek, ReminderFrequency } from '../types';

function cloneWithTime(base: Date, hh: number, mm: number) {
  const d = new Date(base);
  d.setHours(hh, mm, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isAfter(a: Date, b: Date) {
  return a.getTime() > b.getTime();
}

export function computeNextReminderAt(opts: {
  now?: Date;
  frequency: ReminderFrequency;
  time: string; // HH:MM
  days_of_week?: DayOfWeek[] | null;
  custom_interval?: number | null;
}): string {
  const now = opts.now ?? new Date();
  const [hh, mm] = opts.time.split(':').map(Number);
  const baseTodayAt = cloneWithTime(now, hh, mm);

  // If time today already passed, start from tomorrow for daily/monthly/custom calculations
  const start = isAfter(now, baseTodayAt) ? addDays(baseTodayAt, 1) : baseTodayAt;

  switch (opts.frequency) {
    case 'daily': {
      return start.toISOString();
    }
    case 'weekly': {
      const days = (opts.days_of_week ?? []).slice().sort((a, b) => a - b);
      if (!days.length) return start.toISOString();

      // check next 7 days
      for (let i = 0; i < 7; i++) {
        const candidate = addDays(baseTodayAt, i + (isAfter(now, baseTodayAt) ? 1 : 0));
        const dow = candidate.getDay() as DayOfWeek;
        if (days.includes(dow)) {
          return candidate.toISOString();
        }
      }
      // fallback next week first selected day
      let diff = (days[0] - baseTodayAt.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      return addDays(baseTodayAt, diff).toISOString();
    }
    case 'monthly': {
      const current = baseTodayAt;
      const candidate = isAfter(now, current)
        ? new Date(current.getFullYear(), current.getMonth() + 1, current.getDate(), current.getHours(), current.getMinutes(), 0, 0)
        : current;
      return candidate.toISOString();
    }
    case 'custom': {
      const interval = Math.max(1, Number(opts.custom_interval || 1));
      const candidate = addDays(start, interval - (isAfter(now, baseTodayAt) ? 0 : 1));
      return candidate.toISOString();
    }
    default:
      return start.toISOString();
  }
}

export function computeSnoozeUntil(minutes: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

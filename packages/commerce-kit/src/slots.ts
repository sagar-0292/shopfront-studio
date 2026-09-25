import type { BookingRules, Slot } from './types';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export function label12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Today's date in India as YYYY-MM-DD. */
export function todayIST(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function dayLabel(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(d),
    day: d.getUTCDate(),
    month: new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' }).format(d),
    long: new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(d),
  };
}

/** All slots for a date from opening hours, minus blocked dates, full slots and past times. */
export function slotsFor(rules: BookingRules, date: string, durationMin: number, now = new Date()): Slot[] {
  if (rules.blocked_dates?.includes(date)) return [];
  const dow = DAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  const ranges = rules.hours[dow] ?? [];
  const today = todayIST(now);
  const nowMin = date === today
    ? toMin(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(now))
    : -1;
  if (date < today) return [];
  const out: Slot[] = [];
  for (const [open, close] of ranges) {
    for (let m = toMin(open); m + durationMin <= toMin(close); m += rules.slot_minutes) {
      const time = toHHMM(m);
      const taken = rules.booked?.[date]?.[time] ?? 0;
      const left = Math.max(0, rules.capacity - taken);
      out.push({ time, label: label12(time), available: left > 0 && m > nowMin + 30, left });
    }
  }
  return out;
}

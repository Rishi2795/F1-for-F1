import type { RaceIndexEntry, WeekendSession } from "../types/api";

/** The moment a race starts: the "Race" session if the timetable has one, else null (we only know the day). */
export function raceStart(r: RaceIndexEntry): Date | null {
  const s = r.sessions?.find((x) => x.name === "Race");
  return s ? new Date(s.starts) : null;
}

/** The first round still to be run. */
export function nextRound(races: RaceIndexEntry[]): RaceIndexEntry | null {
  return [...races].sort((a, b) => a.round - b.round).find((r) => r.data_status === "scheduled") ?? null;
}

export type Countdown = { days: number; hours: number; minutes: number; over: boolean };
export function countdown(ms: number): Countdown {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, over: true };
  const minutes = Math.floor(ms / 60_000);
  return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60, over: false };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** Rounds grouped by month of the race, in calendar order. */
export function groupByMonth(races: RaceIndexEntry[]): { key: string; label: string; races: RaceIndexEntry[] }[] {
  const out = new Map<string, { key: string; label: string; races: RaceIndexEntry[] }>();
  for (const r of [...races].sort((a, b) => a.date.localeCompare(b.date) || a.round - b.round)) {
    const key = r.date.slice(0, 7);
    if (!out.has(key)) out.set(key, { key, label: `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`, races: [] });
    out.get(key)!.races.push(r);
  }
  return [...out.values()];
}

/** "27–29 Nov" for a weekend whose timetable we know, else just the race day, e.g. "29 Nov". */
export function weekendRange(r: RaceIndexEntry): string {
  const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const first = r.sessions?.[0]?.starts.slice(0, 10);
  if (!first || first === r.date) return fmt(day(r.date));
  const a = day(first);
  const b = day(r.date);
  return a.getUTCMonth() === b.getUTCMonth() ? `${a.getUTCDate()}–${fmt(b)}` : `${fmt(a)} – ${fmt(b)}`;
}

/** A session time in the viewer's own time zone, e.g. "Sat 28 Nov, 18:00 GMT". */
export function sessionTime(s: WeekendSession, timeZone?: string): string {
  return new Date(s.starts).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZoneName: "short", timeZone });
}

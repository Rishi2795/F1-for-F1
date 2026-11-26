import type { LapDriver } from "../types/api";

export type CarState =
  | { state: "grid" }
  | { state: "racing"; lap: number; frac: number }
  | { state: "finished"; lap: number }
  | { state: "out"; lap: number };

/** Where a car is in the race at `t` race-seconds: which lap, and how far round it. Pure timing, no guessing about speed. */
export function carAt(d: LapDriver, t: number, totalLaps: number): CarState {
  const ends = d.end ?? [];
  const first = ends[0] ?? null;
  const firstTime = d.lap_times[0] ?? null;
  const start1 = first !== null && firstTime !== null ? Math.max(0, first - firstTime) : 0;
  if (t < start1) return { state: "grid" };
  let prev = start1;
  let lastLap = 0;
  for (let i = 0; i < ends.length; i++) {
    const end = ends[i];
    if (end === null) continue;
    if (t < end) return { state: "racing", lap: i + 1, frac: Math.min(1, Math.max(0, (t - prev) / Math.max(end - prev, 1e-6))) };
    prev = end;
    lastLap = i + 1;
  }
  return lastLap >= totalLaps ? { state: "finished", lap: lastLap } : { state: "out", lap: lastLap };
}

/** A point a fraction of the way round a closed loop of points. */
export function pointAt(points: number[][], frac: number): [number, number] {
  const n = points.length;
  const f = ((frac % 1) + 1) % 1;
  const i = Math.floor(f * n);
  const j = (i + 1) % n;
  const k = f * n - i;
  return [points[i][0] + (points[j][0] - points[i][0]) * k, points[i][1] + (points[j][1] - points[i][1]) * k];
}

/** When the race ends: the last time any car completed a lap. */
export function raceLength(drivers: LapDriver[]): number {
  return Math.max(0, ...drivers.flatMap((d) => (d.end ?? []).filter((e): e is number => e !== null)));
}

/** Race distance covered, in laps and fractions of a lap, for ordering cars on the road. */
export function distanceAt(c: CarState): number {
  return c.state === "grid" ? 0 : c.state === "racing" ? c.lap - 1 + c.frac : c.lap;
}

/** The lap the leader is on at time t (1-based), for the clock. */
export function leaderLap(drivers: LapDriver[], t: number, totalLaps: number): number {
  let best = 0;
  for (const d of drivers) {
    const c = carAt(d, t, totalLaps);
    if (c.state === "racing") best = Math.max(best, c.lap);
    else if (c.state === "finished") best = Math.max(best, c.lap);
  }
  return Math.max(1, best);
}

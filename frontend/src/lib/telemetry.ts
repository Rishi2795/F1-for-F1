import type { TelemetryDriver } from "../types/api";

export type Channel = "speed" | "throttle" | "brake" | "rpm" | "gear";
export type Reading = { speed: number; throttle: number; brake: boolean; gear: number; rpm: number; drs: boolean; ms: number };

/** Linear blend of entry i and the next one, wrapping at the line. */
function blend(list: number[], i: number, k: number): number {
  return list[i] + (list[(i + 1) % list.length] - list[i]) * k;
}

/** The car's readings a fraction `frac` (0 to 1) of the way round its lap. Speed, throttle and RPM are blended between
 *  the two nearest points; gear, brake and DRS take the nearer one, since they step. */
export function readingAt(d: TelemetryDriver, frac: number): Reading {
  const n = d.speed.length;
  const f = ((frac % 1) + 1) % 1;
  const i = Math.floor(f * n) % n;
  const k = f * n - Math.floor(f * n);
  const near = k < 0.5 ? i : (i + 1) % n;
  const end = d.time_s * 1000;
  const next = i + 1 < n ? d.t_ms[i + 1] : end;
  return {
    speed: blend(d.speed, i, k),
    throttle: blend(d.throttle, i, k),
    rpm: blend(d.rpm, i, k),
    brake: d.brake[near] === 1,
    gear: d.gear[near],
    drs: d.drs[near] === 1,
    ms: d.t_ms[i] + (next - d.t_ms[i]) * k,
  };
}

/** How far round the lap (0 to 1) the car is `ms` milliseconds after the line. */
export function fractionAtMs(d: TelemetryDriver, ms: number): number {
  const n = d.t_ms.length;
  const end = d.time_s * 1000;
  if (ms <= 0) return 0;
  if (ms >= end) return 1;
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (d.t_ms[mid] <= ms) lo = mid;
    else hi = mid - 1;
  }
  const next = lo + 1 < n ? d.t_ms[lo + 1] : end;
  const span = Math.max(next - d.t_ms[lo], 1e-6);
  return (lo + (ms - d.t_ms[lo]) / span) / n;
}

/** 0, 1 or 2: the sector a lap fraction falls in. */
export function sectorAt(frac: number, sectors: number[] | null): number {
  if (!sectors) return 0;
  return frac < sectors[0] ? 0 : frac < sectors[1] ? 1 : 2;
}

/** Time of the lap so far in the form 1:32.401 (or 0:03.040). */
export function lapClock(ms: number): string {
  const total = Math.max(0, ms) / 1000;
  const m = Math.floor(total / 60);
  return `${m}:${(total - m * 60).toFixed(3).padStart(6, "0")}`;
}

/** Seconds between two points of a lap: how long the car took from the line to `frac`, from the raw point times. */
export function sectorTimes(d: TelemetryDriver, sectors: number[] | null): (number | null)[] {
  if (!sectors) return [null, null, null];
  const at = (f: number) => readingAt(d, f).ms / 1000;
  const [a, b] = [at(sectors[0]), at(sectors[1])];
  return [a, b - a, d.time_s - b];
}

/** Gap in seconds at a point: positive when `a` has taken longer than `b` to get there. */
export function deltaAt(a: TelemetryDriver, b: TelemetryDriver, frac: number): number {
  return (readingAt(a, frac).ms - readingAt(b, frac).ms) / 1000;
}

const RAMP = [[59, 130, 246], [34, 197, 94], [250, 204, 21], [239, 68, 68]] as const;

/** Slow is blue, fast is red, with green and yellow between, for a value scaled 0 to 1. */
export function heat(t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (RAMP.length - 1);
  const i = Math.min(Math.floor(x), RAMP.length - 2);
  const k = x - i;
  const c = RAMP[i].map((v, j) => Math.round(v + (RAMP[i + 1][j] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** The colour of the track at each of its points for a channel. */
export function trackColours(d: TelemetryDriver, channel: Channel | "sector", sectors: number[] | null): string[] {
  const n = d.speed.length;
  if (channel === "sector") return Array.from({ length: n }, (_, i) => ["#ef4444", "#facc15", "#34d399"][sectorAt(i / n, sectors)]);
  if (channel === "brake") return d.brake.map((b) => (b ? "#ef4444" : "#3f3f46"));
  const values = channel === "gear" ? d.gear : d[channel];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return values.map((v) => heat((v - lo) / Math.max(hi - lo, 1)));
}

/** The point on a closed outline nearest to (x, y), as a fraction of the way round. */
export function nearestFraction(outline: number[][], x: number, y: number): { frac: number; dist: number } {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < outline.length; i++) {
    const d = (outline[i][0] - x) ** 2 + (outline[i][1] - y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return { frac: best / outline.length, dist: Math.sqrt(bestDist) };
}

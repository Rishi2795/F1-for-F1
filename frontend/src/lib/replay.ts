import type { ReplayDriver } from "../types/api";

export type Live = { frac: number; speed: number | null; throttle: number | null; brake: boolean | null; gear: number | null; rpm: number | null; drs: boolean | null };

const UNITS = 10_000;

/** Linear blend of two samples that may be missing: missing if either end is. */
function lerp(list: (number | null)[], i: number, k: number): number | null {
  const a = list[i];
  const b = list[i + 1];
  if (a === null || a === undefined) return null;
  if (k === 0) return a;
  return b === null || b === undefined ? null : a + (b - a) * k;
}

/** The car at `raceSeconds` on the lap-timing clock: how far round the lap it was and what its sensors read.
 *  Returns null where the source has a hole, so the caller can fall back or show nothing, never an invented value. */
export function liveAt(d: ReplayDriver, raceSeconds: number, offset: number): Live | null {
  const t = raceSeconds + offset;
  const i = Math.floor(t);
  if (i < 0 || i >= d.f.length - 1) return null;
  const k = t - i;
  const a = d.f[i];
  const b = d.f[i + 1];
  if (a === null || b === null) return null;
  const step = ((((b - a) / UNITS + 0.5) % 1) + 1) % 1 - 0.5; // the short way round the line
  const frac = ((((a / UNITS + step * k) % 1) + 1) % 1);
  const near = k < 0.5 ? i : i + 1;
  const brake = d.brake[near];
  const drs = d.drs[near];
  return {
    frac,
    speed: lerp(d.speed, i, k),
    throttle: lerp(d.throttle, i, k),
    rpm: lerp(d.rpm, i, k),
    gear: d.gear[near] ?? null,
    brake: brake === null || brake === undefined ? null : brake === 1,
    drs: drs === null || drs === undefined ? null : drs === 1,
  };
}

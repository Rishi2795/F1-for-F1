import type { DriverRace, LapDoc, LapDriver } from "../types/api";

/** Laps a driver was in the pit lane or on an out-lap: the end of each stint but the last, and the lap after. */
export function pitLaps(driver: DriverRace | undefined): Set<number> {
  const out = new Set<number>();
  for (const s of (driver?.stints ?? []).slice(0, -1)) {
    out.add(s.lap_end);
    out.add(s.lap_end + 1);
  }
  return out;
}

/** Laps that say something about pace: green flag, not lap 1, not a pit lap, within 107% of the driver's median. */
export function cleanLaps(d: LapDriver, status: string[], pits: Set<number>): { lap: number; time: number }[] {
  const raw = d.lap_times
    .map((time, i) => ({ lap: i + 1, time }))
    .filter((l): l is { lap: number; time: number } => l.time !== null && l.lap > 1 && status[l.lap - 1] === "G" && !pits.has(l.lap));
  if (raw.length < 5) return [];
  const median = quantile(raw.map((l) => l.time), 0.5);
  return raw.filter((l) => l.time <= median * 1.07);
}

export function quantile(values: number[], q: number): number {
  const v = [...values].sort((a, b) => a - b);
  if (v.length === 0) return NaN;
  const pos = (v.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return v[lo] + (v[hi] - v[lo]) * (pos - lo);
}

export type Box = { code: string; min: number; q1: number; median: number; q3: number; max: number; n: number };

/** Pace distribution per driver, quickest median first. */
export function paceBoxes(doc: LapDoc, drivers: DriverRace[]): Box[] {
  const boxes: Box[] = [];
  for (const d of doc.drivers) {
    const laps = cleanLaps(d, doc.status, pitLaps(drivers.find((x) => x.driver_code === d.code)));
    if (laps.length < 8) continue;
    const t = laps.map((l) => l.time);
    boxes.push({ code: d.code, min: Math.min(...t), q1: quantile(t, 0.25), median: quantile(t, 0.5), q3: quantile(t, 0.75), max: Math.max(...t), n: t.length });
  }
  return boxes.sort((a, b) => a.median - b.median);
}

/** The field's median clean lap time on each green lap: how the track and the fuel load change the pace. */
export function fieldEvolution(doc: LapDoc, drivers: DriverRace[]): { lap: number; time: number }[] {
  const byLap = new Map<number, number[]>();
  for (const d of doc.drivers) {
    for (const l of cleanLaps(d, doc.status, pitLaps(drivers.find((x) => x.driver_code === d.code)))) {
      byLap.set(l.lap, [...(byLap.get(l.lap) ?? []), l.time]);
    }
  }
  return [...byLap.entries()].filter(([, v]) => v.length >= 4).map(([lap, v]) => ({ lap, time: quantile(v, 0.5) })).sort((a, b) => a.lap - b.lap);
}

/** Lap-by-lap difference between two drivers (a minus b): negative means a was quicker. Only laps both ran cleanly. */
export function lapDeltas(doc: LapDoc, drivers: DriverRace[], a: string, b: string): { lap: number; delta: number }[] {
  const lapsOf = (code: string) => {
    const d = doc.drivers.find((x) => x.code === code);
    return d ? new Map(cleanLaps(d, doc.status, pitLaps(drivers.find((x) => x.driver_code === code))).map((l) => [l.lap, l.time])) : new Map<number, number>();
  };
  const A = lapsOf(a);
  const B = lapsOf(b);
  return [...A.entries()].filter(([lap]) => B.has(lap)).map(([lap, t]) => ({ lap, delta: t - (B.get(lap) as number) })).sort((x, y) => x.lap - y.lap);
}

/** Who is where after lap `lap`: positions come from the race file, gaps from the lap file. */
export function orderAt(doc: LapDoc, drivers: DriverRace[], lap: number) {
  return drivers
    .map((d) => {
      const pos = d.lap_positions?.[lap - 1] ?? null;
      const gap = doc.drivers.find((x) => x.code === d.driver_code)?.gap[lap - 1] ?? null;
      const stint = (d.stints ?? []).find((s) => lap >= s.lap_start && lap <= s.lap_end);
      return { code: d.driver_code, name: d.driver_name, color: d.team_color, pos, gap, compound: stint?.compound ?? null, age: stint ? lap - stint.lap_start + 1 : null, pitting: pitLaps(d).has(lap) };
    })
    .filter((r) => r.pos !== null)
    .sort((a, b) => (a.pos as number) - (b.pos as number));
}

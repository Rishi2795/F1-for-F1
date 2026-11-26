import type { DriverRace, IncidentDoc, LapDoc } from "../types/api";

export type EventKind = "pit" | "pass" | "out" | "incident" | "classification";
export type RaceEvent = { t: number; lap: number | null; kind: EventKind; drivers: string[]; text: string; detail?: string };

const COMPOUND = (c: string | null | undefined) => (c ? c.charAt(0) + c.slice(1).toLowerCase() : null);

/** Race seconds when a car completed lap `lap` (1-based), or null. */
function endOf(doc: LapDoc, code: string, lap: number): number | null {
  return doc.drivers.find((d) => d.code === code)?.end?.[lap - 1] ?? null;
}

/** When each car was in the pit lane: the stop is centred on the line crossing of its in-lap, for as long as the official
 *  pit-lane time says. */
export function pitWindows(doc: LapDoc, d: DriverRace): { from: number; to: number; lap: number }[] {
  const out: { from: number; to: number; lap: number }[] = [];
  for (const s of d.pit_stops ?? []) {
    if (s.lap === null || s.duration_s === null) continue;
    const at = endOf(doc, d.driver_code, s.lap);
    if (at !== null) out.push({ from: at - s.duration_s / 2, to: at + s.duration_s / 2, lap: s.lap });
  }
  return out;
}

/** The lap a retired car stopped on and the race second it happened, or null for cars that did not retire. */
export function retirement(doc: LapDoc, d: DriverRace): { lap: number; t: number } | null {
  if (d.status !== "Retired" || d.laps_completed === null) return null;
  const done = d.laps_completed;
  const t = done > 0 ? endOf(doc, d.driver_code, done) : 0;
  return t === null ? null : { lap: done + 1, t };
}

/** The race-control messages that explain a retirement: about this car, shortly before or after it stopped. */
export function causeOf(code: string, t: number, incidents: IncidentDoc | null): string | null {
  const near = (incidents?.items ?? []).filter((i) => i.t !== null && i.drivers.includes(code) && (i.kind === "collision" || i.kind === "stopped") && i.t >= t - 90 && i.t <= t + 150);
  if (!near.length) return null;
  near.sort((a, b) => Math.abs((a.t as number) - t) - Math.abs((b.t as number) - t));
  return near[0].text;
}

/** On-track passes by lap: A was behind B at the end of one lap and ahead at the end of the next, and neither pitted in
 *  between or retired. This is lap by lap, so a pass is placed at the line, not at the corner it happened. */
export function passes(doc: LapDoc, drivers: DriverRace[]): RaceEvent[] {
  const pos = new Map(drivers.filter((d) => d.lap_positions?.length).map((d) => [d.driver_code, d.lap_positions as (number | null)[]]));
  const pitLaps = new Map(drivers.map((d) => [d.driver_code, new Set((d.stints ?? []).slice(0, -1).map((s) => s.lap_end))]));
  const retiredAfter = new Map(drivers.map((d) => [d.driver_code, d.status === "Retired" ? d.laps_completed : null]));
  const codes = [...pos.keys()];
  const laps = Math.max(0, ...[...pos.values()].map((p) => p.length));
  const out: RaceEvent[] = [];
  for (let t = 1; t < laps; t++) {
    for (let i = 0; i < codes.length; i++) {
      for (let j = i + 1; j < codes.length; j++) {
        const [a, b] = [codes[i], codes[j]];
        const [pa, pb] = [pos.get(a) as (number | null)[], pos.get(b) as (number | null)[]];
        const [a0, b0, a1, b1] = [pa[t - 1], pb[t - 1], pa[t], pb[t]];
        if (a0 == null || b0 == null || a1 == null || b1 == null) continue;
        const pits = (c: string) => pitLaps.get(c)?.has(t) || pitLaps.get(c)?.has(t + 1);
        const gone = (c: string) => retiredAfter.get(c) != null && (retiredAfter.get(c) as number) <= t + 1;
        if (pits(a) || pits(b) || gone(a) || gone(b)) continue;
        if ((a0 - b0) * (a1 - b1) >= 0) continue;
        const [winner, loser, place] = a1 < b1 ? [a, b, a1] : [b, a, b1];
        const at = endOf(doc, winner, t + 1) ?? endOf(doc, loser, t + 1);
        if (at !== null) out.push({ t: at, lap: t + 1, kind: "pass", drivers: [winner, loser], text: `${winner} passes ${loser} for P${place}` });
      }
    }
  }
  return out;
}

/** Everything worth jumping to in a race, in time order. */
export function buildEvents(doc: LapDoc, drivers: DriverRace[], incidents: IncidentDoc | null): RaceEvent[] {
  const events: RaceEvent[] = [...passes(doc, drivers)];
  for (const d of drivers) {
    (d.pit_stops ?? []).forEach((s, i) => {
      if (s.lap === null) return;
      const t = endOf(doc, d.driver_code, s.lap);
      if (t === null) return;
      const to = COMPOUND((d.stints ?? [])[i + 1]?.compound);
      events.push({ t, lap: s.lap, kind: "pit", drivers: [d.driver_code], text: `${d.driver_code} pits${to ? ` for ${to.toLowerCase()}s` : ""}`, detail: s.duration_s !== null ? `${s.duration_s.toFixed(1)} s in the pit lane` : undefined });
    });
    const r = retirement(doc, d);
    if (r) {
      const cause = causeOf(d.driver_code, r.t, incidents);
      events.push({ t: r.t, lap: r.lap, kind: "out", drivers: [d.driver_code], text: `${d.driver_code} out on lap ${r.lap}`, detail: cause ?? "Retired (the cause was not published)" });
    }
  }
  for (const i of incidents?.items ?? []) {
    if (i.t === null || i.kind === "stopped") continue; // a stopped car is already shown as an "out"
    events.push({ t: i.t, lap: i.lap, kind: "incident", drivers: i.drivers, text: i.text });
  }
  // A time penalty after the flag: where the car crossed the line is not where it is classified.
  const end = Math.max(0, ...doc.drivers.flatMap((x) => (x.end ?? []).filter((e): e is number => e !== null)));
  const finishers = drivers.filter((d) => (d.status === "Finished") && d.finish !== null && d.lap_positions?.length);
  for (const d of finishers) {
    const crossed = (d.lap_positions as (number | null)[]).at(-1);
    if (crossed != null && d.finish !== null && crossed !== d.finish && Math.abs(crossed - d.finish) >= 2) {
      events.push({ t: end, lap: doc.laps, kind: "classification", drivers: [d.driver_code], text: `${d.driver_code} crossed the line P${crossed}, classified P${d.finish}`, detail: "Changed after the race, usually a time penalty" });
    }
  }
  return events.sort((a, b) => a.t - b.t);
}

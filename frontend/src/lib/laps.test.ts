import { describe, expect, it } from "vitest";
import { cleanLaps, lapDeltas, orderAt, paceBoxes, pitLaps, quantile } from "./laps";
import type { DriverRace, LapDoc } from "../types/api";

const car = (code: string, stints: DriverRace["stints"], positions: number[]): DriverRace =>
  ({ driver_code: code, driver_name: code, team_color: "#fff", stints, lap_positions: positions }) as DriverRace;
const stint = (n: number, a: number, b: number, compound = "MEDIUM") =>
  ({ number: n, compound, lap_start: a, lap_end: b, laps: b - a + 1, compound_source: null, tyre_age_start: 0, fresh: true }) as NonNullable<DriverRace["stints"]>[number];

const lapsA = Array.from({ length: 20 }, (_, i) => 90 + (i % 3) * 0.1);
const doc: LapDoc = {
  season: 2024, round: 1, laps: 20, status: Array(20).fill("G").map((s, i) => (i === 9 ? "SC" : s)), incidents: [], undercuts: [],
  drivers: [
    { code: "AAA", lap_times: lapsA, gap: Array(20).fill(0), best_sectors: [], top_speed_kph: 300 },
    { code: "BBB", lap_times: lapsA.map((t) => t + 0.5), gap: Array(20).fill(2.5), best_sectors: [], top_speed_kph: 310 },
  ],
};
const drivers = [car("AAA", [stint(1, 1, 12), stint(2, 13, 20, "HARD")], Array(20).fill(1)), car("BBB", [stint(1, 1, 20)], Array(20).fill(2))];

describe("quantile", () => {
  it("interpolates", () => {
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(quantile([1, 2, 3, 4], 0.25)).toBeCloseTo(1.75);
  });
});

describe("pitLaps / cleanLaps", () => {
  it("marks the in-lap and out-lap of every stop but not the finish", () => {
    expect([...pitLaps(drivers[0])].sort((a, b) => a - b)).toEqual([12, 13]);
    expect(pitLaps(drivers[1]).size).toBe(0);
  });
  it("drops lap 1, safety-car laps, pit laps and slow outliers", () => {
    const clean = cleanLaps(doc.drivers[0], doc.status, pitLaps(drivers[0])).map((l) => l.lap);
    expect(clean).not.toContain(1);
    expect(clean).not.toContain(10); // safety car
    expect(clean).not.toContain(12);
    expect(clean).not.toContain(13);
    const slow = { ...doc.drivers[0], lap_times: lapsA.map((t, i) => (i === 5 ? 150 : t)) };
    expect(cleanLaps(slow, doc.status, new Set()).map((l) => l.lap)).not.toContain(6);
  });
});

describe("paceBoxes and lapDeltas", () => {
  it("orders drivers by median lap and measures the gap between two", () => {
    expect(paceBoxes(doc, drivers).map((b) => b.code)).toEqual(["AAA", "BBB"]);
    const deltas = lapDeltas(doc, drivers, "AAA", "BBB");
    expect(deltas.length).toBeGreaterThan(5);
    expect(deltas.every((d) => Math.abs(d.delta + 0.5) < 1e-9)).toBe(true);
  });
});

describe("orderAt", () => {
  it("gives the running order with tyre and gap at a lap", () => {
    const at15 = orderAt(doc, drivers, 15);
    expect(at15.map((r) => r.code)).toEqual(["AAA", "BBB"]);
    expect(at15[0]).toMatchObject({ compound: "HARD", age: 3, gap: 0 });
    expect(at15[1].gap).toBe(2.5);
    expect(orderAt(doc, drivers, 12)[0].pitting).toBe(true);
  });
});

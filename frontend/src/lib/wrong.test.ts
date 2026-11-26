import { describe, expect, it } from "vitest";
import { whatWentWrong } from "./wrong";
import type { DriverRace, LapDoc } from "../types/api";

const stint = (n: number, a: number, b: number) => ({ number: n, compound: "MEDIUM", lap_start: a, lap_end: b, laps: b - a + 1, compound_source: null, tyre_age_start: 0, fresh: true }) as NonNullable<DriverRace["stints"]>[number];
const times = Array.from({ length: 30 }, () => 90);
times[9] = 118; // pit in-lap, lap 10
times[10] = 108; // out-lap
times[19] = 94.5; // a slow lap on green
const ends = times.reduce<number[]>((acc, t) => [...acc, (acc.at(-1) ?? 0) + t], []);
const gap = ends.map((_, i) => (i < 14 ? 0 : (i - 14) * 2));
const doc: LapDoc = { season: 2024, round: 1, laps: 30, status: Array(30).fill("G"), incidents: [], undercuts: [{ attacker: "AAA", defender: "BBB", attacker_lap: 10, defender_lap: 12, success: false }], drivers: [{ code: "AAA", lap_times: times, gap, best_sectors: [], top_speed_kph: 300, end: ends }] };
const car = { driver_code: "AAA", classified: true, status: "Finished", stints: [stint(1, 1, 10), stint(2, 11, 30)], lap_positions: Array.from({ length: 30 }, (_, i) => (i < 24 ? 2 : 5)) } as unknown as DriverRace;

describe("whatWentWrong", () => {
  const r = whatWentWrong(doc, [car], "AAA");
  it("prices the pit stop and the slow lap against the driver's own pace", () => {
    expect(r?.loss.typical).toBeCloseTo(90);
    expect(r?.loss.pits).toBeCloseTo(28 + 18, 0);
    expect(r?.loss.offLaps).toBe(1);
    expect(r?.moments.find((m) => m.kind === "PIT")?.lap).toBe(10);
    expect(r?.moments.find((m) => m.kind === "OFF_PACE")?.lap).toBe(20);
  });
  it("finds places lost on track and the stretch where the leader pulled away", () => {
    expect(r?.moments.find((m) => m.kind === "POSITIONS")).toMatchObject({ lap: 25, text: "Dropped from P2 to P5 on track" });
    expect(r?.moments.find((m) => m.kind === "GAP")?.text).toMatch(/Lost \d+\.\d+s to the leader between laps/);
    expect(r?.moments.find((m) => m.kind === "UNDERCUT")?.text).toContain("came out behind");
  });
  it("flags a retirement first, and says nothing when there is too little data", () => {
    const out = whatWentWrong(doc, [{ ...car, classified: false, status: "Gearbox" } as DriverRace], "AAA");
    expect(out?.moments[0]).toMatchObject({ kind: "OUT", text: "Out of the race after lap 30: Gearbox" });
    expect(whatWentWrong({ ...doc, drivers: [{ ...doc.drivers[0], lap_times: [90, 91] }] }, [car], "AAA")).toBeNull();
    expect(whatWentWrong(doc, [car], "ZZZ")).toBeNull();
  });
});

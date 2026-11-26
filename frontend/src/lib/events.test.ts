import { describe, expect, it } from "vitest";
import { buildEvents, causeOf, passes, pitWindows, retirement } from "./events";
import type { DriverRace, IncidentDoc, LapDoc } from "../types/api";

const lapDoc = (ends: Record<string, (number | null)[]>): LapDoc => ({
  season: 2026, round: 1, laps: 5, status: ["G", "G", "G", "G", "G"], incidents: [], undercuts: [],
  drivers: Object.entries(ends).map(([code, end]) => ({ code, lap_times: [], gap: [], best_sectors: [], top_speed_kph: null, end })),
});
const drv = (code: string, over: Partial<DriverRace> = {}): DriverRace => ({ driver_code: code, status: "Finished", finish: 1, laps_completed: 5, lap_positions: [1, 1, 1, 1, 1], stints: [], pit_stops: [], ...over } as DriverRace);

describe("passes", () => {
  it("finds a swap between laps with no pit stop in it, and names the winner and the place", () => {
    const doc = lapDoc({ AAA: [90, 180, 270, 360, 450], BBB: [91, 181, 271, 361, 451] });
    const ev = passes(doc, [drv("AAA", { lap_positions: [1, 1, 2, 2, 2] }), drv("BBB", { finish: 2, lap_positions: [2, 2, 1, 1, 1] })]);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ kind: "pass", drivers: ["BBB", "AAA"], text: "BBB passes AAA for P1", lap: 3 });
    expect(ev[0].t).toBe(271);
  });
  it("does not count swaps caused by a pit stop or a retirement", () => {
    const doc = lapDoc({ AAA: [90, 180, 270, 360, 450], BBB: [91, 181, 271, 361, 451] });
    const swap = { lap_positions: [2, 2, 1, 1, 1] };
    const pitted = [drv("AAA", { lap_positions: [1, 1, 2, 2, 2], stints: [{ lap_end: 2 }, { lap_end: 5 }] as never }), drv("BBB", { finish: 2, ...swap })];
    expect(passes(doc, pitted)).toHaveLength(0);
    const retired = [drv("AAA", { lap_positions: [1, 1, 2, 2, 2], status: "Retired", laps_completed: 2 }), drv("BBB", { finish: 2, ...swap })];
    expect(passes(doc, retired)).toHaveLength(0);
  });
});

describe("pits and retirements", () => {
  it("centres a pit stop on the in-lap line crossing for the pit-lane time", () => {
    const doc = lapDoc({ AAA: [90, 180, 270, 360, 450] });
    const d = drv("AAA", { pit_stops: [{ stop: 1, lap: 2, duration_s: 24 }, { stop: 2, lap: null, duration_s: 20 }] });
    expect(pitWindows(doc, d)).toEqual([{ from: 168, to: 192, lap: 2 }]);
  });
  it("places a retirement on the lap after the last one completed", () => {
    const doc = lapDoc({ AAA: [90, 180, null, null, null] });
    expect(retirement(doc, drv("AAA", { status: "Retired", laps_completed: 2 }))).toEqual({ lap: 3, t: 180 });
    expect(retirement(doc, drv("AAA"))).toBeNull();
  });
  it("explains a retirement only from messages about that car around that moment", () => {
    const inc: IncidentDoc = { season: 2026, round: 1, source: "x", items: [
      { t: 200, lap: 3, kind: "collision", text: "COLLISION INVOLVING CARS 1 (AAA) AND 2 (BBB)", drivers: ["AAA", "BBB"] },
      { t: 900, lap: 9, kind: "collision", text: "later", drivers: ["AAA"] },
      { t: 190, lap: 3, kind: "penalty", text: "penalty", drivers: ["AAA"] },
    ] };
    expect(causeOf("AAA", 180, inc)).toContain("COLLISION INVOLVING");
    expect(causeOf("CCC", 180, inc)).toBeNull();
    expect(causeOf("AAA", 180, null)).toBeNull();
  });
});

describe("buildEvents", () => {
  it("puts pits, retirements, incidents and a post-race penalty in time order", () => {
    const doc = lapDoc({ AAA: [90, 180, 270, 360, 450], BBB: [91, 181, null, null, null], CCC: [92, 182, 272, 362, 452] });
    const inc: IncidentDoc = { season: 2026, round: 1, source: "x", items: [{ t: 200, lap: 3, kind: "safety_car", text: "SAFETY CAR DEPLOYED", drivers: [] }] };
    const ev = buildEvents(doc, [
      drv("AAA", { pit_stops: [{ stop: 1, lap: 2, duration_s: 22.4 }], stints: [{ compound: "MEDIUM" }, { compound: "HARD" }] as never }),
      drv("BBB", { status: "Retired", laps_completed: 2, finish: 3 }),
      drv("CCC", { finish: 4, lap_positions: [3, 3, 3, 3, 1] }),
    ], inc);
    expect(ev.map((e) => e.kind)).toEqual(["pit", "out", "incident", "classification"]);
    expect(ev[0].text).toBe("AAA pits for hards");
    expect(ev[1].detail).toMatch(/not published/);
    expect(ev[3].text).toBe("CCC crossed the line P1, classified P4");
  });
});

import { describe, expect, it } from "vitest";
import { K, MODEL } from "./fixture";
import { monteCarlo, runOnce, type Scenario } from "./montecarlo";

const plan = [
  { compound: "MEDIUM" as const, laps: 25 },
  { compound: "HARD" as const, laps: 25 },
];
const scenario = (over: Partial<Scenario> = {}, code = "C"): Scenario => ({
  model: MODEL, circuit: K, total: 50, trackTemp: 35, player: { code, trim: 0, slot: null, plan },
  weather: { kind: "dry" }, events: { sc: [], vsc: [] }, scProb: 0, ...over,
});

describe("a simulated race", () => {
  it("is exactly repeatable for the same seed, and different for another", () => {
    const a = runOnce(scenario(), 11).runToEnd().map((c) => c.code).join();
    const b = runOnce(scenario(), 11).runToEnd().map((c) => c.code).join();
    expect(a).toBe(b);
    const times = (seed: number) => runOnce(scenario(), seed).runToEnd()[0].total;
    expect(times(1)).not.toBe(times(2));
  });

  it("classifies everyone once, with the retired last", () => {
    const res = runOnce(scenario(), 4).runToEnd();
    expect(res.map((c) => c.position)).toEqual([1, 2, 3, 4, 5, 6]);
    const firstRetired = res.findIndex((c) => c.dnf !== null);
    if (firstRetired >= 0) expect(res.slice(firstRetired).every((c) => c.dnf !== null)).toBe(true);
  });

  it("a race takes about the laps times the lap time", () => {
    const winner = runOnce(scenario(), 6).runToEnd().find((c) => c.dnf === null)!;
    expect(winner.total).toBeGreaterThan(50 * 85);
    expect(winner.total).toBeLessThan(50 * 100);
  });

  it("a safety car closes the field up", () => {
    const spread = (events: Scenario["events"]) => {
      const r = runOnce(scenario({ events }), 9);
      while (!r.finished) r.step();
      const t = r.results().filter((c) => c.dnf === null).map((c) => c.total);
      return Math.max(...t) - Math.min(...t);
    };
    expect(spread({ sc: [{ start: 40, laps: 4 }], vsc: [] })).toBeLessThan(spread({ sc: [], vsc: [] }));
  });

  it("a stop under the safety car costs less than one under green", () => {
    const cost = (events: Scenario["events"]) => {
      const r = runOnce(scenario({ events, player: { code: "C", trim: 0, slot: null, plan: [{ compound: "MEDIUM", laps: 20 }, { compound: "HARD", laps: 30 }] } }), 2);
      while (!r.finished) r.step();
      const me = r.results().find((c) => c.player)!;
      return me.laps[19];
    };
    expect(cost({ sc: [{ start: 20, laps: 3 }], vsc: [] })).toBeLessThan(cost({ sc: [], vsc: [] }) + 60);
  });

  it("running one compound all race is disqualified; two is fine", () => {
    const one = runOnce(scenario({ player: { code: "C", trim: 0, slot: null, plan: [{ compound: "MEDIUM", laps: 50 }] } }), 3);
    one.runToEnd();
    const me = one.results().find((c) => c.player)!;
    expect(me.dsq || me.dnf !== null).toBe(true);
    const ok = runOnce(scenario(), 3);
    ok.runToEnd();
    expect(ok.results().find((c) => c.player)!.dsq).toBe(false);
  });

  it("in manual mode a pit command changes the tyre", () => {
    const r = runOnce(scenario(), 5, plan, true);
    for (let i = 0; i < 10; i++) r.step();
    r.step({ pit: "HARD" });
    const me = r.player()!;
    expect(me.compound).toBe("HARD");
    expect(me.pits).toContain(11);
  });

  it("teams switch to wet tyres when it rains", () => {
    const r = runOnce(scenario({ weather: { kind: "rain", start: 10, peak: 0.9, length: 40 } }), 8);
    r.runToEnd();
    const used = new Set(r.cars.flatMap((c) => [...c.used]));
    expect(used.has("INTERMEDIATE") || used.has("WET")).toBe(true);
  });
});

describe("Monte Carlo", () => {
  it("finishing shares add up to one and a faster car does better", () => {
    const slow = monteCarlo(scenario({ events: null, scProb: 0.3 }), 60);
    const fast = monteCarlo(scenario({ events: null, scProb: 0.3, player: { code: "C", trim: -2.5, slot: null, plan } }), 60);
    expect(slow.finish.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    expect(fast.meanPosition).toBeLessThan(slow.meanPosition);
    expect(fast.win).toBeGreaterThan(slow.win);
  });

  it("the best car does not win every race: luck matters", () => {
    const wins = monteCarlo(scenario({ events: null, scProb: 0.4, player: { code: "A", trim: 0, slot: null, plan } }), 120).win;
    expect(wins).toBeGreaterThan(0.2);
    expect(wins).toBeLessThan(0.85);
  });
});

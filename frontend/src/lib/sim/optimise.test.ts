import { describe, expect, it } from "vitest";
import { K, MODEL } from "./fixture";
import { optimise } from "./optimise";
import { planProblem } from "./plan";
import type { Scenario } from "./montecarlo";
import type { PlanStint } from "./types";

describe("the optimiser", () => {
  it("never recommends something worse than the player's own plan, and its answer is legal", async () => {
    const yours: PlanStint[] = [{ compound: "SOFT", laps: 40 }, { compound: "MEDIUM", laps: 10 }]; // a poor plan
    const s: Scenario = { model: MODEL, circuit: K, total: 50, trackTemp: 35, player: { code: "C", trim: 0, slot: null, plan: yours }, weather: { kind: "dry" }, events: null, scProb: 0.4 };
    let last = 0;
    const out = await optimise(s, yours, () => false, (f) => (last = f));
    expect(out).not.toBeNull();
    const o = out!;
    expect(last).toBeGreaterThan(0.9);
    expect(planProblem(o.recommended.plan, 50)).toBeNull();
    expect(o.recommended.summary.meanPosition).toBeLessThanOrEqual(o.yours.summary.meanPosition);
    expect(o.ranked[0]).toBe(o.recommended);
    expect(o.scScan.length).toBe(13);
    expect(o.worstCase.meanPosition).toBeGreaterThanOrEqual(o.bestCase.meanPosition);
    expect(o.scenarios).toHaveLength(4);
    for (const row of o.scenarios) expect(row.best.summary.meanPosition).toBeLessThanOrEqual(row.yours.meanPosition + 1e-9);
  }, 60_000);

  it("stops when asked", async () => {
    const yours: PlanStint[] = [{ compound: "MEDIUM", laps: 25 }, { compound: "HARD", laps: 25 }];
    const s: Scenario = { model: MODEL, circuit: K, total: 50, trackTemp: 35, player: { code: "C", trim: 0, slot: null, plan: yours }, weather: { kind: "dry" }, events: null, scProb: 0.4 };
    expect(await optimise(s, yours, () => true, () => {})).toBeNull();
  });
});

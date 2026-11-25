import { describe, expect, it } from "vitest";
import { K, MODEL } from "./fixture";
import { buildField, fitPlan, planProblem, suggestPlans } from "./plan";

const S = (compound: "SOFT" | "MEDIUM" | "HARD" | "INTERMEDIATE", laps: number) => ({ compound, laps });

describe("plan rules", () => {
  it("accepts a legal plan and explains an illegal one", () => {
    expect(planProblem([S("SOFT", 20), S("HARD", 30)], 50)).toBeNull();
    expect(planProblem([S("SOFT", 20), S("HARD", 20)], 50)).toMatch(/20 laps|covers 40/);
    expect(planProblem([S("SOFT", 30), S("HARD", 30)], 50)).toMatch(/too long/);
    expect(planProblem([S("MEDIUM", 25), S("MEDIUM", 25)], 50)).toMatch(/two different compounds/);
    expect(planProblem([S("MEDIUM", 25), S("INTERMEDIATE", 25)], 50)).toBeNull(); // wet tyres lift the rule
  });

  it("fitPlan trims or stretches the last stint to the race length", () => {
    expect(fitPlan([S("SOFT", 20), S("HARD", 40)], 50)[1].laps).toBe(30);
    expect(fitPlan([S("SOFT", 20), S("HARD", 20)], 50)[1].laps).toBe(30);
  });
});

describe("suggestions", () => {
  const sug = suggestPlans(MODEL, K, 50, 35, 6);
  it("returns legal plans, quickest first", () => {
    expect(sug.length).toBeGreaterThan(1);
    for (const s of sug) expect(planProblem(s.plan, 50)).toBeNull();
    for (let i = 1; i < sug.length; i++) expect(sug[i].time).toBeGreaterThanOrEqual(sug[i - 1].time);
  });

  it("keeps every stint within what the tyre has been seen to do", () => {
    const best = sug[0].plan;
    for (const s of best) expect(s.laps).toBeLessThanOrEqual(Math.round(K.max_age[s.compound as "SOFT"] * 1.7));
  });

  it("a costlier pit lane pushes the answer towards fewer stops", () => {
    const cheap = suggestPlans(MODEL, { ...K, pit_loss_s: 8 }, 50, 35, 1)[0];
    const dear = suggestPlans(MODEL, { ...K, pit_loss_s: 45 }, 50, 35, 1)[0];
    expect(dear.stops).toBeLessThanOrEqual(cheap.stops);
  });
});

describe("the grid", () => {
  it("puts the player where asked, and gives everyone a unique slot", () => {
    const plan = [S("SOFT", 20), S("HARD", 30)];
    const cars = buildField(MODEL, [plan], { code: "C", trim: 0, slot: 1, plan }, 3);
    expect(cars.length).toBe(6);
    expect(cars.find((c) => c.code === "C")!.grid).toBe(1);
    expect(new Set(cars.map((c) => c.grid)).size).toBe(6);
  });

  it("the trim makes the player's car faster", () => {
    const plan = [S("SOFT", 20), S("HARD", 30)];
    const a = buildField(MODEL, [plan], { code: "C", trim: 0, slot: null, plan }, 3).find((c) => c.code === "C")!;
    const b = buildField(MODEL, [plan], { code: "C", trim: -0.5, slot: null, plan }, 3).find((c) => c.code === "C")!;
    expect(b.car).toBeCloseTo(a.car - 0.5, 5);
  });
});

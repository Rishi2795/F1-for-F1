import { describe, expect, it } from "vitest";
import { advise } from "./advisor";
import { K, MODEL } from "./fixture";
import { runOnce, type Scenario } from "./montecarlo";
import { planProblem } from "./plan";
import type { PlanStint } from "./types";

const plan: PlanStint[] = [{ compound: "MEDIUM", laps: 25 }, { compound: "HARD", laps: 25 }];
const scenario = (over: Partial<Scenario> = {}, code = "C"): Scenario => ({
  model: MODEL, circuit: K, total: 50, trackTemp: 35, player: { code, trim: 0, slot: null, plan },
  weather: { kind: "dry" }, events: { sc: [], vsc: [], red: [] }, scProb: 0, ...over,
});
const live = (over: Partial<Scenario> = {}, seed = 5) => runOnce(scenario(over), seed, plan, true);

describe("red flags", () => {
  it("stop the race, line the cars up, and wait for a restart when the player is in charge", () => {
    const r = live({ events: { sc: [], vsc: [], red: [10] } });
    for (let i = 0; i < 10; i++) r.step();
    expect(r.suspended).toBe(true);
    const running = r.standings().filter((s) => !s.out);
    for (let i = 1; i < running.length; i++) expect(running[i].interval).toBeCloseTo(0.4, 5); // lined up on the grid
    const lap = r.lap;
    r.step(); // does nothing while stopped
    expect(r.lap).toBe(lap);
    r.restart("HARD");
    expect(r.suspended).toBe(false);
    expect(r.player()!.compound).toBe("HARD");
    expect(r.player()!.age).toBe(0);
    expect(r.player()!.pits).toEqual([]); // a free change is not a pit stop
  });

  it("the player can call one, and keep the same tyres", () => {
    const r = live();
    for (let i = 0; i < 6; i++) r.step();
    const before = r.player()!.compound;
    r.callRedFlag();
    expect(r.suspended).toBe(true);
    r.restart(null);
    expect(r.player()!.compound).toBe(before);
    expect(r.player()!.age).toBeGreaterThan(0);
  });

  it("a restart lap is a standing start: slower than the lap before it", () => {
    const r = live({ events: { sc: [], vsc: [], red: [10] } }, 7);
    for (let i = 0; i < 10; i++) r.step();
    const before = r.player()!.laps[8];
    r.restart(null);
    r.step();
    expect(r.player()!.laps[10]).toBeGreaterThan(before + 1.5);
  });

  it("in a batch run every car gets fresh tyres and the race simply continues", () => {
    const r = runOnce(scenario({ events: { sc: [], vsc: [], red: [12] } }), 3);
    r.runToEnd();
    expect(r.suspended).toBe(false);
    expect(r.feed.some((e) => e.kind === "red")).toBe(true);
    expect(r.finished).toBe(true);
  });
});

describe("race control", () => {
  it("deploying a safety car slows the next laps and closes the gaps", () => {
    const r = live();
    for (let i = 0; i < 12; i++) r.step();
    const lastGreen = r.player()!.laps[11];
    r.deploy("sc", 3);
    const out = r.step();
    expect(out.flag).toBe("sc");
    expect(r.player()!.laps[12]).toBeGreaterThan(lastGreen + 10);
    expect(r.feed.some((e) => e.text.includes("Safety car called"))).toBe(true);
  });

  it("does not leak events between races that share a scenario", () => {
    const events = { sc: [], vsc: [], red: [] };
    const s = scenario({ events });
    const a = runOnce(s, 1, plan, true);
    a.step();
    a.deploy("sc", 3);
    expect(events.sc.length).toBe(0);
  });
});

describe("tyre sets", () => {
  it("a plan may not use more sets than are available", () => {
    const three: PlanStint[] = [{ compound: "SOFT", laps: 15 }, { compound: "SOFT", laps: 15 }, { compound: "HARD", laps: 20 }];
    expect(planProblem(three, 50)).toBeNull();
    expect(planProblem(three, 50, { SOFT: 1, MEDIUM: 3, HARD: 2 })).toMatch(/Only 1 soft set is available/);
  });

  it("a used set starts with its age", () => {
    const aged: PlanStint[] = [{ compound: "MEDIUM", laps: 25, startAge: 8 }, { compound: "HARD", laps: 25 }];
    const r = runOnce(scenario({ player: { code: "C", trim: 0, slot: null, plan: aged } }), 2, aged, true);
    expect(r.player()!.age).toBe(8);
  });
});

describe("the advisor", () => {
  it("says to box when the tyres are finished and everyone else is on fresh ones", () => {
    const worn: PlanStint[] = [{ compound: "SOFT", laps: 50 }];
    const r = runOnce(scenario({ player: { code: "C", trim: 0, slot: null, plan: worn } }), 9, worn, true);
    for (let i = 0; i < 24; i++) r.step({ hold: true });
    const a = advise(r, 24)!;
    // either box now, or say the stop is due within a lap or two: never "carry on" with no end in sight
    const soon = a.stopDue !== null && a.stopDue - r.lap <= 3;
    expect(a.best.action.pit !== null || soon).toBe(true);
    expect(a.headline).toMatch(/Box|stop due/);
    expect(a.options[0].meanPosition).toBeLessThanOrEqual(a.stay.meanPosition);
  });

  it("says to stay out on a fresh tyre early in the race", () => {
    const r = live();
    for (let i = 0; i < 4; i++) r.step();
    const a = advise(r, 24)!;
    expect(a.best.action.id).toBe("stay");
    expect(a.headline).toBe("Stay out");
    expect(a.stopDue).toBeGreaterThan(10); // a long way off
  });

  it("calls for wet tyres when a storm hits and the player is on slicks", () => {
    const r = live({ weather: { kind: "rain", start: 8, peak: 0.9, length: 40 } });
    for (let i = 0; i < 16; i++) r.step();
    const a = advise(r, 24)!;
    expect(["INTERMEDIATE", "WET"]).toContain(a.best.action.pit);
  });

  it("under a red flag it weighs a free tyre change, and its answer is a legal one", () => {
    const r = live({ events: { sc: [], vsc: [], red: [20] } });
    for (let i = 0; i < 20; i++) r.step();
    expect(r.suspended).toBe(true);
    const a = advise(r, 16)!;
    expect(a.options.length).toBeGreaterThan(2);
    expect(a.detail).toMatch(/red flag/i);
  });

  it("is repeatable and never changes the race it is looking at", () => {
    const r = live();
    for (let i = 0; i < 10; i++) r.step();
    const lap = r.lap;
    const t = r.player()!.t;
    const a = advise(r, 12)!;
    const b = advise(r, 12)!;
    expect(a.best.action.id).toBe(b.best.action.id);
    expect(r.lap).toBe(lap);
    expect(r.player()!.t).toBe(t);
  });
});

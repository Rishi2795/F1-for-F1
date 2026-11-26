import { describe, expect, it } from "vitest";
import { MODEL, K } from "./fixture";
import { degradation, lapTime, wetnessAt, wetPenalty, type LapInput } from "./physics";

const base: LapInput = { compound: "MEDIUM", age: 0, lap: 1, total: 50, car: 0, mode: "standard", trackTemp: 35, wetness: 0 };

describe("lap time", () => {
  it("a fresh soft beats a fresh medium, and a hard is slower", () => {
    const soft = lapTime(MODEL, K, { ...base, compound: "SOFT" });
    const med = lapTime(MODEL, K, base);
    const hard = lapTime(MODEL, K, { ...base, compound: "HARD" });
    expect(soft).toBeLessThan(med);
    expect(hard).toBeGreaterThan(med);
  });

  it("tyres lose time with age, and a soft loses it faster", () => {
    const loss = (c: "SOFT" | "HARD") => degradation(MODEL, K, c, 15, 35);
    expect(loss("SOFT")).toBeGreaterThan(loss("HARD"));
    expect(degradation(MODEL, K, "MEDIUM", 20, 35)).toBeGreaterThan(degradation(MODEL, K, "MEDIUM", 10, 35));
  });

  it("falls off a cliff beyond the longest run ever seen", () => {
    const seen = degradation(MODEL, K, "SOFT", K.max_age.SOFT, 35);
    const five = degradation(MODEL, K, "SOFT", K.max_age.SOFT + 5, 35);
    const ten = degradation(MODEL, K, "SOFT", K.max_age.SOFT + 10, 35);
    expect(five - seen).toBeGreaterThan(0.5);
    expect(ten - five).toBeGreaterThan(five - seen); // and it gets steeper
  });

  it("lighter fuel is quicker, a faster car is quicker, push beats conserve", () => {
    expect(lapTime(MODEL, K, { ...base, lap: 50 })).toBeLessThan(lapTime(MODEL, K, base));
    expect(lapTime(MODEL, K, { ...base, car: -1 })).toBeCloseTo(lapTime(MODEL, K, base) - 1, 5);
    expect(lapTime(MODEL, K, { ...base, mode: "push" })).toBeLessThan(lapTime(MODEL, K, { ...base, mode: "conserve" }));
  });

  it("pushing wears the tyre faster than conserving it", () => {
    const old = { ...base, age: 20 };
    const gain = (m: "push" | "conserve") => lapTime(MODEL, K, { ...old, mode: m }) - lapTime(MODEL, K, { ...base, mode: m });
    expect(gain("push")).toBeGreaterThan(gain("conserve"));
  });

  it("a hotter track wears tyres faster", () => {
    expect(degradation(MODEL, K, "MEDIUM", 20, 50)).toBeGreaterThan(degradation(MODEL, K, "MEDIUM", 20, 25));
  });
});

describe("rain", () => {
  it("slicks lose most in the wet; intermediates win on a damp track, and lose on a dry one", () => {
    expect(wetPenalty(MODEL, "SOFT", 0.7)).toBeGreaterThan(wetPenalty(MODEL, "INTERMEDIATE", 0.7));
    expect(wetPenalty(MODEL, "INTERMEDIATE", 0.0)).toBeGreaterThan(wetPenalty(MODEL, "SOFT", 0.0));
    expect(wetPenalty(MODEL, "WET", 0.95)).toBeLessThan(wetPenalty(MODEL, "INTERMEDIATE", 0.95));
  });

  it("the wetness profile ramps up, holds, then dries", () => {
    const w = { kind: "rain", start: 10, peak: 0.8, length: 10 } as const;
    expect(wetnessAt(w, 5)).toBe(0);
    expect(wetnessAt(w, 20)).toBeCloseTo(0.8, 5);
    expect(wetnessAt(w, 13)).toBeGreaterThan(0);
    expect(wetnessAt(w, 13)).toBeLessThan(0.8);
    expect(wetnessAt(w, 60)).toBe(0);
    expect(wetnessAt({ kind: "dry" }, 30)).toBe(0);
    const drying = { kind: "drying", start: 1, length: 20 } as const;
    expect(wetnessAt(drying, 1)).toBeGreaterThan(wetnessAt(drying, 15));
  });
});

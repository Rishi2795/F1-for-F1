import { describe, expect, it } from "vitest";
import { carAt, distanceAt, leaderLap, pointAt, raceLength } from "./trackmap";
import type { LapDriver } from "../types/api";

const car = (end: (number | null)[], times: (number | null)[]): LapDriver => ({ code: "AAA", lap_times: times, gap: [], best_sectors: [], top_speed_kph: null, end });

describe("carAt", () => {
  const d = car([90, 180, 270], [90, 90, 90]);
  it("places a car on its lap and how far round it is", () => {
    expect(carAt(d, 45, 3)).toEqual({ state: "racing", lap: 1, frac: 0.5 });
    expect(carAt(d, 135, 3)).toEqual({ state: "racing", lap: 2, frac: 0.5 });
  });
  it("knows before the start, after the flag, and after a retirement", () => {
    expect(carAt(car([100, 190], [90, 90]), 5, 2)).toEqual({ state: "grid" }); // lap 1 began at t = 10
    expect(carAt(d, 400, 3)).toEqual({ state: "finished", lap: 3 });
    expect(carAt(car([90, 180], [90, 90]), 400, 3)).toEqual({ state: "out", lap: 2 });
  });
  it("skips a lap with no timing instead of inventing one", () => {
    const gap = car([90, null, 270], [90, null, 90]);
    expect(carAt(gap, 200, 3)).toMatchObject({ state: "racing", lap: 3 });
  });
});

describe("pointAt / distanceAt / leaderLap / raceLength", () => {
  const square = [[0, 0], [10, 0], [10, 10], [0, 10]];
  it("walks a closed loop and wraps round", () => {
    expect(pointAt(square, 0)).toEqual([0, 0]);
    expect(pointAt(square, 0.125)).toEqual([5, 0]);
    expect(pointAt(square, 0.875)).toEqual([0, 5]);
    expect(pointAt(square, 1.25)).toEqual([10, 0]);
    expect(pointAt(square, -0.25)).toEqual([0, 10]);
  });
  it("orders cars by distance and finds the leader's lap", () => {
    const a = car([90, 180], [90, 90]);
    const b = { ...car([95, 190], [95, 95]), code: "BBB" };
    expect(distanceAt(carAt(a, 135, 2))).toBeGreaterThan(distanceAt(carAt(b, 135, 2)));
    expect(leaderLap([a, b], 135, 2)).toBe(2);
    expect(raceLength([a, b])).toBe(190);
  });
});

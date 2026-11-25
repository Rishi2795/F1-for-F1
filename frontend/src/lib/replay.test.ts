import { describe, expect, it } from "vitest";
import { liveAt } from "./replay";
import type { ReplayDriver } from "../types/api";

const d = (over: Partial<ReplayDriver> = {}): ReplayDriver => ({
  code: "AAA", f: [1000, 2000, 3000, null, 5000], speed: [100, 200, 300, null, 100], throttle: [0, 50, 100, null, 0],
  brake: [1, 0, 0, null, 0], gear: [2, 4, 6, null, 3], rpm: [9000, 10000, 11000, null, 9000], drs: [0, 0, 1, null, 0], ...over,
});

describe("liveAt", () => {
  it("lines the replay clock up with the race clock and blends between seconds", () => {
    const x = liveAt(d(), 0.5, 0)!;
    expect(x.frac).toBeCloseTo(0.15);
    expect(x.speed).toBe(150);
    const shifted = liveAt(d(), 0.5, 1)!; // replay second = race second + offset
    expect(shifted.frac).toBeCloseTo(0.25);
  });
  it("takes stepped values from the nearer second", () => {
    expect(liveAt(d(), 0.2, 0)!.brake).toBe(true);
    expect(liveAt(d(), 0.8, 0)!.brake).toBe(false);
    expect(liveAt(d(), 0.8, 0)!.gear).toBe(4);
  });
  it("goes round the line the short way", () => {
    const x = liveAt(d({ f: [9900, 100, 300, 400, 500] }), 0.5, 0)!;
    expect(x.frac).toBeCloseTo(0.0, 2);
    expect(x.frac < 0.02 || x.frac > 0.98).toBe(true);
  });
  it("is null across a hole or outside the data, never a made-up number", () => {
    expect(liveAt(d(), 2.5, 0)).toBeNull();
    expect(liveAt(d(), 3.5, 0)).toBeNull();
    expect(liveAt(d(), -5, 0)).toBeNull();
    expect(liveAt(d(), 99, 0)).toBeNull();
  });
  it("keeps a missing sensor missing while the position is known", () => {
    const x = liveAt(d({ speed: [100, null, 300, null, 100] }), 0.5, 0)!;
    expect(x.speed).toBeNull();
    expect(liveAt(d({ speed: [100, null, 300, null, 100] }), 0, 0)!.speed).toBe(100);
    expect(x.frac).toBeCloseTo(0.15);
  });
});

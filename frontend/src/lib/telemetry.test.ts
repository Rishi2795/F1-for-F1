import { describe, expect, it } from "vitest";
import { deltaAt, fractionAtMs, heat, lapClock, nearestFraction, readingAt, sectorAt, sectorTimes, trackColours } from "./telemetry";
import type { TelemetryDriver } from "../types/api";

const N = 4;
const lap = (over: Partial<TelemetryDriver> = {}): TelemetryDriver => ({
  code: "AAA", lap: 3, time_s: 80, t_ms: [0, 20000, 40000, 60000], speed: [100, 200, 300, 200], throttle: [0, 50, 100, 50],
  brake: [1, 0, 0, 0], gear: [2, 4, 8, 5], rpm: [8000, 10000, 12000, 10000], drs: [0, 0, 1, 0], ...over,
});

describe("readingAt", () => {
  it("blends smooth channels between points and takes the nearer point for stepped ones", () => {
    const r = readingAt(lap(), 0.125); // halfway between point 0 and 1
    expect(r.speed).toBe(150);
    expect(r.ms).toBe(10000);
    const near0 = readingAt(lap(), 0.1); // closer to point 0
    expect(near0.gear).toBe(2);
    expect(near0.brake).toBe(true);
    expect(readingAt(lap(), 0.2).gear).toBe(4);
  });
  it("wraps round the line and runs the last point on to the lap time", () => {
    const r = readingAt(lap(), 0.875);
    expect(r.speed).toBe(150); // between 200 and the first point's 100
    expect(r.ms).toBe(70000);
    expect(readingAt(lap(), 1).speed).toBe(100);
    expect(readingAt(lap(), -0.25).speed).toBe(200);
  });
});

describe("fractionAtMs", () => {
  it("is the inverse of the lap clock", () => {
    expect(fractionAtMs(lap(), 10000)).toBeCloseTo(0.125);
    expect(fractionAtMs(lap(), 70000)).toBeCloseTo(0.875);
    expect(fractionAtMs(lap(), 0)).toBe(0);
    expect(fractionAtMs(lap(), 90000)).toBe(1);
  });
});

describe("sectors", () => {
  it("finds the sector and splits the lap time", () => {
    const s = [0.25, 0.75];
    expect([0.1, 0.5, 0.9].map((f) => sectorAt(f, s))).toEqual([0, 1, 2]);
    expect(sectorAt(0.5, null)).toBe(0);
    const t = sectorTimes(lap(), s);
    expect(t.reduce((a, b) => (a ?? 0) + (b ?? 0), 0)).toBeCloseTo(80);
    expect(t[0]).toBeCloseTo(20);
    expect(sectorTimes(lap(), null)).toEqual([null, null, null]);
  });
});

describe("deltaAt", () => {
  it("is positive when the first car is slower to a point", () => {
    expect(deltaAt(lap({ t_ms: [0, 21000, 42000, 63000] }), lap(), 0.25)).toBeCloseTo(1);
    expect(deltaAt(lap(), lap(), 0.6)).toBe(0);
  });
});

describe("drawing helpers", () => {
  it("formats the lap clock", () => {
    expect(lapClock(3040)).toBe("0:03.040");
    expect(lapClock(92401)).toBe("1:32.401");
    expect(lapClock(-5)).toBe("0:00.000");
  });
  it("runs from blue to red", () => {
    expect(heat(0)).toBe("rgb(59,130,246)");
    expect(heat(1)).toBe("rgb(239,68,68)");
    expect(heat(5)).toBe(heat(1));
  });
  it("colours a point per entry, slowest coolest", () => {
    const c = trackColours(lap(), "speed", null);
    expect(c).toHaveLength(N);
    expect(c[0]).toBe(heat(0));
    expect(c[2]).toBe(heat(1));
    expect(trackColours(lap(), "brake", null)[0]).toBe("#ef4444");
    expect(trackColours(lap(), "sector", [0.25, 0.75])).toEqual(["#ef4444", "#facc15", "#facc15", "#34d399"]);
  });
  it("finds the nearest point on the outline", () => {
    const outline = [[0, 0], [100, 0], [100, 100], [0, 100]];
    expect(nearestFraction(outline, 95, 90).frac).toBe(0.5);
    expect(nearestFraction(outline, 1, 1).dist).toBeCloseTo(Math.SQRT2);
  });
});

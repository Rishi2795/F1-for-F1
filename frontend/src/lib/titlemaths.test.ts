import { describe, expect, it } from "vitest";
import { titleMaths } from "./titlemaths";

describe("titleMaths", () => {
  it("calls a title safe only when no weekend can close the gap", () => {
    expect(titleMaths(402, 402, 304, 2)).toEqual({ status: "leader", lead: 98, safe: true });
    expect(titleMaths(402, 402, 380, 2)).toMatchObject({ status: "leader", lead: 22, safe: false });
  });
  it("says a rival is out when even a win and a sprint win every weekend cannot catch up", () => {
    expect(titleMaths(304, 402, 304, 2)).toEqual({ status: "out", gap: 98, max: 66 });
  });
  it("tells a live challenger how much to average if the leader keeps finishing second", () => {
    const r = titleMaths(370, 402, 370, 2);
    expect(r).toMatchObject({ status: "alive", gap: 32, needed: 33 });
    expect(r.status === "alive" && r.perRace).toBeCloseTo((33 + 36) / 2);
    expect(r.status === "alive" && r.achievable).toBe(false); // 34.5 per race is above a win (25)
    expect(titleMaths(395, 402, 395, 3)).toMatchObject({ status: "alive", achievable: true });
  });
});

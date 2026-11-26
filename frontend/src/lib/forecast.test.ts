import { describe, expect, it } from "vitest";
import { pct, reviewSummary, typicalChance, why } from "./forecast";
import type { ForecastDriver } from "../types/api";

const driver = (over: Partial<ForecastDriver> = {}): ForecastDriver => ({
  code: "VER", name: "Max Verstappen", team: "Red Bull", team_color: null, win: 0.3, podium: 0.7, top10: 0.9, dnf: 0.09,
  exp_pos: 3, exp_points: 15, car_rank: 4, pace_rank: 1, pace_gap: 0.1, avg_finish: 1.6, ...over,
});

describe("pct", () => {
  it("never claims a certainty it does not have", () => {
    expect([0.317, 0.034, 0.0004, 0.9996, 1, 0].map(pct)).toEqual(["32%", "3.4%", "<1%", ">99%", ">99%", "<1%"]);
  });
});

describe("typicalChance", () => {
  it("turns a log loss into the chance the real winner usually got", () => {
    expect(typicalChance(Math.log(5))).toBeCloseTo(0.2);
  });
});

describe("why", () => {
  it("says when a car is faster than its rating suggests", () => {
    const text = why(driver(), 10).join(" · ");
    expect(text).toBe("fastest car lately · improving · avg finish P1.6");
  });
  it("flags a slipping car and retirement risk, and falls back to the rating", () => {
    expect(why(driver({ car_rank: 1, pace_rank: 4, dnf: 0.2 }), 10).join(" ")).toBe("4th-fastest car lately slipping avg finish P1.6 retires often");
    expect(why(driver({ pace_rank: null, avg_finish: null, dnf: 0.05, car_rank: 3 }), 10)).toEqual(["3rd of 10 cars by rating"]);
  });
});

describe("reviewSummary", () => {
  it("counts how often the real winner was backed, and in the top three", () => {
    const row = (rank: number) => ({ season: 2026, round: 1, event_name: "x", favourite: "A", favourite_name: "A", favourite_win: 0.2, winner: "B", winner_name: "B", winner_win: 0.1, winner_rank: rank });
    expect(reviewSummary([row(1), row(3), row(6), row(2)])).toEqual({ races: 4, backed: 1, top3: 3 });
  });
});

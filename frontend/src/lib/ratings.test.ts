import { describe, expect, it } from "vitest";
import { ordinal, rateAll } from "./ratings";
import type { RatingEntry } from "../types/api";

const entry = (code: string, driver: number, car: number): RatingEntry => ({
  code, name: code, team: code, overall: driver + car - 1500, driver, car, rank: 1, races: 50, provisional: false,
});

describe("ordinal", () => {
  it("handles the awkward teens", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 112].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "112th"]);
  });
});

describe("rateAll", () => {
  const field = [
    entry("A", 1700, 1800), entry("B", 1650, 1800), // best car
    entry("C", 1750, 1500), entry("D", 1500, 1500), // a strong driver in a mid car
    entry("E", 1400, 1700), entry("F", 1450, 1300), // weak drivers
  ];
  it("ranks drivers individually and cars by team, sharing a rank in the same car", () => {
    const { views, drivers, cars } = rateAll(field);
    expect([drivers, cars]).toEqual([6, 4]);
    const by = Object.fromEntries(views.map((v) => [v.entry.code, v]));
    expect([by.C.driverRank, by.A.driverRank, by.F.driverRank]).toEqual([1, 2, 5]);
    expect([by.A.carRank, by.B.carRank, by.E.carRank, by.C.carRank, by.F.carRank]).toEqual([1, 1, 2, 3, 4]);
  });
  it("says whether the driver rating leads, the car rating leads, or they are level", () => {
    const by = Object.fromEntries(rateAll(field).views.map((v) => [v.entry.code, v.verdict]));
    expect(by.C).toBe("driver_leads"); // best driver, third-best car
    expect(by.E).toBe("car_leads"); // lowest-rated driver, second-best car
    expect(by.A).toBe("matched");
  });
  it("copes with one driver", () => {
    expect(rateAll([entry("A", 1500, 1500)]).views[0].verdict).toBe("matched");
  });
});

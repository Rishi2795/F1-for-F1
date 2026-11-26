import type { RatingEntry } from "../types/api";

export type Verdict = "driver_leads" | "matched" | "car_leads";

export type RatingView = {
  entry: RatingEntry;
  /** 1 = best driver of those rated. */
  driverRank: number;
  /** 1 = the strongest car; drivers in the same car share a rank. */
  carRank: number;
  verdict: Verdict;
};

export const VERDICT_TEXT: Record<Verdict, { label: string; meaning: string }> = {
  driver_leads: { label: "Driver rating leads", meaning: "Rated higher as a driver than their car is" },
  matched: { label: "In step with the car", meaning: "Driver and car are rated about equally" },
  car_leads: { label: "Car rating leads", meaning: "The car is rated higher than the driver. Strategy, reliability and luck shape results too, so this is not a judgement of the driver" },
};

export const ordinal = (n: number): string => {
  const v = n % 100;
  const suffix = v >= 11 && v <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
};

/** Turn the raw Elo-style numbers into ranks and a short label, which is what a reader can use.
 *  A verdict needs a clear gap (a quarter of the field) between the driver's and the car's standing. */
export function rateAll(entries: RatingEntry[]): { views: RatingView[]; drivers: number; cars: number } {
  const byDriver = [...entries].sort((a, b) => b.driver - a.driver);
  const carValues = [...new Set(entries.map((e) => e.car))].sort((a, b) => b - a);
  const drivers = entries.length;
  const cars = carValues.length;
  const views = entries.map((entry) => {
    const driverRank = byDriver.findIndex((e) => e.code === entry.code) + 1;
    const carRank = carValues.indexOf(entry.car) + 1;
    const driverPos = drivers > 1 ? (driverRank - 1) / (drivers - 1) : 0;
    const carPos = cars > 1 ? (carRank - 1) / (cars - 1) : 0;
    const gap = carPos - driverPos; // positive: the driver stands higher than the car
    const verdict: Verdict = gap > 0.25 ? "driver_leads" : gap < -0.25 ? "car_leads" : "matched";
    return { entry, driverRank, carRank, verdict };
  });
  return { views, drivers, cars };
}

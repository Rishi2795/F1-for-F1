import type { RatingEntry } from "../types/api";

export type Verdict = "beats" | "matched" | "carried";

export type RatingView = {
  entry: RatingEntry;
  /** 1 = best driver of those rated. */
  driverRank: number;
  /** 1 = the strongest car; drivers in the same car share a rank. */
  carRank: number;
  verdict: Verdict;
};

export const VERDICT_TEXT: Record<Verdict, { label: string; meaning: string }> = {
  beats: { label: "Beats the car", meaning: "Ranks higher as a driver than their car does" },
  matched: { label: "Matches the car", meaning: "Driver and car are about equally good" },
  carried: { label: "Carried by the car", meaning: "The car ranks higher than the driver" },
};

export const ordinal = (n: number): string => {
  const v = n % 100;
  const suffix = v >= 11 && v <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
};

/** Turn the raw Elo-style numbers into ranks and a one-word verdict, which is what a reader can use.
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
    const verdict: Verdict = gap > 0.25 ? "beats" : gap < -0.25 ? "carried" : "matched";
    return { entry, driverRank, carRank, verdict };
  });
  return { views, drivers, cars };
}

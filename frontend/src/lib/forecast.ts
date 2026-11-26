import type { ForecastDriver, ForecastReviewRow } from "../types/api";
import { ordinal } from "./ratings";

/** 0.317 -> "32%", 0.034 -> "3.4%", 0.0004 -> "<1%", 0.9996 -> ">99%". Never shows a false 0% or 100%. */
export function pct(p: number): string {
  if (p >= 0.995) return ">99%";
  if (p < 0.005) return "<1%";
  if (p < 0.1) return `${(p * 100).toFixed(1)}%`;
  return `${Math.round(p * 100)}%`;
}

/** A log loss of L means the real winner typically got a chance of exp(-L): the forecast's "typical hit". */
export const typicalChance = (logLoss: number): number => Math.exp(-logLoss);

/** Short reasons behind a driver's chances, from fields the forecast publishes. */
export function why(d: ForecastDriver, teams: number): string[] {
  const parts: string[] = [];
  if (d.pace_rank !== null) {
    parts.push(d.pace_rank === 1 ? "fastest car lately" : `${ordinal(d.pace_rank)}-fastest car lately`);
    const trend = d.car_rank - d.pace_rank;
    if (trend >= 2) parts.push("improving");
    else if (trend <= -2) parts.push("slipping");
  }
  if (d.avg_finish !== null) parts.push(`avg finish P${d.avg_finish.toFixed(1)}`);
  if (d.dnf >= 0.14) parts.push("retires often");
  return parts.length ? parts : [`${ordinal(d.car_rank)} of ${teams} cars by rating`];
}

export type ReviewSummary = { races: number; backed: number; top3: number };

export function reviewSummary(rows: ForecastReviewRow[]): ReviewSummary {
  return { races: rows.length, backed: rows.filter((r) => r.winner_rank === 1).length, top3: rows.filter((r) => r.winner_rank <= 3).length };
}

import type { Compound } from "../../lib/sim/types";

export const NAMES: Record<Compound, string> = { SOFT: "Soft", MEDIUM: "Medium", HARD: "Hard", INTERMEDIATE: "Intermediate", WET: "Wet" };

export const control =
  "w-full rounded-sm border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600";

export const fmtTime = (s: number): string => {
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(3).padStart(6, "0")}`;
};
export const fmtRace = (s: number): string => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s - h * 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${(s - h * 3600 - m * 60).toFixed(1).padStart(4, "0")}`;
};
export const fmtGap = (s: number): string => (s < 60 ? `+${s.toFixed(1)}` : `+${Math.floor(s / 60)}:${(s % 60).toFixed(0).padStart(2, "0")}`);
export const pct0 = (p: number): string => `${Math.round(p * 100)}%`;

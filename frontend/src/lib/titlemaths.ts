/** Points a driver can gain on a rival in one weekend: a Grand Prix win and a sprint win, while the rival scores nothing. */
export const MAX_SWING_PER_WEEKEND = 25 + 8;
const SECOND_PLACE = 18;
const GP_WIN = 25;

export type TitleMaths =
  | { status: "leader"; lead: number; safe: boolean }
  | { status: "alive"; gap: number; needed: number; perRace: number; achievable: boolean }
  | { status: "out"; gap: number; max: number };

/** What a driver needs to win the title, from the points table alone (no model). */
export function titleMaths(points: number, leaderPoints: number, secondPoints: number, racesLeft: number): TitleMaths {
  if (points >= leaderPoints) {
    const lead = leaderPoints - secondPoints;
    return { status: "leader", lead, safe: lead > racesLeft * MAX_SWING_PER_WEEKEND };
  }
  const gap = leaderPoints - points;
  const max = racesLeft * MAX_SWING_PER_WEEKEND;
  if (gap >= max) return { status: "out", gap, max };
  // If the leader takes 2nd every time, how much must this driver average per Grand Prix to finish ahead?
  const needed = gap + 1;
  const perRace = racesLeft > 0 ? (needed + racesLeft * SECOND_PLACE) / racesLeft : Infinity;
  return { status: "alive", gap, needed, perRace, achievable: perRace <= GP_WIN };
}

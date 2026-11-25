/** Scoring for the podium game: 3 points for the right driver in the right place, 1 for a podium finisher in the wrong place. */
export function scorePodium(picks: string[], actual: string[]): number {
  return picks.reduce((total, code, i) => total + (actual[i] === code ? 3 : actual.slice(0, 3).includes(code) ? 1 : 0), 0);
}

export type Pick = { codes: string[]; model: string[]; savedAt: string; event: string; date: string };
export type Picks = Record<string, Pick>;

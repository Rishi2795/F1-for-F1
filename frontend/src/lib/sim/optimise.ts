import { monteCarloAsync, type Scenario, type Summary } from "./montecarlo";
import { planLabel, suggestPlans } from "./plan";
import type { PlanStint } from "./types";

export type Scored = { plan: PlanStint[]; label: string; summary: Summary };
export type ScanPoint = { lap: number; meanPosition: number };
export type ScenarioRow = { label: string; note: string; best: Scored; yours: Summary; yoursIsBest: boolean };
export type Optimisation = {
  /** the player's own plan and the quickest alternatives, scored over the circuit's usual mix of luck, best first */
  ranked: Scored[];
  yours: Scored;
  recommended: Scored;
  /** where a safety car would help or hurt the recommended plan */
  scScan: ScanPoint[];
  bestCase: { lap: number; meanPosition: number };
  worstCase: { lap: number; meanPosition: number };
  /** the best plan, and the player's, if the race goes a particular way */
  scenarios: ScenarioRow[];
};

const same = (a: PlanStint[], b: PlanStint[]) => JSON.stringify(a.map((s) => [s.compound, s.laps])) === JSON.stringify(b.map((s) => [s.compound, s.laps]));
const rank = (a: Scored, b: Scored) => a.summary.meanPosition - b.summary.meanPosition || b.summary.meanPoints - a.summary.meanPoints;

/** How many simulated races `optimise` will run, for a progress bar. */
export function optimiseCost(candidates: number): number {
  return candidates * 120 + 13 * 40 + 4 * candidates * 30;
}

/** Find the strategy that does best across the luck a race really has, and say what has to happen for it to shine or fail.
 *  Everything here is the same simulation as "Run 300 races", pointed at more questions. */
export async function optimise(
  s: Scenario,
  yours: PlanStint[],
  isCancelled: () => boolean,
  onProgress: (fraction: number) => void,
): Promise<Optimisation | null> {
  const { model, circuit: k, total, trackTemp } = s;
  const plans: PlanStint[][] = [yours];
  for (const sug of suggestPlans(model, k, total, trackTemp, 6)) if (!plans.some((p) => same(p, sug.plan))) plans.push(sug.plan);
  const budget = optimiseCost(plans.length);
  let done = 0;
  const run = async (sc: Scenario, plan: PlanStint[], runs: number): Promise<Summary | null> => {
    const out = await monteCarloAsync(sc, runs, plan, 1000, isCancelled, undefined);
    done += runs;
    onProgress(Math.min(1, done / budget));
    return out;
  };

  // 1. every candidate under the circuit's own odds of safety cars, red flags and rain
  const scored: Scored[] = [];
  for (const plan of plans) {
    const summary = await run(s, plan, 120);
    if (!summary) return null;
    scored.push({ plan, label: planLabel(plan), summary });
  }
  const ranked = [...scored].sort(rank);
  const recommended = ranked[0];
  const yoursScored = scored[0];

  // 2. when a safety car helps or hurts the recommended plan
  const scLaps = Math.max(2, Math.round(k.sc_laps));
  const scScan: ScanPoint[] = [];
  const dry = s.weather === "circuit" ? ({ kind: "dry" } as const) : s.weather;
  for (let i = 0; i < 13; i++) {
    const lap = Math.max(2, Math.round(2 + (i / 12) * (total - 8)));
    const r = await run({ ...s, weather: dry, events: { sc: [{ start: lap, laps: scLaps }], vsc: [], red: [] } }, recommended.plan, 40);
    if (!r) return null;
    scScan.push({ lap, meanPosition: r.meanPosition });
  }
  const bestCase = scScan.reduce((a, b) => (b.meanPosition < a.meanPosition ? b : a));
  const worstCase = scScan.reduce((a, b) => (b.meanPosition > a.meanPosition ? b : a));

  // 3. what is best if the race goes a particular way
  const cases: { label: string; note: string; over: Partial<Scenario> }[] = [
    { label: "Clean dry race", note: "No safety car, no rain.", over: { weather: dry, events: { sc: [], vsc: [], red: [] } } },
    { label: `Safety car around lap ${bestCase.lap}`, note: "The timing that suits the recommended plan best.", over: { weather: dry, events: { sc: [{ start: bestCase.lap, laps: scLaps }], vsc: [], red: [] } } },
    { label: "Red flag mid-race", note: `Around lap ${Math.round(total * 0.5)}: free tyres for everyone, standing restart.`, over: { weather: dry, events: { sc: [], vsc: [], red: [Math.round(total * 0.5)] } } },
    { label: "Rain from 40% distance", note: "A storm that lasts about 14 laps.", over: { weather: { kind: "rain", start: Math.round(total * 0.4), peak: 0.8, length: 14 }, events: { sc: [], vsc: [], red: [] } } },
  ];
  const scenarios: ScenarioRow[] = [];
  for (const c of cases) {
    let best: Scored | null = null;
    let mine: Summary | null = null;
    for (let i = 0; i < plans.length; i++) {
      const r = await run({ ...s, ...c.over }, plans[i], 30);
      if (!r) return null;
      const sc: Scored = { plan: plans[i], label: planLabel(plans[i]), summary: r };
      if (i === 0) mine = r;
      if (!best || rank(sc, best) < 0) best = sc;
    }
    if (!best || !mine) return null;
    scenarios.push({ label: c.label, note: c.note, best, yours: mine, yoursIsBest: same(best.plan, yours) });
  }
  return { ranked, yours: yoursScored, recommended, scScan, bestCase, worstCase, scenarios };
}

import { buildField, drawEvents, drawWeather, fieldPlans, type PlayerSetup } from "./plan";
import { POINTS, Race, type CarResult } from "./race";
import { rng } from "./rng";
import type { PlanStint, RaceEvents, SimCircuit, SimModel, Weather } from "./types";

export type Scenario = {
  model: SimModel;
  circuit: SimCircuit;
  total: number;
  trackTemp: number;
  player: PlayerSetup;
  /** A fixed weather, or "circuit" to draw rain from this circuit's history in every run. */
  weather: Weather | "circuit";
  /** Fixed events, or null to draw them from the circuit's history (scaled by `scProb`). */
  events: RaceEvents | null;
  scProb: number;
  rainProb?: number;
};

export type Summary = {
  runs: number;
  /** share of runs ending in each position 1..N (index 0 = P1) */
  finish: number[];
  win: number;
  podium: number;
  points: number;
  dsq: number;
  dnf: number;
  meanPosition: number;
  meanPoints: number;
  /** average race time minus the field's fastest finisher, seconds */
  meanGap: number;
};

export function runOnce(s: Scenario, seed: number, plan = s.player.plan, manual = false): Race {
  const r = rng(seed);
  const weather = s.weather === "circuit" ? drawWeather(r, s.circuit, s.total, s.rainProb) : s.weather;
  const events = s.events ?? drawEvents(r, s.circuit, s.total, s.scProb);
  const plans = fieldPlans(s.model, s.circuit, s.total, s.trackTemp, seed + 17);
  const cars = buildField(s.model, plans, { ...s.player, plan }, seed);
  return new Race({ model: s.model, circuit: s.circuit, total: s.total, cars, weather, trackTemp: s.trackTemp, events, seed: seed * 7 + 1, manualPlayer: manual });
}

export function summarise(results: CarResult[][]): Summary {
  const n = results[0]?.length ?? 22;
  const finish = new Array<number>(n).fill(0);
  let dsq = 0;
  let dnf = 0;
  let points = 0;
  let gap = 0;
  for (const res of results) {
    const me = res.find((c) => c.player);
    if (!me) continue;
    finish[me.position - 1] += 1;
    if (me.dnf !== null) dnf += 1;
    if (me.dsq) dsq += 1;
    else points += POINTS[me.position - 1] ?? 0;
    gap += me.gap;
  }
  const runs = results.length || 1;
  const share = finish.map((c) => c / runs);
  return {
    runs: results.length,
    finish: share,
    win: share[0] ?? 0,
    podium: share.slice(0, 3).reduce((a, b) => a + b, 0),
    points: share.slice(0, 10).reduce((a, b) => a + b, 0),
    dsq: dsq / runs,
    dnf: dnf / runs,
    meanPosition: share.reduce((acc, p, i) => acc + p * (i + 1), 0),
    meanPoints: points / runs,
    meanGap: gap / runs,
  };
}

/** Run the same scenario many times with different luck, and summarise how the player's plan fares. */
export function monteCarlo(s: Scenario, runs: number, plan?: PlanStint[], seed0 = 1000): Summary {
  const results: CarResult[][] = [];
  for (let i = 0; i < runs; i++) results.push(runOnce(s, seed0 + i, plan).runToEnd());
  return summarise(results);
}

const tick = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));

/** The same as `monteCarlo`, but hands the browser back between batches so the page stays responsive and can show progress. */
export async function monteCarloAsync(
  s: Scenario,
  runs: number,
  plan: PlanStint[] | undefined,
  seed0: number,
  isCancelled: () => boolean,
  onProgress?: (done: number) => void,
): Promise<Summary | null> {
  const results: CarResult[][] = [];
  for (let i = 0; i < runs; i++) {
    results.push(runOnce(s, seed0 + i, plan).runToEnd());
    if (i % 20 === 19) {
      onProgress?.(i + 1);
      await tick();
      if (isCancelled()) return null;
    }
  }
  return summarise(results);
}

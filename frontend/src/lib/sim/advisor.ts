import { drawFutureEvents } from "./plan";
import { POINTS, type Race } from "./race";
import { rng } from "./rng";
import type { Compound, Weather } from "./types";
import { DRY } from "./types";

/** One thing the player could do right now. `pit: null` is to carry on (or, under a red flag, to keep the same tyres). */
export type Action = { id: string; label: string; pit: Compound | null };

export type Option = {
  action: Action;
  /** where the player finishes, averaged over the simulated futures */
  meanPosition: number;
  meanPoints: number;
  /** the 10th, 50th and 90th percentile finishing positions: a good day, a typical one, a bad one */
  p10: number;
  p50: number;
  p90: number;
  win: number;
  podium: number;
  /** share of futures in which this beats carrying on */
  betterThanStay: number;
  /** places gained on average against carrying on (positive is better) */
  gain: number;
};

export type Advice = {
  lap: number;
  options: Option[]; // best first
  best: Option;
  stay: Option;
  /** when the engineers would make the next stop if the player carries on: the middle of the futures tried (null: not in this race) */
  stopDue: number | null;
  /** the call in plain words */
  headline: string;
  detail: string;
  rollouts: number;
};

const NAME: Record<Compound, string> = { SOFT: "softs", MEDIUM: "mediums", HARD: "hards", INTERMEDIATE: "intermediates", WET: "full wets" };
const MIN_GAIN = 0.25; // places: smaller than this is noise, not a reason to stop
const MIN_SHARE = 0.55;

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];

function candidates(race: Race, suspended: boolean): Action[] {
  const me = race.player();
  if (!me) return [];
  const wet = race.wetnessNow();
  const list: Compound[] = [...DRY];
  if (wet > 0.12 || me.compound === "INTERMEDIATE" || me.compound === "WET") list.push("INTERMEDIATE", "WET");
  const out: Action[] = [{ id: "stay", label: suspended ? "Keep the same tyres" : "Stay out", pit: null }];
  for (const c of list) {
    // a new set of the tyre already on the car only makes sense once it is worn
    if (!suspended && c === me.compound && me.age < 6) continue;
    out.push({ id: c, label: suspended ? `Fit ${NAME[c]}` : `Box for ${NAME[c]}`, pit: c });
  }
  return out;
}

/** Look ahead from the live race: for each action, play out the rest of the race many times with different luck (retirements,
 *  safety cars, red flags, rain that stays or goes) and see where the player finishes. Each action meets the same futures, so the
 *  comparison between them is fair. This is planning with the fitted model, not a guess: it is only as good as that model. */
export function advise(race: Race, rollouts = 32, seed = 4242): Advice | null {
  const me = race.player();
  if (!me || race.finished) return null;
  const suspended = race.suspended;
  const actions = candidates(race, suspended);
  const total = race.cfg.total;
  const k = race.cfg.circuit;
  const lap = race.lap;
  const ongoing = {
    sc: race.events.sc.filter((p) => p.start + p.laps > lap + 1),
    vsc: race.events.vsc.filter((p) => p.start + p.laps > lap + 1),
  };
  const wetNow = race.wetnessNow();

  const stops: number[] = [];
  const finish: Record<string, number[]> = Object.fromEntries(actions.map((a) => [a.id, []]));
  const points: Record<string, number> = Object.fromEntries(actions.map((a) => [a.id, 0]));
  for (let i = 0; i < rollouts; i++) {
    const s = seed + i * 7919 + lap * 131;
    const r = rng(s ^ 0x5bd1e995);
    const future = drawFutureEvents(r, k, lap, total);
    const events = { sc: [...ongoing.sc, ...future.sc], vsc: [...ongoing.vsc, ...future.vsc], red: future.red };
    const weather: Weather = wetNow > 0.12 ? { kind: "hold", wetness: wetNow, from: lap, length: 4 + Math.floor(r() * 18) } : { kind: "dry" };
    for (const a of actions) {
      const sim = race.clone(s, { events, weather, manualPlayer: false, copilot: true });
      if (suspended) {
        sim.restart(a.pit, undefined, true);
      } else {
        sim.step(a.pit ? { pit: a.pit } : { hold: true });
      }
      while (!sim.finished) sim.step();
      const mine = sim.results().find((c) => c.player);
      const pos = mine ? mine.position : 22;
      finish[a.id].push(pos);
      if (a.id === "stay" && mine) {
        const nxt = mine.pits.find((l) => l > lap);
        if (nxt) stops.push(nxt);
      }
      if (mine && !mine.dsq && mine.dnf === null) points[a.id] += POINTS[pos - 1] ?? 0;
    }
  }

  const base = finish.stay;
  const options: Option[] = actions.map((a) => {
    const f = finish[a.id];
    const sorted = [...f].sort((x, y) => x - y);
    const mean = f.reduce((x, y) => x + y, 0) / f.length;
    let better = 0;
    f.forEach((p, i) => (better += p < base[i] ? 1 : p === base[i] ? 0.5 : 0));
    const stayMean = base.reduce((x, y) => x + y, 0) / base.length;
    return {
      action: a,
      meanPosition: mean,
      meanPoints: points[a.id] / rollouts,
      p10: quantile(sorted, 0.1),
      p50: quantile(sorted, 0.5),
      p90: quantile(sorted, 0.9),
      win: f.filter((p) => p === 1).length / f.length,
      podium: f.filter((p) => p <= 3).length / f.length,
      betterThanStay: better / f.length,
      gain: stayMean - mean,
    };
  });
  options.sort((a, b) => a.meanPosition - b.meanPosition || b.meanPoints - a.meanPoints);
  const stay = options.find((o) => o.action.id === "stay") as Option;
  let best = options[0];
  // only call a change when it clearly beats carrying on
  if (best.action.id !== "stay" && (best.gain < MIN_GAIN || best.betterThanStay < MIN_SHARE)) best = stay;

  const stopDue = stops.length > rollouts / 2 ? [...stops].sort((x, y) => x - y)[Math.floor(stops.length / 2)] : null;
  let headline: string;
  let detail: string;
  if (suspended) {
    headline = best.action.id === "stay" ? "Keep the tyres you have" : `${best.action.label}`;
    detail = `Free change under the red flag. Expected finish about P${best.meanPosition.toFixed(1)}, usually between P${best.p10} and P${best.p90}.`;
  } else if (best.action.id === "stay") {
    const soon = stopDue !== null && stopDue - lap <= 3;
    headline = soon ? (stopDue === lap + 1 ? "Box next lap" : `Stay out, stop due around lap ${stopDue}`) : "Stay out";
    detail = soon
      ? `Boxing this lap or the next is about the same, and the stop is due around lap ${stopDue}. Expected finish about P${stay.meanPosition.toFixed(1)} (P${stay.p10} to P${stay.p90}).`
      : `Nothing beats carrying on by enough to be worth a stop. Expected finish about P${stay.meanPosition.toFixed(1)} (P${stay.p10} to P${stay.p90}).`;
  } else {
    headline = `Box this lap for ${NAME[best.action.pit as Compound]}`;
    detail = `About ${best.gain.toFixed(1)} places better than staying out (P${best.meanPosition.toFixed(1)} against P${stay.meanPosition.toFixed(1)}), better in ${Math.round(best.betterThanStay * 100)}% of the futures tried.`;
  }
  return { lap, options, best, stay, stopDue, headline, detail, rollouts };
}

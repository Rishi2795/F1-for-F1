import { degradation, lapTime } from "./physics";
import type { CarSpec } from "./race";
import { gauss, rng } from "./rng";
import type { Allocation, Compound, UserEvent, Dry, PlanStint, RaceEvents, SimCircuit, SimModel, SlowPeriod, Weather } from "./types";
import { DRY } from "./types";

const MIN_STINT = 5;
export const QUALI_S = 0.36; // qualifying scatter around a car's true pace, seconds a lap

/** Why a plan is not a legal race, or null when it is. */
export function planProblem(plan: PlanStint[], total: number, alloc?: Allocation): string | null {
  const laps = plan.reduce((n, s) => n + s.laps, 0);
  if (laps !== total) return laps < total ? `The plan covers ${laps} of ${total} laps` : `The plan is ${laps - total} laps too long`;
  if (plan.some((s) => s.laps < 1)) return "A stint needs at least one lap";
  const wet = plan.some((s) => s.compound === "INTERMEDIATE" || s.compound === "WET");
  const dry = new Set(plan.filter((s) => (DRY as string[]).includes(s.compound)).map((s) => s.compound));
  if (!wet && dry.size < 2) return "A dry race needs at least two different compounds";
  if (alloc) {
    for (const c of DRY) {
      const used = plan.filter((s) => s.compound === c).length;
      if (used > alloc[c]) return `Only ${alloc[c]} ${c.toLowerCase()} ${alloc[c] === 1 ? "set is" : "sets are"} available, and the plan uses ${used}`;
    }
  }
  return null;
}

/** Fit a plan to the race length by stretching or trimming the last stint. */
export function fitPlan(plan: PlanStint[], total: number): PlanStint[] {
  const out = plan.map((s) => ({ ...s }));
  const sum = out.reduce((n, s) => n + s.laps, 0);
  out[out.length - 1].laps = Math.max(1, out[out.length - 1].laps + (total - sum));
  return out;
}

export function planLabel(plan: PlanStint[]): string {
  return plan.map((s) => `${s.compound[0]}${s.laps}`).join(" · ");
}

export type Suggestion = { plan: PlanStint[]; time: number; stops: number };

/** The quickest dry, clear-air plans, best of each shape. It prices tyres and stops only (no traffic, no safety car): the
 *  Monte Carlo run is what tests a plan against everything else. */
const memo = new Map<string, Suggestion[]>();

export function suggestPlans(model: SimModel, k: SimCircuit, total: number, trackTemp: number, limit = 6): Suggestion[] {
  const key = `${model.version}|${k.slug}|${total}|${Math.round(trackTemp)}|${limit}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const found = search(model, k, total, trackTemp, limit);
  if (memo.size > 200) memo.clear();
  memo.set(key, found);
  return found;
}

function search(model: SimModel, k: SimCircuit, total: number, trackTemp: number, limit: number): Suggestion[] {
  const cum: Record<Dry, number[]> = { SOFT: [0], MEDIUM: [0], HARD: [0] };
  for (const c of DRY) {
    for (let a = 0; a < total; a++) cum[c].push(cum[c][a] + degradation(model, k, c, a, trackTemp));
  }
  const off: Record<Dry, number> = { SOFT: k.offsets.SOFT, MEDIUM: 0, HARD: k.offsets.HARD };
  const stint = (c: Dry, n: number) => cum[c][n] + off[c] * n;
  const cap = (c: Dry, relax: number) => Math.max(MIN_STINT, Math.round(k.max_age[c] * relax));
  const out = new Map<string, Suggestion>();
  const consider = (seq: Dry[], lens: number[]) => {
    if (new Set(seq).size < 2) return;
    const time = seq.reduce((n, c, i) => n + stint(c, lens[i]), 0) + (seq.length - 1) * k.pit_loss_s;
    const key = `${seq.length}:${[...seq].sort().join("")}`; // order does not matter in clear air
    const prev = out.get(key);
    if (!prev || time < prev.time) out.set(key, { plan: seq.map((c, i) => ({ compound: c, laps: lens[i], mode: "standard" as const })), time, stops: seq.length - 1 });
  };
  for (const relax of [1.1, 1.7]) {
    for (const a of DRY) {
      for (const b of DRY) {
        if (a === b) continue;
        for (let n = MIN_STINT; n <= total - MIN_STINT; n++) {
          if (n <= cap(a, relax) && total - n <= cap(b, relax)) consider([a, b], [n, total - n]);
        }
      }
    }
    const step = total > 60 ? 2 : 1;
    for (const a of DRY) {
      for (const b of DRY) {
        for (const c of DRY) {
          for (let n1 = MIN_STINT; n1 <= cap(a, relax); n1 += step) {
            for (let n2 = MIN_STINT; n1 + n2 <= total - MIN_STINT; n2 += step) {
              const n3 = total - n1 - n2;
              if (n2 <= cap(b, relax) && n3 <= cap(c, relax)) consider([a, b, c], [n1, n2, n3]);
            }
          }
        }
      }
    }
    if (out.size >= 3) break;
  }
  return [...out.values()].sort((x, y) => x.time - y.time).slice(0, limit);
}

/** Clear-air lap times of a plan, for the preview chart: pit laps include the pit-lane loss. */
export function previewLaps(
  model: SimModel,
  k: SimCircuit,
  plan: PlanStint[],
  total: number,
  car: number,
  trackTemp: number,
): { time: number; compound: Compound; pit: boolean }[] {
  const out: { time: number; compound: Compound; pit: boolean }[] = [];
  let lap = 1;
  plan.forEach((s, i) => {
    for (let a = 0; a < s.laps && lap <= total; a++, lap++) {
      const pit = a === s.laps - 1 && i < plan.length - 1;
      const t = lapTime(model, k, { compound: s.compound, age: a, lap, total, car, mode: s.mode ?? "standard", trackTemp, wetness: 0 });
      out.push({ time: t + (pit ? k.pit_loss_s : 0), compound: s.compound, pit });
    }
  });
  return out;
}

/** Random safety cars and VSCs for one simulated race, from this circuit's history. */
export function drawEvents(r: () => number, k: SimCircuit, total: number, scProb = k.sc_prob, vscProb = k.vsc_prob, redProb = k.red_prob ?? 0.06): RaceEvents {
  const period = (laps: number): SlowPeriod => ({ start: 2 + Math.floor(r() * Math.max(1, total - 6)), laps });
  const sc: SlowPeriod[] = [];
  const vsc: SlowPeriod[] = [];
  if (r() < scProb) {
    sc.push(period(Math.max(2, Math.round(k.sc_laps * (0.7 + 0.6 * r())))));
    if (r() < 0.2) sc.push(period(Math.max(2, Math.round(k.sc_laps * 0.7))));
  }
  if (r() < vscProb) vsc.push(period(2 + Math.floor(r() * 2)));
  const red = r() < redProb ? [4 + Math.floor(r() * Math.max(1, total - 10))] : [];
  return { sc, vsc, red };
}

/** What might still happen from lap `from` on: each kind of event is as likely per lap as the circuit's history says. */
export function drawFutureEvents(r: () => number, k: SimCircuit, from: number, total: number): RaceEvents {
  const left = total - from;
  if (left < 4) return { sc: [], vsc: [], red: [] };
  const share = left / total;
  const start = () => from + 1 + Math.floor(r() * Math.max(1, left - 2));
  const sc = r() < k.sc_prob * share ? [{ start: start(), laps: Math.max(2, Math.round(k.sc_laps * (0.7 + 0.6 * r()))) }] : [];
  const vsc = r() < k.vsc_prob * share ? [{ start: start(), laps: 2 + Math.floor(r() * 2) }] : [];
  const red = r() < (k.red_prob ?? 0.06) * share ? [start()] : [];
  return { sc, vsc, red };
}

/** A weather draw for one simulated race, when the player leaves it to the circuit's history. */
export function drawWeather(r: () => number, k: SimCircuit, total: number, rainProb = k.rain_prob): Weather {
  if (r() >= rainProb) return { kind: "dry" };
  return { kind: "rain", start: 3 + Math.floor(r() * Math.max(1, total - 15)), peak: 0.45 + 0.5 * r(), length: 6 + Math.floor(r() * 18) };
}

/** Plans for the other cars: each a sensible plan for the circuit, a little different from its neighbours'. */
export function fieldPlans(model: SimModel, k: SimCircuit, total: number, trackTemp: number, seed: number): PlanStint[][] {
  const r = rng(seed);
  const options = suggestPlans(model, k, total, trackTemp, 3);
  const weights = [0.55, 0.3, 0.15];
  return Array.from({ length: 40 }, () => {
    let pick = r();
    let idx = 0;
    while (idx < options.length - 1 && pick > weights[idx]) pick -= weights[idx++];
    const base = options[idx].plan.map((s) => ({ ...s }));
    let shift = 0;
    for (let i = 0; i < base.length - 1; i++) {
      const move = Math.round(gauss(r) * 2);
      base[i].laps = Math.max(MIN_STINT, base[i].laps + move - shift);
      shift = move;
    }
    return fitPlan(base, total);
  });
}

export type PlayerSetup = { code: string; trim: number; slot: number | null; plan: PlanStint[] };

/** The grid in qualifying order, with the player's car, trim and starting slot. */
export function buildField(model: SimModel, plans: PlanStint[][], player: PlayerSetup, seed: number): CarSpec[] {
  const r = rng(seed ^ 0x9e3779b9);
  const regular = model.drivers.filter((d) => d.races >= 8);
  const teamOff = new Map(model.teams.map((t) => [t.name, t.offset_s]));
  const cars = regular.map((d) => ({ d, car: (teamOff.get(d.team) ?? 0) + d.offset_s + (d.code === player.code ? player.trim : 0) }));
  const noisy = cars.map((c) => ({ ...c, q: c.car + QUALI_S * gauss(r) }));
  let order = noisy.sort((a, b) => a.q - b.q).map((c) => c.d.code);
  if (player.slot) {
    order = order.filter((c) => c !== player.code);
    order.splice(Math.min(player.slot, order.length + 1) - 1, 0, player.code);
  }
  let planAt = 0;
  return cars.map(({ d, car }) => ({
    code: d.code,
    name: d.name,
    team: d.team,
    color: d.color,
    car,
    grid: order.indexOf(d.code) + 1,
    plan: d.code === player.code ? player.plan : plans[planAt++ % plans.length],
    player: d.code === player.code,
  }));
}

/** The player's scheduled events as race events. A red flag stops the race at the end of its lap. */
export function toRaceEvents(list: UserEvent[]): RaceEvents {
  return {
    sc: list.filter((e) => e.kind === "sc").map((e) => ({ start: e.lap, laps: e.laps })),
    vsc: list.filter((e) => e.kind === "vsc").map((e) => ({ start: e.lap, laps: e.laps })),
    red: list.filter((e) => e.kind === "red").map((e) => e.lap),
  };
}

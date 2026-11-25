import type { Compound, Dry, ModeKey, SimCircuit, SimModel, Weather } from "./types";

const SC_FACTOR = 1.4;
const VSC_FACTOR = 1.28;
const WET_BASE_FALLBACK = 0.2; // full-wet penalty is not measurable from the few wet-tyre races: assumed, shown as such
export const NOISE_S = 0.25; // lap-to-lap scatter of a driver

/** How wet the track is on a lap, 0 dry to 1 flooded. */
export function wetnessAt(w: Weather, lap: number): number {
  if (w.kind === "dry") return 0;
  if (w.kind === "drying") {
    const t = (lap - w.start) / Math.max(1, w.length);
    return Math.max(0, Math.min(1, 0.7 * (1 - t)));
  }
  const ramp = 5;
  const fall = 8;
  const up = Math.min(1, Math.max(0, (lap - w.start) / ramp));
  const end = w.start + ramp + w.length;
  const down = lap <= end ? 1 : Math.max(0, 1 - (lap - end) / fall);
  return Math.max(0, Math.min(1, w.peak * up * down));
}

/** Lap-time fraction lost to the wet by tyre: a slick fades fast, an intermediate suits damp, a full wet suits standing water. */
export function wetPenalty(model: SimModel, compound: Compound, wetness: number): number {
  const slope = model.wet.slope_assumed;
  const best = model.wet.best_wetness_assumed;
  if (compound === "INTERMEDIATE") return (model.wet.intermediate_penalty ?? 0.12) + slope.INTERMEDIATE * Math.abs(wetness - best.INTERMEDIATE);
  if (compound === "WET") return (model.wet.full_wet_penalty ?? WET_BASE_FALLBACK) + slope.WET * Math.abs(wetness - best.WET);
  return slope.SLICK * wetness;
}

/** Seconds a tyre of this age has lost to wear: the fitted curve up to the longest runs ever seen there, an explicit
 *  cliff beyond them. */
export function degradation(model: SimModel, k: SimCircuit, compound: Dry, age: number, trackTemp: number): number {
  const m = k.max_age[compound];
  const a = Math.min(age, m);
  const wear = k.wear_s_per_lap[compound];
  let deg = wear * a + model.global.cliff_s_per_lap2[compound] * a * a + model.global.heat_wear_s_per_lap_per_c * (trackTemp - 35) * a;
  if (age > m) {
    const over = age - m;
    deg += over * Math.max(wear, 0.05) + model.cliff_assumed.after_observed_max_s_per_lap2 * over * over;
  }
  return Math.max(0, deg);
}

export type LapInput = {
  compound: Compound;
  age: number; // laps already run on this set
  lap: number; // 1-based
  total: number;
  car: number; // team + driver + trim, seconds a lap (negative = faster)
  mode: ModeKey;
  trackTemp: number;
  wetness: number;
};

/** A clean-air racing lap, before traffic, noise and safety cars. */
export function lapTime(model: SimModel, k: SimCircuit, i: LapInput): number {
  const mode = model.modes_assumed[i.mode];
  const fuel = model.global.fuel_total_s * ((i.lap - 1) / i.total);
  let t = k.base_lap_s + i.car + fuel + mode.pace_s;
  if (i.compound === "INTERMEDIATE" || i.compound === "WET") {
    // wet-weather tyres: not fitted. A modest wear rate, much faster when the track is too dry for them (overheating).
    const dryTrack = i.wetness < 0.2 ? 2.5 : 1;
    t += 0.04 * i.age * dryTrack * mode.wear;
    return t * (1 + wetPenalty(model, i.compound, i.wetness));
  }
  const off = i.compound === "MEDIUM" ? 0 : (k.offsets[i.compound] ?? model.global.offsets[i.compound]);
  t += off + degradation(model, k, i.compound, i.age, i.trackTemp) * mode.wear;
  return t * (1 + wetPenalty(model, i.compound, i.wetness));
}

export const slowLapTime = (k: SimCircuit, kind: "sc" | "vsc") => k.base_lap_s * (kind === "sc" ? SC_FACTOR : VSC_FACTOR);

/** Easier to overtake the more passes a circuit has seen: 0 (Monaco-hard) to 1 (Vegas-easy). */
export function overtakingEase(k: SimCircuit): number {
  if (k.overtakes == null) return 0.5;
  return Math.max(0.1, Math.min(1, (k.overtakes - 8) / 60));
}

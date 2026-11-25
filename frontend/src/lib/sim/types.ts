export type Dry = "SOFT" | "MEDIUM" | "HARD";
export type Compound = Dry | "INTERMEDIATE" | "WET";
export type ModeKey = "conserve" | "standard" | "push";

export const DRY: Dry[] = ["SOFT", "MEDIUM", "HARD"];
export const COMPOUND_COLOR: Record<Compound, string> = {
  SOFT: "#ef4444",
  MEDIUM: "#facc15",
  HARD: "#f4f4f5",
  INTERMEDIATE: "#22c55e",
  WET: "#3b82f6",
};
export const COMPOUND_LETTER: Record<Compound, string> = { SOFT: "S", MEDIUM: "M", HARD: "H", INTERMEDIATE: "I", WET: "W" };

export type SimCircuit = {
  slug: string;
  name: string;
  location: string;
  country: string;
  laps: number;
  base_lap_s: number;
  pit_loss_s: number;
  offsets: { SOFT: number; HARD: number };
  wear_s_per_lap: Record<Dry, number>;
  max_age: Record<Dry, number>;
  sc_prob: number;
  vsc_prob: number;
  rain_prob: number;
  sc_laps: number;
  overtakes: number | null;
  track_temp_c: number;
  races_seen: number;
};

export type SimTeam = { name: string; offset_s: number; color: string | null };
export type SimDriver = { code: string; name: string; team: string; offset_s: number; color: string | null; races: number };

export type SimModel = {
  version: string;
  season: number;
  global: {
    offsets: Record<Dry, number>;
    wear_s_per_lap: Record<Dry, number>;
    cliff_s_per_lap2: Record<Dry, number>;
    fuel_total_s: number;
    heat_wear_s_per_lap_per_c: number;
    sc_prob: number;
    rain_prob: number;
  };
  circuits: SimCircuit[];
  teams: SimTeam[];
  drivers: SimDriver[];
  wet: {
    intermediate_penalty: number | null;
    full_wet_penalty: number | null;
    intermediate_races: number;
    slope_assumed: Record<string, number>;
    best_wetness_assumed: Record<string, number>;
  };
  modes_assumed: Record<ModeKey, { label: string; pace_s: number; wear: number }>;
  cliff_assumed: { after_observed_max_s_per_lap2: number; note: string };
  card: {
    seasons: number[];
    races: number;
    laps: number;
    circuits: number;
    holdout_races: number;
    holdout_laps: number;
    rmse_global_s: number;
    rmse_circuit_s: number;
    rmse_without_tyre_effects_s: number;
    circuit_terms_gain_pct?: number;
    method: string;
  };
};

/** One stint of a plan: how many laps on which tyre, at which engine mode. */
export type PlanStint = { compound: Compound; laps: number; mode?: ModeKey };

/** Rain: the track gets wet over a few laps, stays wet for a while, then dries. */
export type Weather =
  | { kind: "dry" }
  | { kind: "rain"; start: number; peak: number; length: number }
  | { kind: "drying"; start: number; length: number };

export type SlowPeriod = { start: number; laps: number };
export type RaceEvents = { sc: SlowPeriod[]; vsc: SlowPeriod[] };

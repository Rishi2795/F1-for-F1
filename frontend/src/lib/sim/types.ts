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
  red_prob?: number;
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
/** One stint of a plan: how many laps on which tyre, at which engine mode, and how many laps old the set already is. */
export type PlanStint = { compound: Compound; laps: number; mode?: ModeKey; startAge?: number };

/** Rain: the track gets wet over a few laps, stays wet for a while, then dries. */
export type Weather =
  | { kind: "dry" }
  | { kind: "rain"; start: number; peak: number; length: number }
  | { kind: "drying"; start: number; length: number }
  /** the advisor assumes today's wetness holds for a while, then dries */
  | { kind: "hold"; wetness: number; from: number; length: number };

export type SlowPeriod = { start: number; laps: number };
/** `red` lists the laps after which the race is stopped. */
export type RaceEvents = { sc: SlowPeriod[]; vsc: SlowPeriod[]; red?: number[] };

/** How the player's engineers act when nobody is calling the shots. */
export type PlayerRules = {
  /** take a cheap stop under a safety car or VSC when the tyre is old enough */
  scStops: boolean;
  /** how far through a stint a tyre must be before that stop is taken (0.3 to 0.9) */
  scAt: number;
  /** switch to wet-weather tyres when it rains */
  rainReact: boolean;
  /** laps the team waits after the rain comes before boxing */
  rainDelay: number;
};
export const DEFAULT_RULES: PlayerRules = { scStops: true, scAt: 0.55, rainReact: true, rainDelay: 1 };

/** Sets of tyres available for the weekend. */
export type Allocation = Record<Dry, number>;
export const DEFAULT_ALLOCATION: Allocation = { SOFT: 2, MEDIUM: 3, HARD: 2 };

/** An event the player has scheduled: a safety car, a VSC or a red flag at a given lap. */
export type UserEvent = { id: number; kind: "sc" | "vsc" | "red"; lap: number; laps: number };

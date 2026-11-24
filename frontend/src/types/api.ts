/** Types for the published data contract (see pipeline/f1data/models.py).
 *  Convention: a missing value is `null`, never a made-up default. */

export type DataStatus = "ok" | "partial" | "missing" | "scheduled";

export type Stint = {
  number: number;
  compound: string | null;
  /** Where the compound came from; null when unknown. */
  compound_source: "timing" | "continuity" | "openf1" | null;
  lap_start: number;
  lap_end: number;
  laps: number;
  tyre_age_start: number | null;
  fresh: boolean | null;
};

export type DriverRace = {
  driver_code: string;
  driver_number: number | null;
  driver_name: string;
  team: string;
  team_color: string | null;
  finish: number | null;
  classified: boolean;
  status: string;
  points: number;
  laps_completed: number | null;
  grid: number | null;
  pit_lane_start: boolean;
  positions_gained: number | null;
  laps_available: boolean;
  stops: number | null;
  stops_official: number | null;
  tyre_sequence: string[] | null;
  stints: Stint[] | null;
  longest_stint: number | null;
  consistency_index: number | null;
  strategy_risk: { risk_score: number; risk_label: string; method: string } | null;
  strategy_simulation: { verdict: string; method: string } | null;
};

export type RaceDoc = {
  season: number;
  round: number;
  event_name: string;
  location: string;
  country: string | null;
  date: string;
  winner: { driver_code: string; driver_name: string; team: string } | null;
  drivers: DriverRace[];
  derived: {
    winning_recipe: {
      typical_stops: number | null;
      common_tyre_sequence: string | null;
      avg_longest_stint: number | null;
    };
    style_profile: string[];
    total_laps: number | null;
    safety_car_laps: number | null;
    vsc_laps: number | null;
    red_flag: boolean | null;
  };
  weather: {
    air_temp_c: number | null;
    track_temp_c: number | null;
    humidity_pct: number | null;
    rainfall: boolean | null;
  } | null;
  quality: { status: DataStatus; sources: Record<string, string>; missing: string[]; warnings: string[]; notes: string[] };
};

export type RaceIndexEntry = {
  season: number;
  round: number;
  event_name: string;
  location: string;
  country: string | null;
  date: string;
  data_status: DataStatus;
};

export type SeasonSummary = {
  season: number;
  team: string | null;
  races: number;
  wins: number;
  podiums: number;
  points: number;
  best_finish: number | null;
  avg_finish: number | null;
  avg_grid: number | null;
  positions_gained: number | null;
  consistency: number | null;
  avg_longest_stint: number | null;
  recent_form: number | null;
};

export type DriverListEntry = {
  code: string;
  name: string;
  team: string | null;
  country: string | null;
  image: string | null;
  rating: number | null;
  titles: number | null;
  latest_season: number;
};

export type DriverProfile = {
  code: string;
  name: string;
  team: string | null;
  number: number | null;
  image: string | null;
  latest_season: number;
  /** Drivers' world championships, all-time. */
  titles: number;
  title_years: number[];
  rating: RatingSummary | null;
  stats: SeasonSummary;
  seasons: SeasonSummary[];
};

export type StandingsDriver = {
  code: string;
  name: string;
  /** The number raced with that season (not the driver's current number). */
  number: number | null;
  team: string | null;
  team_color: string | null;
  position: number | null;
  points: number;
  wins: number;
};

export type StandingsConstructor = {
  name: string;
  team_color: string | null;
  position: number | null;
  points: number;
  wins: number;
};

export type StandingsRound = {
  round: number;
  event_name: string;
  drivers: StandingsDriver[];
  constructors: StandingsConstructor[];
};

/** Official championship standings after every played round (sprint points included). */
export type SeasonStandings = {
  season: number;
  source: string;
  /** True once the final round is in: the leader is then the champion. */
  complete: boolean;
  rounds: StandingsRound[];
};

export type CoverageRace = {
  round: number;
  event_name: string;
  status: DataStatus;
  missing: string[];
  warnings: number;
};

export type SeasonCoverage = {
  expected_rounds: number;
  played: number;
  ok: number;
  partial: number;
  missing: number;
  scheduled: number;
  races: CoverageRace[];
};

/** GET /api/coverage: what we have for every race, and why anything is missing. */
export type Coverage = { generated_at: string; seasons: Record<string, SeasonCoverage> };

/** GET /api/meta: when the published data was last built. */
export type BundleMeta = { generated_at?: string; seasons: number[]; sources?: { upstream_commits?: Record<string, string | null> } };

/** Driver-and-car rating (Elo scale, 1500 = average). overall = driver + car - 1500. */
export type RatingSummary = {
  overall: number;
  driver: number;
  car: number;
  rank: number;
  races: number;
  provisional: boolean;
  as_of: string;
};

export type RatingEntry = {
  code: string;
  name: string;
  team: string | null;
  overall: number;
  driver: number;
  car: number;
  rank: number;
  races: number;
  provisional: boolean;
};

export type RatingsCurrent = {
  version: string;
  season: number;
  round: number;
  ratings: RatingEntry[];
};

/** [season, round, driver, car] per race. */
export type RatingHistory = { code: string; history: [number, number, number, number][] };

export type ModelScore = { log_loss: number; accuracy: number; pairs: number };

export type RatingModelCard = {
  version: string;
  as_of: { season: number; round: number };
  method: string[];
  tuning: { seasons: number[] };
  test: { seasons: number[]; pairs: number; races: number };
  metrics: Record<string, ModelScore>;
  winner_pick: Record<string, { correct: number; races: number; accuracy: number }>;
  calibration: { bin: string; predicted: number; observed: number | null; n: number }[];
  limitations: string[];
};

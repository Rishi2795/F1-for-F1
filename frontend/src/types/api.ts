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
  // Race detail. Optional: older or partial races simply do not have it.
  race_time_s?: number | null;
  gap_to_winner_s?: number | null;
  fastest_lap?: { rank: number | null; lap: number | null; time_s: number | null; avg_speed_kph: number | null } | null;
  pit_stops?: { stop: number; lap: number | null; duration_s: number | null }[] | null;
  best_lap_s?: number | null;
  median_lap_s?: number | null;
  pace_rank?: number | null;
  pace_gap_s?: number | null;
  lap_positions?: (number | null)[] | null;
  quali_position?: number | null;
  quali_gap_pct?: number | null;
  sprint_position?: number | null;
  sprint_points?: number | null;
};

export type Excitement = {
  score: number;
  overtakes: number | null;
  lead_changes: number | null;
  safety_car_laps: number | null;
  shuffle: number | null;
  top2_gap_s: number | null;
  retirements: number;
  tags: string[];
};
export type TyreModel = {
  fuel_s_per_lap: number;
  pit_loss_s: number;
  laps_fitted: number;
  compounds: { compound: string; pace_offset_s: number; wear_s_per_lap: number; stints: number }[];
};
export type DriverStrategy = { driver_code: string; actual: string; options: { label: string; stops: number; delta_s: number }[] };

export type RaceAnalysis = {
  fastest_lap: { driver_code: string; lap: number | null; value_s: number } | null;
  fastest_pit: { driver_code: string; lap: number | null; value_s: number } | null;
  lead_changes: number | null;
  tyre_wear: { compound: string; seconds_per_lap: number; stints: number }[];
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
  analysis?: RaceAnalysis | null;
  excitement?: Excitement | null;
  tyre_model?: TyreModel | null;
  strategy_lab?: DriverStrategy[] | null;
};

export type RaceIndexEntry = {
  season: number;
  round: number;
  event_name: string;
  location: string;
  country: string | null;
  date: string;
  data_status: DataStatus;
  excitement?: number | null;
  watch_tags?: string[];
  overtakes?: number | null;
  winner?: string | null;
  sessions?: WeekendSession[];
};

/** One session of a race weekend; `starts` is UTC and is shown in the viewer's own time zone. */
export type WeekendSession = { name: string; starts: string };

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
  number?: number | null;
  team_color?: string | null;
  rating: number | null;
  titles: number | null;
  latest_season: number;
};

export type DriverProfile = {
  code: string;
  name: string;
  team: string | null;
  team_color?: string | null;
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
  team_color?: string | null;
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

/** Race and championship forecasts (probabilities are 0..1). */
export type ForecastDriverGrid = { grid?: number | null };
export type ForecastDriver = ForecastDriverGrid & {
  code: string;
  name: string;
  team: string;
  team_color: string | null;
  win: number;
  podium: number;
  top10: number;
  dnf: number;
  exp_pos: number;
  exp_points: number;
  car_rank: number;
  pace_rank: number | null;
  pace_gap: number | null;
  avg_finish: number | null;
};
export type RaceForecast = { season: number; round: number; event_name: string; date: string; mode: string; drivers: ForecastDriver[] };
export type NextForecasts = { version: string; as_of_season: number; as_of_round: number; races: RaceForecast[] };

export type TitleDriver = { code: string; name: string; team: string; team_color: string | null; points: number; champion: number; top3: number; exp_points: number; positions?: number[]; points_lo?: number | null; points_hi?: number | null };
export type TitleConstructor = { name: string; team_color: string | null; points: number; champion: number; exp_points: number };
export type TitleForecast = {
  version: string;
  season: number;
  as_of_round: number;
  races_left: number;
  remaining: { round: number; event_name: string; date: string }[];
  clinched_driver: string | null;
  clinched_constructor: string | null;
  drivers: TitleDriver[];
  constructors: TitleConstructor[];
};

export type ForecastReviewRow = {
  season: number;
  round: number;
  event_name: string;
  favourite: string;
  favourite_name: string;
  favourite_win: number;
  winner: string;
  winner_name: string;
  winner_win: number;
  winner_rank: number;
};

export type ForecastVariant = { uses: string[]; weights: number[]; races: number; winner_log_loss: number; winner_top1: number; podium_brier: number; dnf_brier: number };
export type ForecastModelCard = {
  version: string;
  as_of: { season: number; round: number };
  method: string[];
  tuning: { seasons: number[]; races: number };
  test: { seasons: number[]; races: number };
  uniform_winner_log_loss: number;
  retirement_rate: number;
  baselines: { podium_brier_uniform: number; dnf_brier_constant: number };
  variants: Record<string, ForecastVariant>;
  forecast_variant: string;
  title_backtest: { forecasts: number; log_loss: number; leader_baseline_log_loss: number; pick_correct: number; leader_correct: number };
  limitations: string[];
};

export type DuelTally = { a: number; b: number; races: number };
export type Duel = {
  team: string;
  team_color: string | null;
  a: { code: string; name: string };
  b: { code: string; name: string };
  races: number;
  qualifying: DuelTally;
  qualifying_gap_pct: number | null;
  race: DuelTally;
  only_a_finished: number;
  only_b_finished: number;
  pace_races: number;
  pace_gap_s: number | null;
  points_a: number;
  points_b: number;
};
export type DuelsDoc = { season: number; duels: Duel[] };

export type CircuitRace = { season: number; round: number; event_name: string; date: string; winner: string | null; winner_name: string | null; winner_team: string | null; pole: string | null; excitement: number | null; laps?: number | null };
export type CircuitDoc = {
  slug: string;
  name: string;
  location: string;
  country: string | null;
  races: CircuitRace[];
  pole_wins: number;
  pole_races: number;
  avg_overtakes: number | null;
  overtaking_rank: number | null;
  safety_car_races: number;
  red_flag_races: number;
  avg_retirements: number;
  avg_winner_stops: number | null;
  typical_winning_tyres: string | null;
  avg_excitement: number | null;
  winners_by_driver: { name: string; count: number }[];
  winners_by_team: { name: string; count: number }[];
  next_race: CircuitRace | null;
  outline?: { points: number[][]; length_m: number; source: string } | null;
};
export type CircuitIndexEntry = { slug: string; name: string; location: string; country: string | null; races: number; avg_excitement: number | null; preview?: number[][] | null };

export type LapDriver = { code: string; lap_times: (number | null)[]; gap: (number | null)[]; best_sectors: (number | null)[]; top_speed_kph: number | null; end?: (number | null)[] };
export type LapIncident = { kind: "SC" | "VSC" | "R" | string; from_lap: number; to_lap: number };
export type Undercut = { attacker: string; defender: string; attacker_lap: number; defender_lap: number; success: boolean };
export type LapDoc = { season: number; round: number; laps: number; status: string[]; incidents: LapIncident[]; drivers: LapDriver[]; undercuts: Undercut[]; clock_offset?: number };

export type TeamPaceDoc = {
  season: number;
  rounds: { round: number; event_name: string; gaps: Record<string, number> }[];
  teams: { name: string; team_color: string | null; races: number; avg_gap_pct: number; first_half_pct: number | null; second_half_pct: number | null }[];
};

/** One driver's fastest lap laid along the circuit: every list has `n` entries, entry k is k/n of the way round. */
export type TelemetryDriver = { code: string; lap: number; time_s: number; t_ms: number[]; speed: number[]; throttle: number[]; brake: number[]; gear: number[]; rpm: number[]; drs: number[] };
export type TelemetryDoc = { season: number; round: number; n: number; source: string; sectors: number[] | null; drivers: TelemetryDriver[] };

/** Where every car was once a second for the whole race, with its sensors. `null` is a hole in the source data. */
export type ReplayDriver = { code: string; f: (number | null)[]; speed: (number | null)[]; throttle: (number | null)[]; brake: (number | null)[]; gear: (number | null)[]; rpm: (number | null)[]; drs: (number | null)[] };
export type ReplayDoc = { season: number; round: number; hz: number; n: number; offset_s: number; source: string; drivers: ReplayDriver[] };

export type IncidentItem = { t: number | null; lap: number | null; kind: string; text: string; drivers: string[] };
export type IncidentDoc = { season: number; round: number; source: string; items: IncidentItem[] };

export type NewsItem = { title: string; link: string; source: string; published: string; summary: string | null };
export type NewsDoc = { fetched_at: string; sources: string[]; items: NewsItem[] };

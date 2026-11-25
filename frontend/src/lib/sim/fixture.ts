import type { SimModel } from "./types";

/** A small, invented model for tests: round numbers so the expected behaviour is easy to read. */
export const MODEL: SimModel = {
  version: "test",
  season: 2026,
  global: {
    offsets: { SOFT: -0.4, MEDIUM: 0, HARD: 0.4 },
    wear_s_per_lap: { SOFT: 0.12, MEDIUM: 0.08, HARD: 0.05 },
    cliff_s_per_lap2: { SOFT: 0, MEDIUM: 0, HARD: 0 },
    fuel_total_s: -3,
    heat_wear_s_per_lap_per_c: 0.0005,
    sc_prob: 0.5,
    rain_prob: 0.1,
  },
  circuits: [
    {
      slug: "testville", name: "Test GP", location: "Testville", country: "TV", laps: 50, base_lap_s: 90, pit_loss_s: 22,
      offsets: { SOFT: -0.4, HARD: 0.4 },
      wear_s_per_lap: { SOFT: 0.12, MEDIUM: 0.08, HARD: 0.05 },
      max_age: { SOFT: 18, MEDIUM: 26, HARD: 38 },
      sc_prob: 0.5, vsc_prob: 0.2, rain_prob: 0.1, sc_laps: 4, overtakes: 40, track_temp_c: 35, races_seen: 5,
    },
  ],
  teams: [
    { name: "Fast", offset_s: -1, color: "#00ff00" },
    { name: "Mid", offset_s: 0, color: "#0000ff" },
    { name: "Slow", offset_s: 1, color: "#ff0000" },
  ],
  drivers: ["A", "B", "C", "D", "E", "F"].map((code, i) => ({
    code, name: `Driver ${code}`, team: ["Fast", "Fast", "Mid", "Mid", "Slow", "Slow"][i], offset_s: (i % 2) * 0.1, color: null, races: 20,
  })),
  wet: {
    intermediate_penalty: 0.12, full_wet_penalty: null, intermediate_races: 6,
    slope_assumed: { SLICK: 0.45, INTERMEDIATE: 0.25, WET: 0.25 },
    best_wetness_assumed: { SLICK: 0, INTERMEDIATE: 0.5, WET: 0.9 },
  },
  modes_assumed: {
    conserve: { label: "Conserve", pace_s: 0.35, wear: 0.8 },
    standard: { label: "Standard", pace_s: 0, wear: 1 },
    push: { label: "Push", pace_s: -0.3, wear: 1.3 },
  },
  cliff_assumed: { after_observed_max_s_per_lap2: 0.012, note: "assumed" },
  card: { seasons: [2026], races: 1, laps: 1, circuits: 1, holdout_races: 1, holdout_laps: 1, rmse_global_s: 0.6, rmse_circuit_s: 0.6, rmse_without_tyre_effects_s: 0.7, method: "test" },
};
export const K = MODEL.circuits[0];

import { describe, expect, it } from "vitest";
import type { DriverRace, RaceDoc } from "../types/api";
import { raceStory } from "./racestory";

const driver = (over: Partial<DriverRace>): DriverRace => ({
  driver_code: "AAA", driver_number: 1, driver_name: "A Driver", team: "Team", team_color: null, finish: 1, classified: true,
  status: "Finished", points: 25, laps_completed: 50, grid: 1, pit_lane_start: false, positions_gained: 0, laps_available: true,
  stops: 1, stops_official: 1, tyre_sequence: null, stints: null, longest_stint: null, consistency_index: null,
  strategy_risk: null, strategy_simulation: null, ...over,
});

const race = (over: Partial<RaceDoc> = {}): RaceDoc => ({
  season: 2024, round: 1, event_name: "Test GP", location: "X", country: null, date: "2024-01-01",
  winner: { driver_code: "AAA", driver_name: "A Driver", team: "Team" },
  drivers: [driver({}), driver({ driver_code: "BBB", driver_name: "B Driver", finish: 2, grid: 9, positions_gained: 7 })],
  derived: { winning_recipe: { typical_stops: 1, common_tyre_sequence: null, avg_longest_stint: null }, style_profile: [], total_laps: 50, safety_car_laps: 3, vsc_laps: 0, red_flag: false },
  weather: { air_temp_c: 20, track_temp_c: 33.4, humidity_pct: 50, rainfall: false },
  quality: { status: "ok", sources: {}, missing: [], warnings: [], notes: [] },
  ...over,
});

describe("raceStory", () => {
  it("tells the facts the data supports", () => {
    expect(raceStory(race())).toEqual([
      "Won by A Driver (Team) from P1, with 1 pit stop.",
      "3 laps run behind the safety car.",
      "Track temperature averaged 33°C.",
      "B Driver made up the most places: 7 positions.",
    ]);
  });

  it("leaves out whatever is unknown instead of guessing", () => {
    const r = race({
      winner: null,
      derived: { winning_recipe: { typical_stops: null, common_tyre_sequence: null, avg_longest_stint: null }, style_profile: [], total_laps: null, safety_car_laps: null, vsc_laps: null, red_flag: null },
      weather: null,
      drivers: [driver({ positions_gained: null })],
    });
    expect(raceStory(r)).toEqual([]);
  });

  it("reports red flags, rain, retirements and pit-lane starts", () => {
    const r = race({
      derived: { winning_recipe: { typical_stops: null, common_tyre_sequence: null, avg_longest_stint: null }, style_profile: [], total_laps: 50, safety_car_laps: 1, vsc_laps: 2, red_flag: true },
      weather: { air_temp_c: 15, track_temp_c: 20, humidity_pct: 90, rainfall: true },
      drivers: [driver({ grid: null, pit_lane_start: true, stops: 2 }), driver({ driver_code: "CCC", classified: false, finish: 18, positions_gained: null })],
    });
    expect(raceStory(r)).toEqual([
      "Won by A Driver (Team) from the pit lane, with 2 pit stops.",
      "The race was red-flagged.",
      "1 lap run behind the safety car.",
      "2 laps under a virtual safety car.",
      "Rain fell during the race.",
      "1 driver did not finish.",
    ]);
  });
});

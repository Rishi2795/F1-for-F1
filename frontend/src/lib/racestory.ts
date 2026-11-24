import type { RaceDoc } from "../types/api";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Short, factual sentences about how a race went, built only from the race's own data.
 *  Anything that is unknown is left out; nothing is inferred beyond what the numbers say. */
export function raceStory(race: RaceDoc): string[] {
  const out: string[] = [];
  const { winner, drivers, derived, weather } = race;

  if (winner) {
    const w = drivers.find((d) => d.driver_code === winner.driver_code);
    const from = w?.grid != null ? ` from P${w.grid}` : w?.pit_lane_start ? " from the pit lane" : "";
    const stops = w?.stops != null ? `, with ${plural(w.stops, "pit stop")}` : "";
    out.push(`Won by ${winner.driver_name} (${winner.team})${from}${stops}.`);
  }

  if (derived.red_flag) out.push("The race was red-flagged.");
  if (derived.safety_car_laps) out.push(`${plural(derived.safety_car_laps, "lap")} run behind the safety car.`);
  if (derived.vsc_laps) out.push(`${plural(derived.vsc_laps, "lap")} under a virtual safety car.`);
  if (weather?.rainfall) out.push("Rain fell during the race.");
  else if (weather?.track_temp_c != null) out.push(`Track temperature averaged ${Math.round(weather.track_temp_c)}°C.`);

  const out_ = drivers.filter((d) => !d.classified).length;
  if (out_ > 0) out.push(`${plural(out_, "driver")} did not finish.`);

  const mover = drivers.filter((d) => d.positions_gained != null).sort((a, b) => (b.positions_gained ?? 0) - (a.positions_gained ?? 0))[0];
  if (mover && (mover.positions_gained ?? 0) >= 3) out.push(`${mover.driver_name} made up the most places: ${plural(mover.positions_gained ?? 0, "position")}.`);

  return out;
}

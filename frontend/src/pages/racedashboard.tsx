import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

/* ================= TYPES ================= */

type DriverResult = {
  driver_code: string;
  team: string;
  grid: number;
  finish: number;
  positions_gained: number;
  stops: number;
  tyre_sequence: string[];
  longest_stint: number;
};

type WinningRecipe = {
  typical_stops: number;
  common_tyre_sequence: string;
  avg_longest_stint: number;
};

type RaceData = {
  season: number;
  round: number;
  event_name: string;
  track: {
    name: string;
    location: string;
  };
  sessions: {
    race: {
      results: DriverResult[];
    };
  };
  derived: {
    winning_recipe: WinningRecipe;
    style_profile: string[];
  };
};

type RaceIndexItem = {
  season: number;
  round: number;
  event_name: string;
  location: string;
};

/* ================= PAGE ================= */

export default function RaceDashboard() {
  const { year = "2023", round } = useParams();

  const [race, setRace] = useState<RaceData | null>(null);
  const [races, setRaces] = useState<RaceIndexItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* -------- Load race list (track selector) -------- */
  useEffect(() => {
    axios
      .get(`${API_URL}/seasons/${year}/races`)
      .then((res) => setRaces(res.data.races))
      .catch(console.error);
  }, [year]);

  /* -------- Load race data -------- */
  useEffect(() => {
    if (!round) return;

    setLoading(true);
    axios
      .get(`${API_URL}/seasons/${year}/races/${round}`)
      .then((res) => setRace(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, round]);

  if (loading || !race) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <p className="mt-10">Loading race data…</p>
      </div>
    );
  }

  const { winning_recipe, style_profile } = race.derived;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">

      {/* ================= TOP BAR ================= */}
<div className="flex items-center justify-between border-b border-slate-800 pb-4">

  {/* App Identity */}
  <div className="flex flex-col">
    <span className="text-xs uppercase tracking-widest text-slate-500">
      F1 Strategy Analysis
    </span>
    <Link
  to="/"
  className="text-lg font-semibold tracking-tight hover:opacity-80 transition"
>
  F1 Strat<span className="text-red-500">Hub</span>
</Link>

  </div>

  {/* Page Context */}
  <div className="text-right">
    <h1 className="text-xl md:text-2xl font-bold">
      {race.event_name}
    </h1>
    <p className="text-xs text-slate-400">
      Race Analysis • {race.track.location} • {race.season}
    </p>
  </div>

</div>


      {/* ================= TRACK SELECTOR ================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">

        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-slate-400">
              Season
            </span>
            <span className="px-3 py-1 rounded-md bg-red-600/20 text-red-400 font-semibold text-sm">
              {year}
            </span>
          </div>

          <div className="text-sm text-slate-400">
            Select Circuit
          </div>
        </div>

        {/* Desktop grid */}
        <div className="hidden sm:grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {races.map((r) => {
            const active = Number(round) === r.round;
            return (
              <Link
                key={r.round}
                to={`/race/${year}/${r.round}`}
                className={`relative px-3 py-2 rounded-md text-xs font-semibold text-center border transition
                  ${
                    active
                      ? "border-red-500 text-red-400 bg-red-600/10"
                      : "border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
              >
                <div className="text-[10px] text-slate-500">
                  R{r.round}
                </div>
                <div className="truncate">{r.event_name}</div>

                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-red-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Mobile dropdown */}
        <div className="sm:hidden">
          <select
            value={round}
            onChange={(e) =>
              window.location.assign(`/race/${year}/${e.target.value}`)
            }
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"
          >
            {races.map((r) => (
              <option key={r.round} value={r.round}>
                Round {r.round} – {r.event_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ================= WINNING RECIPE ================= */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
        <h2 className="text-xl font-semibold mb-3">
          Winning Recipe
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Typical Stops</p>
            <p className="text-lg font-bold">
              {winning_recipe.typical_stops}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Tyre Sequence</p>
            <p className="font-medium">
              {winning_recipe.common_tyre_sequence}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Avg Longest Stint</p>
            <p className="font-medium">
              {winning_recipe.avg_longest_stint} laps
            </p>
          </div>
        </div>
      </div>

      {/* ================= STYLE PROFILE ================= */}
      <div>
        <h3 className="font-semibold mb-2">
          Track Personality
        </h3>
        <div className="flex flex-wrap gap-2">
          {style_profile.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full bg-red-600/20 text-red-400 text-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ================= RESULTS TABLE ================= */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
        <h2 className="text-xl font-semibold mb-4">
          Race Results
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-400 border-b border-slate-700">
              <tr>
                <th className="text-left py-2">Driver</th>
                <th>Grid</th>
                <th>Finish</th>
                <th>Δ</th>
                <th>Stops</th>
                <th>Tyres</th>
              </tr>
            </thead>
            <tbody>
              {race.sessions.race.results.map((d) => (
                <tr
                  key={d.driver_code}
                  className="border-b border-slate-800"
                >
                  <td className="py-2 font-semibold">
                    {d.driver_code}
                    <span className="block text-xs text-slate-400">
                      {d.team}
                    </span>
                  </td>
                  <td className="text-center">{d.grid}</td>
                  <td className="text-center">{d.finish}</td>
                  <td
                    className={`text-center ${
                      d.positions_gained > 0
                        ? "text-green-400"
                        : d.positions_gained < 0
                        ? "text-red-400"
                        : "text-slate-400"
                    }`}
                  >
                    {d.positions_gained}
                  </td>
                  <td className="text-center">{d.stops}</td>
                  <td className="text-center text-xs">
                    {d.tyre_sequence.join(" → ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

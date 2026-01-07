import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

type RaceIndexItem = {
  round: number;
  event_name: string;
  location: string;
};

export default function Home() {
  const navigate = useNavigate();

  const [season, setSeason] = useState(2025);
  const [races, setRaces] = useState<RaceIndexItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchRaces() {
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_URL}/seasons/${season}/races`
        );
        setRaces(res.data.races || res.data);
      } catch (err) {
        console.error(err);
        setRaces([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRaces();
  }, [season]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          F1 Strat<span className="text-red-500">Hub</span>
        </h1>

        {/* SEASON SELECTOR */}
        <select
          value={season}
          onChange={(e) => setSeason(Number(e.target.value))}
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2"
        >
          {[2025, 2024, 2023, 2022, 2021, 2020].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <p className="text-slate-400">Loading races…</p>
      )}

      {!loading && races.length === 0 && (
        <p className="text-slate-400">
          No races found for {season}
        </p>
      )}

      {/* RACE GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {races.map((race) => (
          <button
            key={race.round}
            onClick={() =>
              navigate(`/race/${season}/${race.round}`)
            }
            className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left"
          >
            <div className="text-xs text-slate-400">
              Round {race.round}
            </div>
            <div className="font-semibold mt-1">
              {race.event_name}
            </div>
            <div className="text-xs text-slate-500">
              {race.location}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

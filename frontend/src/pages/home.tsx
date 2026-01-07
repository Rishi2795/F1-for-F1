import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

type RaceIndexItem = {
  round: number;
  event_name: string;
  location: string;
};

const SEASONS: number[] = [2025, 2024, 2023, 2022, 2021, 2020];

export default function Home() {
  const navigate = useNavigate();

  const [season, setSeason] = useState(2025);
  const [races, setRaces] = useState<RaceIndexItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchRaces = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_URL}/seasons/${season}/races`
        );

        const data = res.data?.races ?? res.data ?? [];
        setRaces(data);
      } catch (error) {
        console.error("Failed to fetch races:", error);
        setRaces([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRaces();
  }, [season]);

  return (
    <div className="min-h-screen bg-black text-slate-100 px-6 py-10">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">

        {/* LOGO */}
        <div
          onClick={() => navigate("/")}
          className="text-3xl font-extrabold tracking-tight cursor-pointer hover:opacity-90 transition"
        >
          F1 for <span className="text-red-600">F1</span>
        </div>

        {/* SEASON SELECTOR */}
        <div className="relative w-full sm:w-40">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="
              w-full
              flex items-center justify-between
              bg-neutral-950
              border border-slate-800
              rounded-xl
              px-4 py-2
              text-slate-200
              hover:border-slate-500
              transition
            "
          >
            <span className="font-medium">{season}</span>
            <span
              className={`text-slate-400 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>

          {open && (
            <div
              className="
                absolute right-0 mt-2
                w-full
                rounded-xl
                border border-slate-800
                bg-black
                shadow-xl
                z-20
                overflow-hidden
              "
            >
              {SEASONS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setSeason(y);
                    setOpen(false);
                  }}
                  className={`
                    w-full px-4 py-2 text-left
                    transition
                    hover:bg-neutral-900
                    ${
                      season === y
                        ? "text-red-600 font-semibold"
                        : "text-slate-300"
                    }
                  `}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* STATE */}
      {loading && (
        <p className="text-slate-400">Loading races…</p>
      )}

      {!loading && races.length === 0 && (
        <p className="text-slate-400">
          No races found for {season}
        </p>
      )}

      {/* RACE GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
        {races.map((race) => (
          <button
            key={race.round}
            onClick={() =>
              navigate(`/race/${season}/${race.round}`)
            }
            className="
              p-5
              rounded-2xl
              bg-neutral-950
              border border-slate-800
              text-left
              transition-all duration-300
              hover:-translate-y-1
              hover:border-red-600
              hover:shadow-[0_0_25px_rgba(255,0,0,0.15)]
            "
          >
            <div className="text-xs text-slate-500">
              Round {race.round}
            </div>

            <div className="font-semibold mt-2">
              {race.event_name}
            </div>

            <div className="text-xs text-slate-500 mt-1">
              {race.location}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

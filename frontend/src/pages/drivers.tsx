import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

type Driver = {
  code: string;
  name: string;
  team: string;
  country: string;
  image: string | null;
  rating: number;
  titles: number;
};

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_URL}/drivers`)
      .then((res) => {
        setDrivers(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = drivers.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="text-zinc-500 font-mono text-xs animate-pulse">
          LOADING_DRIVER_DATABASE
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 md:px-8 py-14 text-zinc-200">

      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-10 space-y-4 text-center">

        <h1 className="text-5xl md:text-6xl font-black italic text-white">
          Driver Ratings
        </h1>

        <p className="text-zinc-500 text-sm">
          AI-powered performance intelligence
        </p>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search driver..."
          className="
            w-full max-w-md mx-auto
            bg-black border border-white/10
            px-4 py-3 rounded
            text-sm
            outline-none
            focus:border-red-600
          "
        />

      </div>

      {/* GRID */}
      <div className="
        max-w-7xl mx-auto
        grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5
        gap-5
      ">

        {filtered.map((d) => (
          <DriverCard key={d.code} d={d} />
        ))}

      </div>
    </div>
  );
}


/* ================= CARD ================= */

function DriverCard({ d }: { d: Driver }) {
  return (
    <Link
      to={`/driver/${d.code}`}
      className="
        group relative
        h-[320px]
        rounded-2xl
        overflow-hidden
        bg-black
        shadow-xl
        hover:scale-[1.02]
        transition-all
      "
    >
      {/* IMAGE */}
      <img
        src={d.image || "/drivers/default.png"}
        alt={d.name}
        className="
          absolute inset-0
          w-full h-full
          object-cover
          transition-transform
          duration-700
          group-hover:scale-110
        "
        onError={(e) => {
          e.currentTarget.src = "/drivers/default.png";
        }}
      />

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      {/* RATING BADGE */}
      <div className="
        absolute top-3 left-3 z-20
        bg-black/80 backdrop-blur
        px-3 py-1
        rounded-full
        text-sm font-black text-white
      ">
        {d.rating}
      </div>

      {/* CONTENT */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-20 space-y-2">

        {/* NAME */}
        <h2 className="text-xl font-black text-white leading-tight">
          {d.name}
        </h2>

        {/* TEAM */}
        <p className="text-xs text-zinc-400 uppercase tracking-wide">
          {d.team}
        </p>

        {/* META */}
        <div className="flex justify-between items-center text-[11px] text-zinc-500">

          <span>{d.country}</span>

          {d.titles > 0 && (
            <span className="flex items-center gap-1">
              🏆 {d.titles}
            </span>
          )}

        </div>
      </div>

      {/* HOVER GLOW */}
      <div className="
        absolute inset-0
        opacity-0 group-hover:opacity-100
        bg-red-600/10
        transition
      " />
    </Link>
  );
}

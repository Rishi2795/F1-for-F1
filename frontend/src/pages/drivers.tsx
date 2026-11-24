import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { prefetch } from "../lib/api";
import { ErrorState, Skeleton } from "../components/ui/states";
import { ChampionBadge } from "../components/ui/championbadge";
import type { DriverListEntry } from "../types/api";

export default function Drivers() {
  const { data, error, loading, reload } = useApi<DriverListEntry[]>("/drivers");
  const [search, setSearch] = useState("");
  useDocumentTitle("Drivers");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-14 text-zinc-200 md:px-8">
      <div className="mx-auto mb-10 max-w-7xl space-y-4 text-center">
        <h1 className="text-5xl font-black italic text-white md:text-6xl">Drivers</h1>
        <p className="text-sm text-zinc-400">Every driver on the grid since 2020, from official results and timing data.</p>
        <label className="sr-only" htmlFor="driver-search">
          Search drivers
        </label>
        <input
          id="driver-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search driver…"
          className="mx-auto w-full max-w-md rounded border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-red-600"
        />
      </div>

      {error && <ErrorState error={error} onRetry={reload} />}

      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {loading && Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-[320px] rounded-2xl" />)}
        {filtered.map((d) => (
          <DriverCard key={d.code} d={d} />
        ))}
      </div>
      {!loading && !error && filtered.length === 0 && (
        <p className="text-center text-sm text-zinc-500">No driver matches “{search}”.</p>
      )}
    </div>
  );
}

function DriverCard({ d }: { d: DriverListEntry }) {
  return (
    <Link
      to={`/driver/${d.code}`}
      onMouseEnter={() => prefetch(`/drivers/${d.code}`)}
      className="group relative h-[320px] overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800 to-black shadow-xl transition-all hover:scale-[1.02]"
    >
      {/* No photo is shipped (rights + hotlinks); the code is the avatar. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-8xl font-black italic text-white/10"
      >
        {d.code}
      </span>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      {d.rating !== null && (
        <div title="Driver & car rating (1500 = average)" className="absolute left-3 top-3 z-20 rounded-full bg-black/80 px-3 py-1 text-sm font-black text-white">
          {d.rating}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-20 space-y-2 p-4">
        <h2 className="text-xl font-black leading-tight text-white">{d.name}</h2>
        <p className="text-xs uppercase tracking-wide text-zinc-400">{d.team ?? "—"}</p>
        <div className="flex items-center justify-between text-[11px] text-zinc-400">
          <span>Last raced {d.latest_season}</span>
          {d.titles !== null && d.titles > 0 && <ChampionBadge titles={d.titles} compact />}
        </div>
      </div>
      <div className="absolute inset-0 bg-red-600/10 opacity-0 transition group-hover:opacity-100" />
    </Link>
  );
}

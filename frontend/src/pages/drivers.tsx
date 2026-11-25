import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { prefetch } from "../lib/api";
import { ErrorState, Skeleton } from "../components/ui/states";
import { ChampionBadge } from "../components/ui/championbadge";
import { chip } from "../components/ui/chipstyle";
import type { DriverListEntry } from "../types/api";

type Show = "all" | "grid" | "champions";
const SHOW: { key: Show; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "grid", label: "ON_THE_GRID" },
  { key: "champions", label: "CHAMPIONS" },
];

export default function Drivers() {
  const { data, error, loading, reload } = useApi<DriverListEntry[]>("/drivers");
  const [search, setSearch] = useState("");
  const [show, setShow] = useState<Show>("all");
  useDocumentTitle("Drivers");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const latest = Math.max(0, ...(data ?? []).map((d) => d.latest_season));
    return (data ?? [])
      .filter((d) => show === "all" || (show === "grid" ? d.latest_season === latest : (d.titles ?? 0) > 0))
      .filter((d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
  }, [data, search, show]);

  return (
    <div className="min-h-screen px-5 py-14 text-zinc-200 sm:px-8 lg:px-12">
      <div className="mx-auto mb-10 max-w-7xl space-y-4 text-center">
        <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white md:text-7xl">The <span className="text-red-500">drivers</span></h1>
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
        <div role="group" aria-label="Which drivers" className="flex flex-wrap justify-center gap-2 pt-2">
          {SHOW.map((s) => (
            <button key={s.key} type="button" aria-pressed={show === s.key} onClick={() => setShow(s.key)} className={chip(show === s.key)}>{s.label}</button>
          ))}
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={reload} />}

      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {loading && Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-[320px] rounded-sm" />)}
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
      className="group relative h-[320px] overflow-hidden rounded-sm glass transition-all hover:scale-[1.02]"
    >
      {/* No photo is shipped (rights + hotlinks); the code is the avatar. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center f1-outline text-8xl font-black italic"
      >
        {d.code}
      </span>


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

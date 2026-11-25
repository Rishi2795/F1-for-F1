import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { prefetch } from "../lib/api";
import { ErrorState, Skeleton } from "../components/ui/states";
import { ChampionBadge } from "../components/ui/championbadge";
import { chip } from "../components/ui/chipstyle";
import { readableOnDark } from "../lib/color";
import { useDriverPhotos, type Photo } from "../lib/driverphotos";
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
  const photos = useDriverPhotos();

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

      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
        {loading && Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-sm" />)}
        {filtered.map((d) => (
          <DriverCard key={d.code} d={d} photo={photos[d.code]} />
        ))}
      </div>
      {Object.keys(photos).length > 0 && (
        <details className="mx-auto mt-10 max-w-7xl text-xs text-zinc-500">
          <summary className="cursor-pointer">Photo credits</summary>
          <ul className="mt-2 space-y-1">
            {Object.entries(photos).map(([code, p]) => (
              <li key={code}>
                {code}: © {p.credit}, {p.licenceUrl ? <a href={p.licenceUrl} className="underline" rel="noopener noreferrer">{p.licence}</a> : p.licence}
                {p.source ? <> · <a href={p.source} className="underline" rel="noopener noreferrer">Wikimedia Commons</a></> : null} · resized and cropped
              </li>
            ))}
          </ul>
        </details>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-center text-sm text-zinc-500">No driver matches “{search}”.</p>
      )}
    </div>
  );
}

function DriverCard({ d, photo }: { d: DriverListEntry; photo?: Photo }) {
  const colour = `#${(d.team_color ?? "888888").replace("#", "")}`;
  const text = readableOnDark(colour);
  return (
    <Link
      to={`/driver/${d.code}`}
      onMouseEnter={() => prefetch(`/drivers/${d.code}`)}
      className="group relative block aspect-[3/4] overflow-hidden rounded-sm border border-white/10 bg-[#080808] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--team)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
      style={{ "--team": colour, backgroundImage: `linear-gradient(165deg, ${colour}55 0%, ${colour}18 38%, #050505 78%)` } as CSSProperties}
    >
      {/* the number, huge and outlined: top-right behind a photo, or centred when there is no photo */}
      {d.number !== null && d.number !== undefined && (
        <span
          aria-hidden="true"
          className={`f1-outline absolute font-black italic leading-none ${photo ? "-right-2 top-1 text-[7.5rem] sm:text-[9rem]" : "inset-x-0 top-[8%] text-center text-[8.5rem] sm:text-[10.5rem]"}`}
          style={{ "--stroke": `${colour}${photo ? "66" : "88"}` } as CSSProperties}
        >
          {d.number}
        </span>
      )}
      {photo && <img src={`/drivers/${photo.file}`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: photo.focus ?? "50% 22%" }} />}
      <span className="absolute left-3 top-3 z-10 rounded-sm border border-white/20 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-zinc-200">{d.code}</span>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-10 space-y-1.5 p-3 sm:p-4">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider sm:text-xs" style={{ color: text }}>
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colour }} />
          <span className="truncate">{d.team ?? "—"}</span>
        </p>
        <h2 className="text-lg font-black leading-tight text-white sm:text-xl">{d.name}</h2>
        <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
          <span>{d.latest_season === new Date().getFullYear() || d.latest_season >= 2026 ? `Raced ${d.latest_season}` : `Last raced ${d.latest_season}`}</span>
          {d.titles !== null && d.titles > 0 && <ChampionBadge titles={d.titles} compact />}
        </div>
      </div>
      {photo && <span className="absolute right-1.5 top-1.5 z-10 max-w-[80%] truncate rounded-sm bg-black/60 px-1.5 py-0.5 text-[9px] text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">© {photo.credit}</span>}
    </Link>
  );
}

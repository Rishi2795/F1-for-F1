import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { prefetch } from "../lib/api";
import { ErrorState, Skeleton } from "../components/ui/states";
import type { DataStatus, RaceIndexEntry } from "../types/api";

const STATUS_LABEL: Record<DataStatus, string | null> = {
  ok: null,
  partial: "Partial data",
  missing: "Data unavailable",
  scheduled: "Upcoming",
};

export default function Home() {
  const navigate = useNavigate();
  const seasonsApi = useApi<{ seasons: number[] }>("/seasons");
  const seasons = seasonsApi.data?.seasons ?? [];
  const [picked, setSeason] = useState<number | null>(null);
  const season = picked ?? seasons[0] ?? null;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  useDocumentTitle("Race calendar");
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const racesApi = useApi<{ races: RaceIndexEntry[] }>(season ? `/seasons/${season}/races` : null);
  const loading = seasonsApi.loading || racesApi.loading;
  const error = seasonsApi.error ?? racesApi.error;

  const filteredRaces = useMemo(() => {
    const q = search.toLowerCase();
    return (racesApi.data?.races ?? []).filter(
      (race) => race.event_name.toLowerCase().includes(q) || race.location.toLowerCase().includes(q),
    );
  }, [racesApi.data, search]);

  return (
    <div className="min-h-screen bg-[#020202] text-white antialiased selection:bg-red-600/30">
      
      {/* GLOBAL HEADER */}
      <header className="w-full border-b border-white/[0.08] bg-black/60 sticky top-0 z-50">
  <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4 md:gap-10">
    
    {/* LOGO */}
    <div onClick={() => navigate("/")} className="cursor-pointer shrink-0">
      <h1 className="font-serif italic text-2xl sm:text-3xl tracking-tight leading-none">
        F1<span className="hidden xs:inline text-red-500 font-sans not-italic font-black text-[10px] tracking-[0.3em] ml-2 uppercase">FOR FORMULA 1</span>
      </h1>
    </div>

    {/* SEARCH BAR */}
    <div className="flex-grow max-w-lg relative group">
      <input 
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search races"
        placeholder="Search..."
        className="w-full bg-white text-black rounded-full py-2 px-4 sm:px-6 text-[10px] sm:text-[11px] font-bold tracking-widest uppercase outline-none ring-4 ring-white/5 focus:ring-red-600/20 transition-all placeholder:text-black/40"
      />
    </div>
    
    {/* SEASON PICKER (Now Visible on Mobile) */}
    <button 
      onClick={() => setOpen(!open)}
      aria-label={`Season ${season ?? ""}. Change season`}
      aria-haspopup="dialog"
      aria-expanded={open} 
      className="flex items-center gap-2 sm:gap-4 px-1 sm:px-2 py-1 border-b-2 border-white/10 hover:border-red-600 transition-all group shrink-0"
    >
      <span className="hidden xs:block text-[9px] font-black tracking-[0.2em] uppercase opacity-40 group-hover:opacity-100 transition-opacity">Season</span>
      <span className="text-xs sm:text-sm font-bold">{season ?? "—"}</span>
    </button>
  </div>
</header>

      <div className="max-w-[1400px] mx-auto px-6 py-16">
        
        {/* EDITORIAL HEADING */}
        <div className="mb-14 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-[1px] w-12 bg-red-600" />
            <span className="text-[10px] font-black tracking-[0.5em] uppercase text-red-500">The Calendar</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-serif italic tracking-tighter opacity-90 leading-none">
            Race <span className="font-sans not-italic font-black text-4xl md:text-5xl tracking-tighter">LISTING</span>
          </h2>
        </div>

        {/* DATA GRID */}
        {error && <ErrorState error={error} onRetry={() => { seasonsApi.reload(); racesApi.reload(); }} />}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-5">
          {loading ? (
            [...Array(10)].map((_, i) => <Skeleton key={i} className="h-36 rounded-sm" />)
          ) : (
            filteredRaces.map((race) => {
              const note = STATUS_LABEL[race.data_status];
              const disabled = race.data_status === "scheduled" || race.data_status === "missing";
              return (
                <button
                  key={race.round}
                  disabled={disabled}
                  onClick={() => navigate(`/race/${race.season}/${race.round}`)}
                  onMouseEnter={() => !disabled && prefetch(`/seasons/${race.season}/races/${race.round}`)}
                  onFocus={() => !disabled && prefetch(`/seasons/${race.season}/races/${race.round}`)}
                  className="group relative flex flex-col bg-[#0A0A0A] border border-white/[0.05] rounded-sm p-6 text-left transition-all duration-500 enabled:hover:bg-white enabled:hover:text-black enabled:active:scale-[0.96] disabled:opacity-50"
                >
                  <span className="text-[11px] font-mono font-bold opacity-50 group-enabled:group-hover:text-red-500 group-enabled:group-hover:opacity-100 transition-all mb-8">
                    R{race.round.toString().padStart(2, "0")} · {race.date}
                  </span>

                  <div className="mt-auto">
                    <h3 className="text-xs font-black uppercase tracking-tight leading-[1.1] mb-1 group-enabled:group-hover:translate-x-1 transition-transform">
                      {race.event_name.replace("Grand Prix", "").trim()}
                    </h3>
                    <p className="text-[10px] font-medium opacity-50 uppercase tracking-[0.2em] truncate">
                      {race.location}
                    </p>
                    {race.excitement != null && (
                      <p className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
                        <span aria-hidden="true" className="h-1 w-8 bg-current/20"><span className="block h-full bg-red-600" style={{ width: `${race.excitement * 10}%` }} /></span>
                        <span>WATCH {race.excitement.toFixed(1)}</span>
                      </p>
                    )}
                    {note && <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-red-500">{note}</p>}
                  </div>
                </button>
              );
            })
          )}
        </div>
        {!loading && !error && filteredRaces.length === 0 && (
          <p className="text-sm text-zinc-500">No races match “{search}”.</p>
        )}

        {/* DROPDOWN MENU FOR SEASON (Absolute positioned) */}
        {open && (
          <div role="dialog" aria-modal="true" aria-label="Choose a season" className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/90 animate-in fade-in">
            <div className="max-w-xs w-full grid grid-cols-2 gap-2">
              {seasons.map(y => (
                <button key={y} onClick={() => { setSeason(y); setOpen(false); setSearch(""); }} className={`px-6 py-4 rounded-sm text-xs font-black tracking-widest transition-all ${season === y ? 'bg-red-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
                  {y}
                </button>
              ))}
              <button onClick={() => setOpen(false)} className="col-span-2 mt-4 text-[10px] font-bold uppercase tracking-widest opacity-40">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
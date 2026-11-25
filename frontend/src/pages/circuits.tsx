import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ErrorState, Skeleton } from "../components/ui/states";
import { PageHead } from "../components/ui/pagehead";
import { TrackThumb } from "../components/circuit/trackart";
import type { CircuitIndexEntry } from "../types/api";

export default function Circuits() {
  useDocumentTitle("Circuits");
  const { data, error, loading, reload } = useApi<CircuitIndexEntry[]>("/circuits");
  const [q, setQ] = useState("");
  const shown = useMemo(() => (data ?? []).filter((c) => `${c.name} ${c.location} ${c.country ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())), [data, q]);
  return (
    <div className="min-h-screen px-4 pb-32 pt-16 text-zinc-300 md:px-8">
      <div className="mx-auto max-w-5xl space-y-10">
        <PageHead align="center" kicker="CIRCUITS" title="Know the" accent="track" intro="What usually happens at each circuit: who wins from pole, how much overtaking to expect, how often a safety car comes out. Built from every race since 2020." />
        <label className="block max-w-sm">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">FIND_A_CIRCUIT</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Monza, Spa, Monaco…" className="w-full border border-white/20 bg-black px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-white" />
        </label>
        {loading && <Skeleton className="h-96" />}
        {error && <ErrorState error={error} onRetry={reload} subject="circuits" />}
        <ul className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c, i) => (
            <li key={c.slug} className="f1-rise glass-cell" style={{ "--d": `${Math.min(i, 10) * 30}ms` } as React.CSSProperties}>
              <Link to={`/circuit/${c.slug}`} className="group flex items-start justify-between gap-3 p-5 transition-colors hover:bg-white/[0.04]">
               <span className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{(c.country ?? "").toUpperCase().replace(/\s+/g, "_")}</p>
                <p className="mt-2 text-xl font-black uppercase italic tracking-tighter text-white transition-colors group-hover:text-red-500">{c.location}</p>
                <p className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  <span>{c.races}_{c.races === 1 ? "RACE" : "RACES"}</span>
                  {c.avg_excitement !== null && <span>EXCITEMENT {c.avg_excitement.toFixed(1)}</span>}
                </p>
               </span>
               {c.preview && <TrackThumb points={c.preview} />}
              </Link>
            </li>
          ))}
        </ul>
        {data && shown.length === 0 && <p className="text-zinc-400">No circuit matches “{q}”.</p>}
      </div>
    </div>
  );
}

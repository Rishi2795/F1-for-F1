import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ErrorState, Skeleton } from "../components/ui/states";
import { PageHead } from "../components/ui/pagehead";
import { ScoreBar } from "../components/ui/scorebar";
import { SeasonChips } from "../components/ui/seasonchips";
import { chip } from "../components/ui/chipstyle";
import type { RaceIndexEntry } from "../types/api";

type Order = "excitement" | "calendar";

export default function Watch() {
  useDocumentTitle("Was it worth watching?");
  const seasons = useApi<{ seasons: number[] }>("/seasons").data?.seasons ?? [];
  const [picked, setPicked] = useState<number | null>(null);
  const season = picked ?? (seasons.length ? Math.max(...seasons) : null);
  const races = useApi<{ races: RaceIndexEntry[] }>(season ? `/seasons/${season}/races` : null);
  const [order, setOrder] = useState<Order>("excitement");
  const [reveal, setReveal] = useState(false);

  const rows = useMemo(() => {
    const played = (races.data?.races ?? []).filter((r) => r.excitement != null);
    return order === "excitement" ? [...played].sort((a, b) => (b.excitement as number) - (a.excitement as number)) : played;
  }, [races.data, order]);

  return (
    <div className="min-h-screen px-5 pb-32 pt-16 text-zinc-300 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl space-y-10">
        <PageHead
          align="right"
          kicker="WATCH"
          title="Worth"
          accent="watching?"
          intro="Every race scored 0 to 10 for how eventful it was: real overtakes, a close finish, safety cars, retirements. Skip the processions, find the classics. Winners stay hidden until you ask."
        />

        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          {seasons.length > 0 && season && <SeasonChips seasons={seasons} value={season} onChange={setPicked} />}
          <div role="group" aria-label="Order" className="flex gap-2">
            <button type="button" aria-pressed={order === "excitement"} onClick={() => setOrder("excitement")} className={chip(order === "excitement")}>MOST_EXCITING</button>
            <button type="button" aria-pressed={order === "calendar"} onClick={() => setOrder("calendar")} className={chip(order === "calendar")}>CALENDAR</button>
          </div>
          <button type="button" aria-pressed={reveal} onClick={() => setReveal((v) => !v)} className={chip(reveal)}>{reveal ? "WINNERS_SHOWN" : "SHOW_WINNERS"}</button>
        </div>

        {races.loading && <Skeleton className="h-[480px]" />}
        {races.error && <ErrorState error={races.error} onRetry={races.reload} subject="races" />}
        {races.data && rows.length === 0 && <p className="text-zinc-400">No scored races in {season} yet.</p>}
        <ol className="space-y-px border border-white/10 bg-white/10" aria-label={`Races of ${season}, ${order === "excitement" ? "most exciting first" : "in calendar order"}`}>
          {rows.map((r, i) => (
            <li key={r.round} className="f1-rise glass-cell" style={{ "--d": `${Math.min(i, 12) * 40}ms` } as React.CSSProperties}>
              <Link to={`/race/${r.season}/${r.round}`} className="group grid items-center gap-x-6 gap-y-3 px-5 py-4 transition-colors hover:bg-white/[0.04] md:grid-cols-[2rem_1fr_16rem]">
                <span className="hidden font-mono text-xs text-zinc-500 md:block">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="block text-lg font-black uppercase italic tracking-tighter text-white transition-colors group-hover:text-red-500">{r.event_name.replace(" Grand Prix", "")}</span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    R{r.round} · {r.date}{reveal && r.winner ? ` · WON_BY_${r.winner.toUpperCase().replace(/\s+/g, "_")}` : ""}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {(r.watch_tags ?? []).filter((t) => reveal || !/Tight finish/.test(t)).map((t) => (
                      <span key={t} className="border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-400">{t}</span>
                    ))}
                  </span>
                </span>
                <span className="md:text-right">
                  <ScoreBar value={r.excitement as number} label={`${r.event_name} excitement`} delay={Math.min(i, 12) * 40} hot={(r.excitement as number) >= 7.5} />
                  {r.overtakes != null && <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">{r.overtakes} ON_TRACK_PASSES</span>}
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <p className="text-xs text-zinc-500">
          The score ranks each race against every race since 2020 (5 is typical, 9 is one of the most eventful). It counts passes between cars that did not pit, so pit-stop swaps do not inflate it.
          “Tight finish” is hidden until winners are shown, because it hints at the result.
        </p>
      </div>
    </div>
  );
}

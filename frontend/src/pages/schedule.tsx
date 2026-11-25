import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHead } from "../components/ui/pagehead";
import { ErrorState, Skeleton } from "../components/ui/states";
import { SeasonChips } from "../components/ui/seasonchips";
import { chip } from "../components/ui/chipstyle";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { pct } from "../lib/forecast";
import { countdown, groupByMonth, nextRound, raceStart, sessionTime, weekendRange } from "../lib/schedule";
import { slugify } from "../lib/slug";
import type { NextForecasts, RaceIndexEntry } from "../types/api";

type Filter = "all" | "upcoming" | "done";

/** The calendar: what is next (with a countdown, the weekend timetable in your own time zone and the forecast), then every
 *  round of the season. Finished rounds link to results; nobody's winner is shown here, so the calendar is spoiler-free. */
export default function Schedule() {
  useDocumentTitle("Schedule");
  const seasons = useApi<{ seasons: number[] }>("/seasons");
  const [picked, setPicked] = useState<number | null>(null);
  const season = picked ?? seasons.data?.seasons[0] ?? null;
  const races = useApi<{ races: RaceIndexEntry[] }>(season ? `/seasons/${season}/races` : null);
  const forecasts = useApi<NextForecasts>("/predictions/next");
  const [filter, setFilter] = useState<Filter>("all");
  const zone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";

  const list = races.data?.races ?? [];
  const next = nextRound(list);
  const shown = list.filter((r) => filter === "all" || (filter === "upcoming" ? r.data_status === "scheduled" : r.data_status !== "scheduled"));

  return (
    <div className="min-h-screen pb-32 pt-16 text-zinc-300">
      <div className="page space-y-12">
        <PageHead kicker="CALENDAR" title="The season" accent="schedule" intro="Every round, the weekend timetable in your own time zone, and a forecast for what is still to come." />

        {seasons.data && season && <SeasonChips seasons={seasons.data.seasons} value={season} onChange={(s) => { setPicked(s); setFilter("all"); }} />}
        {(seasons.loading || races.loading) && <Skeleton className="h-96" />}
        {races.error && <ErrorState error={races.error} onRetry={races.reload} subject="schedule" />}

        {next && <NextUp race={next} forecast={forecasts.data?.races.find((f) => f.round === next.round && f.season === next.season)} zone={zone} />}

        {list.length > 0 && (
          <section aria-labelledby="cal-h" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="cal-h" className="text-3xl font-black uppercase italic tracking-tighter text-white">All rounds</h2>
              <div role="group" aria-label="Show" className="flex gap-2">
                {([["all", "ALL"], ["upcoming", "UPCOMING"], ["done", "DONE"]] as const).map(([k, label]) => (
                  <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={`${chip(filter === k)} !px-3`}>{label}</button>
                ))}
              </div>
            </div>
            {groupByMonth(shown).map((m) => (
              <div key={m.key}>
                <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-400">{m.label}</h3>
                <ol className="divide-y divide-white/10 border-y border-white/10">
                  {m.races.map((r) => {
                    const upcoming = r.data_status === "scheduled";
                    const fav = forecasts.data?.races.find((f) => f.round === r.round && f.season === r.season)?.drivers[0];
                    return (
                      <li key={r.round} className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-4 gap-y-1 py-4 sm:grid-cols-[3rem_9rem_1fr_auto] ${r.round === next?.round ? "bg-white/[0.04]" : ""}`}>
                        <span className="font-serif text-2xl text-zinc-400 sm:text-3xl">{String(r.round).padStart(2, "0")}</span>
                        <span className="col-start-2 font-mono text-xs uppercase tracking-widest text-zinc-300 sm:col-start-auto">{weekendRange(r)}</span>
                        <span className="col-span-1 col-start-2 sm:col-start-auto">
                          <span className="block font-bold text-white">{r.event_name}</span>
                          <span className="block text-sm text-zinc-400">{r.location}{r.country ? `, ${r.country}` : ""}</span>
                        </span>
                        <span className="col-start-3 row-span-2 row-start-1 flex flex-col items-end gap-1 text-right sm:col-start-auto sm:row-span-1 sm:row-start-auto">
                          {upcoming ? (
                            <>
                              {r.round === next?.round && <span className="border border-red-500 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-red-400">NEXT</span>}
                              {fav && <span className="text-xs text-zinc-400">{fav.name.split(" ").at(-1)} {pct(fav.win)} to win</span>}
                              <Link to="/forecast" className="font-mono text-[11px] uppercase tracking-widest text-zinc-300 underline-offset-4 hover:text-white hover:underline">Forecast →</Link>
                            </>
                          ) : (
                            <Link to={`/race/${r.season}/${r.round}`} className="font-mono text-[11px] uppercase tracking-widest text-zinc-300 underline-offset-4 hover:text-white hover:underline">Results →</Link>
                          )}
                          <Link to={`/circuit/${slugify(r.location)}`} className="text-xs text-zinc-500 underline-offset-4 hover:text-white hover:underline">Circuit</Link>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
            <p className="text-xs text-zinc-500">{zone ? `Times are shown in your time zone (${zone}). ` : ""}Dates and times come from the official schedule and can change.</p>
          </section>
        )}
      </div>
    </div>
  );
}

function NextUp({ race, forecast, zone }: { race: RaceIndexEntry; forecast?: NextForecasts["races"][number]; zone: string }) {
  const start = raceStart(race);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const left = start ? countdown(start.getTime() - now) : null;
  const top = forecast?.drivers.slice(0, 3) ?? [];
  return (
    <section aria-labelledby="next-h" className="glass grid gap-8 p-6 md:p-8 lg:grid-cols-[1.1fr_0.9fr]" style={{ boxShadow: "inset 3px 0 0 #dc2626" }}>
      <div className="space-y-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-red-500">NEXT_RACE · ROUND {race.round}</p>
          <h2 id="next-h" className="mt-3 text-4xl font-black uppercase italic leading-[0.95] tracking-tighter text-white md:text-6xl">{race.event_name}</h2>
          <p className="mt-2 text-zinc-300">{race.location}{race.country ? `, ${race.country}` : ""} · {weekendRange(race)}</p>
        </div>
        {left && (
          <div role="timer" aria-label={left.over ? "The race has started" : `${left.days} days, ${left.hours} hours and ${left.minutes} minutes to the race`} className="flex gap-3">
            {left.over ? (
              <p className="font-serif text-3xl text-white">Lights out</p>
            ) : (
              ([["Days", left.days], ["Hours", left.hours], ["Min", left.minutes]] as const).map(([k, v]) => (
                <div key={k} className="min-w-[4.5rem] border border-white/15 bg-black/30 px-3 py-2 text-center">
                  <div className="font-serif text-4xl tabular-nums text-white">{String(v).padStart(2, "0")}</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-400">{k}</div>
                </div>
              ))
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <Link to="/forecast" className="inline-flex items-center gap-2 bg-red-500 px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black hover:bg-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Full forecast →</Link>
          <Link to={`/circuit/${slugify(race.location)}`} className="inline-flex items-center border border-white/20 px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:border-white hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">The circuit</Link>
        </div>
      </div>

      <div className="space-y-6">
        {race.sessions && race.sessions.length > 0 ? (
          <div>
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Weekend timetable{zone ? ` · ${zone}` : ""}</h3>
            <ul className="divide-y divide-white/10 border-y border-white/10">
              {race.sessions.map((s) => (
                <li key={s.name} className="flex items-baseline justify-between gap-4 py-2.5">
                  <span className={s.name === "Race" ? "font-bold text-white" : "text-zinc-200"}>{s.name}</span>
                  <time dateTime={s.starts} className="font-mono text-sm tabular-nums text-zinc-300">{sessionTime(s)}</time>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">The session times for this weekend are not published yet.</p>
        )}
        {top.length > 0 && (
          <div>
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Win chance</h3>
            <ol className="space-y-2">
              {top.map((d) => (
                <li key={d.code} className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <span className="flex items-center gap-2 text-white"><span aria-hidden="true" className="h-4 w-1 rounded-full" style={{ backgroundColor: d.team_color ? `#${d.team_color.replace("#", "")}` : "#888" }} />{d.name}</span>
                  <span className="font-mono tabular-nums text-zinc-200">{pct(d.win)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

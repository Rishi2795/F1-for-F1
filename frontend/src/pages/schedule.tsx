import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrackThumb } from "../components/circuit/trackart";
import { PageHead } from "../components/ui/pagehead";
import { SeasonChips } from "../components/ui/seasonchips";
import { StatBoard } from "../components/ui/statboard";
import { ErrorState, Skeleton } from "../components/ui/states";
import { chip } from "../components/ui/chipstyle";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { pct } from "../lib/forecast";
import { countdown, groupByMonth, nextRound, raceStart, sessionTime } from "../lib/schedule";
import { slugify } from "../lib/slug";
import type { CircuitIndexEntry, NextForecasts, RaceIndexEntry } from "../types/api";

type Filter = "all" | "upcoming" | "done";
type Forecast = NextForecasts["races"][number];

const day = (r: RaceIndexEntry) => new Date(`${r.date}T12:00:00`).getDate();
const monthShort = (r: RaceIndexEntry) => new Date(`${r.date}T12:00:00`).toLocaleDateString("en-GB", { month: "short" }).toUpperCase();

/** The calendar: what is next (with a countdown, the weekend timetable in your own time zone and the forecast), then every
 *  round of the season. Finished rounds link to results; nobody's winner is shown here, so the calendar is spoiler-free. */
export default function Schedule() {
  useDocumentTitle("Schedule");
  const seasons = useApi<{ seasons: number[] }>("/seasons");
  const [picked, setPicked] = useState<number | null>(null);
  const season = picked ?? seasons.data?.seasons[0] ?? null;
  const races = useApi<{ races: RaceIndexEntry[] }>(season ? `/seasons/${season}/races` : null);
  const forecasts = useApi<NextForecasts>("/predictions/next");
  const circuits = useApi<CircuitIndexEntry[]>("/circuits");
  const [filter, setFilter] = useState<Filter>("all");
  const zone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";

  const list = races.data?.races ?? [];
  const next = nextRound(list);
  const layout = new Map((circuits.data ?? []).filter((c) => c.preview).map((c) => [c.slug, c.preview as number[][]]));
  const done = list.filter((r) => r.data_status !== "scheduled").length;
  const shown = list.filter((r) => filter === "all" || (filter === "upcoming" ? r.data_status === "scheduled" : r.data_status !== "scheduled"));
  const forecastOf = (r: RaceIndexEntry): Forecast | undefined => forecasts.data?.races.find((f) => f.round === r.round && f.season === r.season);

  return (
    <div className="min-h-screen pb-32 pt-10 text-zinc-300 md:pt-12">
      <div className="page space-y-10">
        <PageHead kicker="CALENDAR" title="The season" accent="schedule" intro="Every round, the weekend timetable in your own time zone, and a forecast for what is still to come." />

        {seasons.data && season && <SeasonChips seasons={seasons.data.seasons} value={season} onChange={(s) => { setPicked(s); setFilter("all"); }} />}
        {(seasons.loading || races.loading) && <Skeleton className="h-96" />}
        {races.error && <ErrorState error={races.error} onRetry={races.reload} subject="schedule" />}

        {list.length > 0 && (
          <StatBoard
            label="Season at a glance"
            items={[
              { label: "Rounds", value: list.length, sub: `in ${season}`, headline: true },
              { label: "Raced", value: done, sub: list.length ? `${Math.round((done / list.length) * 100)}% of the season` : undefined },
              { label: "To go", value: list.length - done, sub: list.length - done === 1 ? "round left" : "rounds left" },
              { label: next ? "Next up" : "Final round", value: next ? next.event_name.replace(" Grand Prix", "") : (list[list.length - 1]?.event_name.replace(" Grand Prix", "") ?? "—"), sub: next ? next.location : "Season complete" },
            ]}
          />
        )}

        {next && <NextUp race={next} forecast={forecastOf(next)} zone={zone} />}

        {list.length > 0 && (
          <section aria-labelledby="cal-h" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="cal-h" className="flex items-center gap-3 text-3xl font-black uppercase italic tracking-tighter text-white">
                <span aria-hidden="true" className="h-3 w-3 bg-red-600" />All rounds
              </h2>
              <div role="group" aria-label="Show" className="flex gap-2">
                {([["all", "ALL"], ["upcoming", "UPCOMING"], ["done", "DONE"]] as const).map(([k, label]) => (
                  <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={`${chip(filter === k)} !px-3`}>{label}</button>
                ))}
              </div>
            </div>

            <div className="grid gap-x-8 gap-y-10 xl:grid-cols-2">
              {groupByMonth(shown).map((m) => (
                <div key={m.key}>
                  <h3 className="mb-3 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-white">
                    {m.label}
                    <span className="rounded-sm border border-white/20 px-1.5 py-0.5 text-[9px] tracking-widest text-zinc-300">{m.races.length} {m.races.length === 1 ? "RACE" : "RACES"}</span>
                    <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-red-600/70 to-white/5" />
                  </h3>
                  <ol className="space-y-2">
                    {m.races.map((r) => {
                      const upcoming = r.data_status === "scheduled";
                      const isNext = r.round === next?.round;
                      const fav = forecastOf(r)?.drivers[0];
                      const thumb = layout.get(slugify(r.location));
                      const rail = isNext ? "border-l-red-500" : upcoming ? "border-l-white/70" : "border-l-white/15";
                      return (
                        <li key={r.round} className={`grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 rounded-sm border border-white/10 border-l-[3px] ${rail} p-3 sm:grid-cols-[auto_auto_1fr_auto] ${isNext ? "bg-red-500/[0.08]" : "bg-white/[0.03]"} ${upcoming || isNext ? "" : "opacity-80"}`}>
                          <div className={`grid h-14 w-14 place-items-center rounded-sm text-center leading-none ${isNext ? "bg-red-500 text-black" : upcoming ? "bg-white text-black" : "border border-white/20 text-zinc-300"}`}>
                            <span className="block">
                              <span className="block font-serif text-2xl">{day(r)}</span>
                              <span className="block font-mono text-[9px] font-bold tracking-widest">{monthShort(r)}</span>
                            </span>
                          </div>
                          <span className="hidden sm:block" aria-hidden="true">{thumb ? <TrackThumb points={thumb} /> : <span className="block h-16 w-16" />}</span>
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">
                              <span className={isNext ? "text-red-400" : "text-zinc-400"}>ROUND {String(r.round).padStart(2, "0")}</span>
                              <span className={`rounded-sm border px-1.5 py-0.5 text-[9px] font-bold tracking-widest ${isNext ? "border-red-500 bg-red-500 text-black" : upcoming ? "border-white/60 text-white" : "border-white/20 text-zinc-400"}`}>{isNext ? "NEXT" : upcoming ? "UPCOMING" : "DONE"}</span>
                            </p>
                            <p className="mt-1 truncate text-lg font-bold text-white">{r.event_name}</p>
                            <p className="truncate text-sm text-zinc-400">{r.location}{r.country ? `, ${r.country}` : ""}</p>
                          </div>
                          <div className="col-start-3 row-span-2 row-start-1 flex flex-col items-end gap-1 text-right sm:col-start-auto sm:row-span-1 sm:row-start-auto">
                            {upcoming ? (
                              <>
                                {fav && <span className="font-mono text-[11px] tabular-nums text-white">{fav.name.split(" ").at(-1)} <span className="text-red-400">{pct(fav.win)}</span></span>}
                                <Link to="/forecast" className="font-mono text-[10px] uppercase tracking-widest text-zinc-300 underline-offset-4 hover:text-white hover:underline">Forecast →</Link>
                              </>
                            ) : (
                              <Link to={`/race/${r.season}/${r.round}`} className="font-mono text-[10px] uppercase tracking-widest text-zinc-300 underline-offset-4 hover:text-white hover:underline">Results →</Link>
                            )}
                            <Link to={`/circuit/${slugify(r.location)}`} className="text-xs text-zinc-500 underline-offset-4 hover:text-white hover:underline">Circuit</Link>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500">{zone ? `Times are shown in your time zone (${zone}). ` : ""}Dates and times come from the official schedule and can change.</p>
          </section>
        )}
      </div>
    </div>
  );
}

function NextUp({ race, forecast, zone }: { race: RaceIndexEntry; forecast?: Forecast; zone: string }) {
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
          <h2 id="next-h" className="mt-3 text-3xl font-black uppercase italic leading-[0.95] tracking-tighter text-white md:text-5xl">{race.event_name}</h2>
          <p className="mt-2 text-zinc-300">{race.location}{race.country ? `, ${race.country}` : ""}</p>
        </div>
        {left && (
          <div role="timer" aria-label={left.over ? "The race has started" : `${left.days} days, ${left.hours} hours and ${left.minutes} minutes to the race`}>
            {left.over ? (
              <p className="font-serif text-3xl text-white">Lights out</p>
            ) : (
              <div className="grid max-w-sm grid-cols-3 gap-px overflow-hidden rounded-sm border border-white/10 bg-white/10">
                {([["Days", left.days, true], ["Hours", left.hours, false], ["Min", left.minutes, false]] as const).map(([k, v, head]) => (
                  <div key={k} className={`px-4 py-3 text-center ${head ? "bg-white text-black" : "glass-cell"}`}>
                    <div className={`font-serif text-4xl tabular-nums ${head ? "text-black" : "text-white"}`}>{String(v).padStart(2, "0")}</div>
                    <div className={`font-mono text-[9px] uppercase tracking-[0.25em] ${head ? "text-zinc-600" : "text-zinc-400"}`}>{k}</div>
                  </div>
                ))}
              </div>
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
                <li key={s.name} className={`flex items-baseline justify-between gap-4 py-2.5 ${s.name === "Race" ? "bg-white/[0.05] px-2" : ""}`}>
                  <span className={s.name === "Race" ? "font-bold text-white" : "text-zinc-200"}>{s.name}</span>
                  <time dateTime={s.starts} className={`font-mono text-sm tabular-nums ${s.name === "Race" ? "text-red-300" : "text-zinc-300"}`}>{sessionTime(s)}</time>
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
              {top.map((d, i) => (
                <li key={d.code} className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <span className="flex items-center gap-2 text-white"><span aria-hidden="true" className="h-4 w-1 rounded-full" style={{ backgroundColor: d.team_color ? `#${d.team_color.replace("#", "")}` : "#888" }} />{d.name}</span>
                  <span className={`font-mono tabular-nums ${i === 0 ? "text-red-300" : "text-zinc-200"}`}>{pct(d.win)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

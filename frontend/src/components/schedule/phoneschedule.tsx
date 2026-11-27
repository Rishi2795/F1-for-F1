import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TrackThumb } from "../circuit/trackart";
import { pct } from "../../lib/forecast";
import { countdown, raceStart } from "../../lib/schedule";
import { slugify } from "../../lib/slug";
import type { NextForecasts, RaceIndexEntry, WeekendSession } from "../../types/api";

type Forecast = NextForecasts["races"][number];

const dayOf = (r: RaceIndexEntry) => new Date(`${r.date}T12:00:00`).getDate();
const monthOf = (r: RaceIndexEntry) => new Date(`${r.date}T12:00:00`).toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
const place = (r: RaceIndexEntry) => `${r.location}${r.country ? `, ${r.country}` : ""}`;

/** The weekend as three short columns (Fri, Sat, Sun), times in the viewer's own time zone. */
function byDay(sessions: WeekendSession[]): { day: string; rows: { name: string; time: string }[] }[] {
  const out = new Map<string, { day: string; rows: { name: string; time: string }[] }>();
  for (const s of sessions) {
    const d = new Date(s.starts);
    const key = d.toLocaleDateString("en-CA"); // local calendar day
    if (!out.has(key)) out.set(key, { day: d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase(), rows: [] });
    out.get(key)!.rows.push({ name: s.name, time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }) });
  }
  return [...out.values()];
}

/** Phones: the next race as a screen of its own (a big countdown and two actions), then the weekend timetable and the odds on one card. */
export function PhoneNext({ race, forecast, zone }: { race: RaceIndexEntry; forecast?: Forecast; zone: string }) {
  const start = raceStart(race);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const left = start ? countdown(start.getTime() - now) : null;
  const top = forecast?.drivers.slice(0, 3) ?? [];
  const days = race.sessions?.length ? byDay(race.sessions) : [];
  return (
    <div className="space-y-3 lg:hidden">
      <section id="next-scene-m" aria-labelledby="next-h-m" className="glass relative flex flex-col gap-6 overflow-hidden p-5" style={{ boxShadow: "inset 3px 0 0 #dc2626" }}>
        <span aria-hidden="true" className="pointer-events-none absolute -right-3 -top-4 select-none font-serif text-[9rem] font-black italic leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.09)]">{String(race.round).padStart(2, "0")}</span>
        <div className="relative">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-red-500">
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            Next race · round {race.round}
          </p>
          <h2 id="next-h-m" className="mt-3 text-[2.1rem] font-black uppercase italic leading-[0.92] tracking-tighter text-white">{race.event_name}</h2>
          <p className="mt-2 text-zinc-300">{place(race)}</p>
        </div>

        {left && (
          <div role="timer" aria-label={left.over ? "The race has started" : `${left.days} days, ${left.hours} hours and ${left.minutes} minutes to the race`} className="relative">
            {left.over ? (
              <p className="font-serif text-4xl text-white">Lights out</p>
            ) : (
              <div className="grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-white/10 bg-white/10">
                {([["Days", left.days, true], ["Hours", left.hours, false], ["Min", left.minutes, false]] as const).map(([k, v, head]) => (
                  <div key={k} className={`px-2 py-4 text-center ${head ? "bg-white text-black" : "glass-cell"}`}>
                    <div className={`font-serif text-5xl tabular-nums ${head ? "text-black" : "text-white"}`}>{String(v).padStart(2, "0")}</div>
                    <div className={`font-mono text-[9px] uppercase tracking-[0.25em] ${head ? "text-zinc-600" : "text-zinc-400"}`}>{k}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="relative grid grid-cols-[1.4fr_1fr] gap-2">
          <Link to="/forecast" className="grid place-items-center bg-red-500 px-4 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black active:bg-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Full forecast →</Link>
          <Link to={`/circuit/${slugify(race.location)}`} className="grid place-items-center border border-white/20 px-4 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white active:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">Circuit</Link>
        </div>
      </section>

      <section aria-label="This weekend" className="glass space-y-5 p-5">
        <div>
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Weekend timetable{zone ? ` · ${zone}` : ""}</h3>
          {days.length > 0 ? (
            <div className="grid gap-px overflow-hidden rounded-sm border border-white/10 bg-white/10" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
              {days.map((d) => (
                <div key={d.day} className="bg-[#0a0a0a] p-3">
                  <p className="font-mono text-[10px] font-bold tracking-[0.25em] text-zinc-500">{d.day}</p>
                  <ul className="mt-2 space-y-3">
                    {d.rows.map((r) => (
                      <li key={r.name} className="leading-tight">
                        <span className={`block font-mono text-lg tabular-nums ${r.name === "Race" ? "text-red-400" : "text-white"}`}>{r.time}</span>
                        <span className={`block text-[11px] ${r.name === "Race" ? "font-bold text-red-300" : "text-zinc-400"}`}>{r.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">The session times for this weekend are not published yet.</p>
          )}
        </div>
        {top.length > 0 && (
          <div>
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Win chance</h3>
            <ol className="space-y-2.5">
              {top.map((d, i) => (
                <li key={d.code}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="text-white">{d.name}</span>
                    <span className={`font-mono tabular-nums ${i === 0 ? "text-red-300" : "text-zinc-300"}`}>{pct(d.win)}</span>
                  </div>
                  <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round(d.win * 100 * 2))}%`, backgroundColor: d.team_color ? `#${d.team_color.replace("#", "")}` : "#ef4444" }} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}

/** Phones: the season as a deck of cards you swipe through, with a strip of round numbers above it that follows you and jumps to a round
 *  when tapped. It opens on the next race. */
export function RoundDeck({ races, next, forecastOf, layout }: { races: RaceIndexEntry[]; next: RaceIndexEntry | null; forecastOf: (r: RaceIndexEntry) => Forecast | undefined; layout: Map<string, number[][]> }) {
  const sorted = useMemo(() => [...races].sort((a, b) => a.round - b.round), [races]);
  const deck = useRef<HTMLOListElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [view, setView] = useState<"cards" | "list">("cards");
  const first = sorted[0]?.round;

  // open on the next race (or the first card when there is none in this list)
  useEffect(() => {
    const el = deck.current;
    if (!el || sorted.length === 0) return;
    const i = Math.max(0, sorted.findIndex((r) => r.round === next?.round));
    const card = el.children[i] as HTMLElement | undefined;
    if (card) el.scrollLeft = card.offsetLeft - (el.clientWidth - card.clientWidth) / 2; // the scroll handler below picks up the new active card
  }, [sorted, next?.round, first]);

  // follow the swipe: the card nearest the middle of the deck is the active one
  useEffect(() => {
    const el = deck.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let gap = Infinity;
      Array.from(el.children).forEach((c, i) => {
        const card = c as HTMLElement;
        const d = Math.abs(card.offsetLeft + card.clientWidth / 2 - mid);
        if (d < gap) { gap = d; best = i; }
      });
      setActive(best);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [sorted]);

  // switching back from the list: land on the card you were last on
  useEffect(() => {
    const el = deck.current;
    const card = el?.children[active] as HTMLElement | undefined;
    if (view === "cards" && el && card) el.scrollLeft = card.offsetLeft - (el.clientWidth - card.clientWidth) / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // keep the lit round number in view in the strip
  useEffect(() => {
    const el = strip.current;
    const b = el?.children[active] as HTMLElement | undefined;
    if (el && b) el.scrollTo({ left: b.offsetLeft - (el.clientWidth - b.clientWidth) / 2, behavior: "smooth" });
  }, [active]);

  const go = (i: number) => {
    const el = deck.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.clientWidth) / 2, behavior: "smooth" });
  };

  if (sorted.length === 0) return <p className="text-sm text-zinc-400 lg:hidden">No rounds to show here.</p>;
  const tab = (on: boolean) => `px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${on ? "bg-white text-black" : "text-zinc-300"} focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600`;
  return (
    <div className="space-y-4 lg:hidden">
      <div role="group" aria-label="How to see the rounds" className="inline-flex divide-x divide-white/15 overflow-hidden rounded-sm border border-white/15">
        <button type="button" aria-pressed={view === "cards"} onClick={() => setView("cards")} className={tab(view === "cards")}>Cards</button>
        <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={tab(view === "list")}>List</button>
      </div>

      {view === "list" && (
        <ol aria-label="All rounds" className="divide-y divide-white/10 overflow-hidden rounded-sm border border-white/10 bg-white/[0.03]">
          {sorted.map((r) => {
            const upcoming = r.data_status === "scheduled";
            const isNext = r.round === next?.round;
            const fav = forecastOf(r)?.drivers[0];
            return (
              <li key={r.round} className={`flex items-center gap-3 p-3 ${isNext ? "bg-red-500/[0.08]" : ""}`}>
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-sm text-center leading-none ${isNext ? "bg-red-500 text-black" : upcoming ? "bg-white text-black" : "border border-white/20 text-zinc-300"}`}>
                  <span>
                    <span className="block font-serif text-lg">{dayOf(r)}</span>
                    <span className="block font-mono text-[8px] font-bold tracking-widest">{monthOf(r)}</span>
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{r.event_name}</p>
                  <p className="truncate font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    R{String(r.round).padStart(2, "0")} · {r.location}
                    {isNext ? <span className="ml-2 text-red-400">NEXT</span> : null}
                  </p>
                </div>
                {upcoming ? (
                  <Link to="/forecast" className="shrink-0 text-right font-mono text-[10px] uppercase tracking-widest text-zinc-300">
                    {fav ? <span className="block text-white">{fav.name.split(" ").at(-1)} <span className="text-red-400">{pct(fav.win)}</span></span> : null}
                    Forecast →
                  </Link>
                ) : (
                  <Link to={`/race/${r.season}/${r.round}`} className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-zinc-200">Results →</Link>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {view === "cards" && <>
      <div ref={strip} role="group" aria-label="Jump to a round" className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden">
        {sorted.map((r, i) => {
          const upcoming = r.data_status === "scheduled";
          const isNext = r.round === next?.round;
          return (
            <button key={r.round} type="button" aria-label={`Round ${r.round}, ${r.event_name}`} aria-current={i === active ? "true" : undefined} onClick={() => go(i)}
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-sm border font-mono text-[11px] font-bold tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 ${
                i === active ? "border-white bg-white text-black" : isNext ? "border-red-500 bg-red-500/20 text-red-300" : upcoming ? "border-white/30 text-zinc-200" : "border-white/10 text-zinc-500"
              }`}>
              {r.round}
            </button>
          );
        })}
      </div>

      <ol ref={deck} aria-label="Rounds, swipe sideways" className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden">
        {sorted.map((r) => {
          const upcoming = r.data_status === "scheduled";
          const isNext = r.round === next?.round;
          const fav = forecastOf(r)?.drivers[0];
          const thumb = layout.get(slugify(r.location));
          return (
            <li key={r.round} className={`relative flex w-[82%] shrink-0 snap-center flex-col gap-4 overflow-hidden rounded-sm border border-white/10 border-l-[3px] p-4 ${isNext ? "border-l-red-500 bg-red-500/[0.08]" : upcoming ? "border-l-white/70 bg-white/[0.04]" : "border-l-white/15 bg-white/[0.03]"}`}>
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em]">
                <span className={isNext ? "text-red-400" : "text-zinc-400"}>Round {String(r.round).padStart(2, "0")}</span>
                <span className={`rounded-sm border px-1.5 py-0.5 text-[9px] font-bold tracking-widest ${isNext ? "border-red-500 bg-red-500 text-black" : upcoming ? "border-white/60 text-white" : "border-white/20 text-zinc-400"}`}>{isNext ? "NEXT" : upcoming ? "UPCOMING" : "DONE"}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-sm text-center leading-none ${isNext ? "bg-red-500 text-black" : upcoming ? "bg-white text-black" : "border border-white/20 text-zinc-300"}`}>
                  <span>
                    <span className="block font-serif text-3xl">{dayOf(r)}</span>
                    <span className="block font-mono text-[9px] font-bold tracking-widest">{monthOf(r)}</span>
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-bold leading-tight text-white">{r.event_name}</p>
                  <p className="mt-1 truncate text-sm text-zinc-400">{place(r)}</p>
                </div>
              </div>
              <div aria-hidden="true" className="grid h-16 place-items-center opacity-70">{thumb ? <TrackThumb points={thumb} /> : null}</div>
              <div className="mt-auto flex items-end justify-between gap-3 border-t border-white/10 pt-3">
                {upcoming ? (
                  <>
                    {fav ? <span className="font-mono text-[11px] tabular-nums text-white">{fav.name.split(" ").at(-1)} <span className="text-red-400">{pct(fav.win)}</span></span> : <span />}
                    <Link to="/forecast" className="font-mono text-[11px] uppercase tracking-widest text-zinc-200 underline-offset-4 hover:underline">Forecast →</Link>
                  </>
                ) : (
                  <>
                    <Link to={`/circuit/${slugify(r.location)}`} className="text-xs text-zinc-500 underline-offset-4 hover:text-white hover:underline">Circuit</Link>
                    <Link to={`/race/${r.season}/${r.round}`} className="font-mono text-[11px] uppercase tracking-widest text-zinc-200 underline-offset-4 hover:underline">Results →</Link>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p aria-hidden="true" className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600">{String(active + 1).padStart(2, "0")} / {String(sorted.length).padStart(2, "0")} · swipe</p>
      </>}
    </div>
  );
}

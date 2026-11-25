import { useState } from "react";
import { chip } from "../ui/chipstyle";
import type { EventKind, RaceEvent } from "../../lib/events";

const FILTERS: { id: "all" | EventKind; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "pit", label: "PITS" },
  { id: "pass", label: "PASSES" },
  { id: "out", label: "OUT" },
  { id: "incident", label: "INCIDENTS" },
];
const MARK: Record<EventKind, { tag: string; tone: string }> = {
  pit: { tag: "PIT", tone: "text-sky-300 border-sky-400/40" },
  pass: { tag: "PASS", tone: "text-emerald-300 border-emerald-400/40" },
  out: { tag: "OUT", tone: "text-red-300 border-red-400/50" },
  incident: { tag: "FLAG", tone: "text-amber-300 border-amber-400/40" },
  classification: { tag: "RESULT", tone: "text-fuchsia-300 border-fuchsia-400/40" },
};
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

type Props = { events: RaceEvent[]; picked: string[]; t: number; onJump: (t: number) => void };

/** What happened in the race, in order: pit stops, passes, retirements and what race control said. Click one to jump the
 *  replay there. With drivers picked on the map, only events involving them are shown. */
export function EventFeed({ events, picked, t, onJump }: Props) {
  const [filter, setFilter] = useState<"all" | EventKind>("all");
  const shown = events.filter((e) => (filter === "all" || e.kind === filter || (filter === "out" && e.kind === "classification")) && (!picked.length || e.drivers.some((d) => picked.includes(d))));
  const now = shown.reduce((n, e, i) => (e.t <= t ? i : n), -1);
  return (
    <div className="glass">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3">
        <h3 className="mr-2 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Race events{picked.length ? ` · ${picked.join(" + ")}` : ""}</h3>
        {FILTERS.map((f) => <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className={`${chip(filter === f.id)} !px-2.5 !py-1`}>{f.label}</button>)}
        <span className="ml-auto font-mono text-[10px] text-zinc-500">{shown.length} events</span>
      </div>
      {shown.length === 0 ? (
        <p className="p-4 text-sm text-zinc-500">Nothing of this kind{picked.length ? " for the selected drivers" : ""}.</p>
      ) : (
        <ol aria-label="Race events" className="max-h-[22rem] overflow-auto">
          {shown.map((e, i) => (
            <li key={`${e.kind}-${e.t}-${e.text}-${i}`}>
              <button type="button" onClick={() => onJump(Math.max(0, e.t - 8))} className={`grid w-full grid-cols-[3.2rem_3.6rem_1fr] items-baseline gap-3 border-t border-white/[0.06] px-3 py-2 text-left first:border-t-0 hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red-600 ${i === now ? "bg-white/[0.08]" : ""}`}>
                <span className="font-mono text-[10px] tabular-nums text-zinc-500">{e.lap ? `L${e.lap}` : clock(e.t)}</span>
                <span className={`border px-1.5 py-0.5 text-center font-mono text-[9px] font-bold tracking-widest ${MARK[e.kind].tone}`}>{MARK[e.kind].tag}</span>
                <span className="text-xs text-zinc-200">{e.text}{e.detail && <span className="block text-[11px] text-zinc-500">{e.detail}</span>}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="border-t border-white/10 px-3 py-2 text-[10px] leading-snug text-zinc-500">Passes are found lap by lap (a car behind at the end of one lap and ahead at the end of the next, with no pit stop or retirement in between), so each is placed at the line. Pit times and results are official.</p>
    </div>
  );
}

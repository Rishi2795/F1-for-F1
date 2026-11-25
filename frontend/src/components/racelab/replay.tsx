import { useEffect, useMemo, useState } from "react";
import { chip } from "../ui/chipstyle";
import { COMPOUND_COLORS } from "../../lib/compounds";
import { readableOnDark } from "../../lib/color";
import { orderAt } from "../../lib/laps";
import type { DriverRace, LapDoc } from "../../types/api";

const FLAG_TEXT: Record<string, string> = { SC: "SAFETY_CAR", VSC: "VIRTUAL_SAFETY_CAR", R: "RED_FLAG", Y: "YELLOW_FLAG", G: "GREEN" };

/** A lap-by-lap replay of the order: who led, on what tyre, how far back, and whether a flag was out. */
export function Replay({ doc, drivers }: { doc: LapDoc; drivers: DriverRace[] }) {
  const [lap, setLap] = useState(1);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setLap((l) => (l >= doc.laps ? l : l + 1)), 450);
    return () => window.clearInterval(id);
  }, [playing, doc.laps]);
  const running = playing && lap < doc.laps;
  const rows = useMemo(() => orderAt(doc, drivers, lap), [doc, drivers, lap]);
  const flag = doc.status[lap - 1] ?? "G";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => { if (lap >= doc.laps) setLap(1); setPlaying((p) => !p); }} className={chip(running)} aria-pressed={running}>{running ? "PAUSE" : lap >= doc.laps ? "REPLAY" : "PLAY"}</button>
        <label className="flex flex-1 items-center gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">LAP_{lap}_OF_{doc.laps}</span>
          <input type="range" min={1} max={doc.laps} value={lap} onChange={(e) => { setPlaying(false); setLap(Number(e.target.value)); }} aria-label="Lap" className="h-2 min-w-[8rem] flex-1 cursor-pointer accent-red-600" />
        </label>
        <span className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] ${flag === "G" ? "border-white/15 text-zinc-500" : flag === "R" ? "border-red-500 text-red-400" : "border-white/60 text-white"}`}>{FLAG_TEXT[flag] ?? flag}</span>
      </div>
      <ol aria-label={`Running order after lap ${lap}`} className="glass">
        {rows.map((r) => (
          <li key={r.code} className="grid grid-cols-[1.5rem_3.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 border-t border-white/[0.06] px-4 py-2 transition-colors first:border-t-0 sm:grid-cols-[2rem_4rem_1fr_9rem]">
            <span className="font-serif text-xl text-white">{r.pos}</span>
            <span className="flex items-center gap-2 font-mono text-xs font-bold text-white"><span aria-hidden="true" className="h-4 w-1 rounded-full" style={{ backgroundColor: readableOnDark(`#${(r.color ?? "888888").replace("#", "")}`) }} />{r.code}</span>
            <span className="flex min-w-0 items-center gap-2 overflow-hidden text-xs text-zinc-400">
              {r.compound && <span aria-hidden="true" className="h-3 w-3 rounded-full border border-black" style={{ backgroundColor: COMPOUND_COLORS[r.compound] ?? "#52525b" }} />}
              <span className="hidden font-mono uppercase tracking-widest sm:inline">{r.compound ?? "?"}{r.age ? ` · TYRE_AGE_${r.age}` : ""}</span>
              <span className="font-mono uppercase tracking-widest sm:hidden">{r.compound?.[0] ?? "?"}{r.age ?? ""}</span>
              {r.pitting && <span className="border border-white/40 px-1.5 font-mono text-[10px] text-white">PIT</span>}
            </span>
            <span className="text-right font-mono text-xs text-zinc-300">{r.gap === null ? "—" : r.pos === 1 ? "LEADER" : `+${r.gap.toFixed(1)}s`}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-zinc-500">The order is read from the timing at the end of each lap. Gaps are time behind the leader; cars a lap down show a gap over a lap time. PIT marks a stop or the lap after it.</p>
    </div>
  );
}

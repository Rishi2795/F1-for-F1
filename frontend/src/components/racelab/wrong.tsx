import { useMemo, useState } from "react";
import { chip } from "../ui/chipstyle";
import { whatWentWrong, type Moment } from "../../lib/wrong";
import type { DriverRace, LapDoc } from "../../types/api";

const KIND: Record<Moment["kind"], string> = { PIT: "PIT_STOP", OFF_PACE: "SLOW_LAP", POSITIONS: "PLACES_LOST", GAP: "GAP_GREW", OUT: "RETIRED", UNDERCUT: "UNDERCUT" };

/** Pick a driver and see where their race slipped away, with a button to watch each moment on the map. */
export function WhereItWentWrong({ doc, drivers, onJump }: { doc: LapDoc; drivers: DriverRace[]; onJump: (time: number) => void }) {
  const choices = drivers.filter((d) => doc.drivers.some((x) => x.code === d.driver_code));
  const biggestFall = [...choices].filter((d) => d.classified && d.grid !== null && d.finish !== null).sort((a, b) => (b.finish as number) - (b.grid as number) - ((a.finish as number) - (a.grid as number)))[0];
  const [code, setCode] = useState(biggestFall?.driver_code ?? choices[0]?.driver_code ?? "");
  const car = choices.find((d) => d.driver_code === code);
  const result = useMemo(() => (code ? whatWentWrong(doc, drivers, code) : null), [doc, drivers, code]);
  if (choices.length === 0) return null;

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Choose a driver to analyse" className="flex flex-wrap gap-2">
        {choices.map((d) => <button key={d.driver_code} type="button" aria-pressed={d.driver_code === code} onClick={() => setCode(d.driver_code)} className={`${chip(d.driver_code === code)} !px-2.5 !py-1`}>{d.driver_code}</button>)}
      </div>
      {car && (
        <p className="max-w-3xl text-lg text-zinc-200" aria-live="polite">
          <b className="text-white">{car.driver_name}</b> started {car.pit_lane_start ? "from the pit lane" : car.grid ? `P${car.grid}` : "unknown"} and {car.classified ? `finished P${car.finish}` : `did not finish (${car.status})`}.
        </p>
      )}
      {!result ? (
        <p className="text-zinc-400">Not enough clean laps for this driver to say where time went.</p>
      ) : (
        <>
          <dl className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-3">
            <div className="glass-cell p-4"><dt className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">IN_THE_PITS</dt><dd className="mt-2 font-serif text-3xl text-white">{result.loss.pits.toFixed(0)}s</dd><dd className="text-xs text-zinc-500">in-laps and out-laps, against normal pace</dd></div>
            <div className="glass-cell p-4"><dt className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">SLOW_LAPS</dt><dd className="mt-2 font-serif text-3xl text-white">{result.loss.offPace.toFixed(0)}s</dd><dd className="text-xs text-zinc-500">{result.loss.offLaps} laps well off their own pace</dd></div>
            <div className="glass-cell p-4"><dt className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">UNDER_FLAGS</dt><dd className="mt-2 font-serif text-3xl text-white">{result.loss.flags.toFixed(0)}s</dd><dd className="text-xs text-zinc-500">slower laps behind a safety car or red flag: shared by the field</dd></div>
          </dl>
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">WHAT_TO_LOOK_AT</p>
            {result.moments.length === 0 ? <p className="text-zinc-300">Nothing stands out: a clean race with no big losses.</p> : (
              <ol className="glass divide-y divide-white/10">
                {result.moments.map((m) => (
                  <li key={`${m.kind}-${m.lap}-${m.text}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="mr-3 border border-white/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-300">{KIND[m.kind]}</span>
                      <span className="font-mono text-xs text-zinc-400">LAP_{m.lap}</span>
                      <span className="mt-1 block text-zinc-200">{m.text}</span>
                    </span>
                    {m.time !== null && <button type="button" onClick={() => onJump(Math.max(0, m.time as number - 25))} className={`${chip(false)} !px-2.5 !py-1`}>WATCH_ON_MAP ↑</button>}
                  </li>
                ))}
              </ol>
            )}
          </div>
          <p className="text-xs text-zinc-500">Time lost is measured against the driver's own typical clean lap, so it shows where they slowed rather than where they were slower than others. Safety-car laps are shown separately because everyone slows. Places lost only count drops of two or more in a lap that was not a pit lap or under a flag.</p>
        </>
      )}
    </div>
  );
}

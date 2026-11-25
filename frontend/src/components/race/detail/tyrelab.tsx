import { useState } from "react";
import { chip } from "../../ui/chipstyle";
import { COMPOUND_COLORS } from "../../../lib/compounds";
import type { DriverRace, DriverStrategy, TyreModel } from "../../../types/api";

const NAMES: Record<string, string> = { SOFT: "Soft", MEDIUM: "Medium", HARD: "Hard" };

/** What this race's tyres did (fuel-corrected), and what other stop plans would have cost on those tyres alone. */
export function TyreLab({ model, lab, drivers }: { model: TyreModel; lab: DriverStrategy[] | null | undefined; drivers: DriverRace[] }) {
  const choices = (lab ?? []).filter((d) => d.options.length > 0 || d.actual);
  const [code, setCode] = useState(choices[0]?.driver_code ?? "");
  const shown = choices.find((d) => d.driver_code === code) ?? choices[0];
  const best = shown?.options.reduce((a, b) => (b.delta_s < a.delta_s ? b : a), shown.options[0]);
  const name = (c: string) => drivers.find((d) => d.driver_code === c)?.driver_name ?? c;
  const slowest = Math.max(...model.compounds.map((c) => c.wear_s_per_lap), 0.01);

  return (
    <div className="grid gap-10 lg:grid-cols-5">
      <div className="min-w-0 space-y-5 lg:col-span-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">WHAT_THE_TYRES_DID</p>
        <ul className="space-y-4">
          {model.compounds.map((c) => (
            <li key={c.compound}>
              <div className="flex items-baseline justify-between">
                <span className="flex items-center gap-2 font-semibold text-white"><span aria-hidden="true" className="h-2.5 w-2.5" style={{ backgroundColor: COMPOUND_COLORS[c.compound] ?? "#52525b" }} />{NAMES[c.compound] ?? c.compound}</span>
                <span className="font-serif text-xl text-white">{c.wear_s_per_lap.toFixed(2)}<span className="ml-1 font-sans text-xs text-zinc-500">s per lap of age</span></span>
              </div>
              <span aria-hidden="true" className="mt-1.5 block h-1 bg-white/10"><span className="f1-grow-x block h-full bg-white" style={{ width: `${(c.wear_s_per_lap / slowest) * 100}%` }} /></span>
              <p className="mt-1 text-xs text-zinc-500">{c.pace_offset_s === 0 ? "the reference tyre" : c.pace_offset_s < 0 ? `${Math.abs(c.pace_offset_s).toFixed(2)}s per lap quicker when new` : `${c.pace_offset_s.toFixed(2)}s per lap slower`} · {c.stints} stints</p>
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-2 gap-px border border-white/10 bg-white/10 text-sm">
          <div className="glass-cell p-3"><dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">FUEL_BURN</dt><dd className="mt-1 font-serif text-xl text-white">{Math.abs(model.fuel_s_per_lap).toFixed(3)}s</dd><dd className="text-xs text-zinc-500">quicker every lap as the car lightens</dd></div>
          <div className="glass-cell p-3"><dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">PIT_STOP_COST</dt><dd className="mt-1 font-serif text-xl text-white">{model.pit_loss_s.toFixed(1)}s</dd><dd className="text-xs text-zinc-500">in-lap and out-lap together</dd></div>
        </dl>
      </div>

      <div className="min-w-0 space-y-5 lg:col-span-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">STRATEGY_WHAT_IF</p>
        {choices.length === 0 ? (
          <p className="text-zinc-400">No driver ran the full distance on known tyres, so there is nothing to compare.</p>
        ) : (
          <>
            <div role="group" aria-label="Choose a driver" className="flex flex-wrap gap-2">
              {choices.map((d) => <button key={d.driver_code} type="button" aria-pressed={d.driver_code === shown?.driver_code} onClick={() => setCode(d.driver_code)} className={chip(d.driver_code === shown?.driver_code)}>{d.driver_code}</button>)}
            </div>
            {shown && (
              <div key={shown.driver_code} className="f1-rise glass p-5">
                <p className="text-lg text-white">{name(shown.driver_code)} ran <b>{shown.actual.replace(/>/g, "→")}</b>.</p>
                {shown.options.length === 0 ? (
                  <p className="mt-3 text-zinc-300">On the tyres alone, no other plan would have been cheaper. A good strategy.</p>
                ) : (
                  <>
                    <p className="mt-3 text-zinc-300">The same tyres could have done it faster with:</p>
                    <ul className="mt-3 divide-y divide-white/10 border border-white/10">
                      {shown.options.map((o) => (
                        <li key={o.label} className="flex items-center justify-between gap-4 px-4 py-3">
                          <span><span className="font-mono text-xs uppercase tracking-widest text-zinc-300">{o.stops}_{o.stops === 1 ? "STOP" : "STOPS"}</span> <span className="ml-2 text-white">{o.label.replace(/>/g, "→")}</span></span>
                          <span className={`font-serif text-xl ${o === best ? "text-red-400" : "text-white"}`}>{o.delta_s.toFixed(1)}s</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
            <p className="text-xs leading-relaxed text-zinc-500">
              A modelled estimate of tyre cost only. It ignores traffic, safety cars, weather and the undercut, so treat the gap as a direction, not a verdict. Fitted on {model.laps_fitted} clean laps; races where the fit looked physically wrong are not shown.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

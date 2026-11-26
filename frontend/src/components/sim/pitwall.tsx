import { chip } from "../ui/chipstyle";
import type { Advice, Option } from "../../lib/sim/advisor";
import type { Compound } from "../../lib/sim/types";
import { Tyre } from "./bits";
import { NAMES } from "./format";

const TYRES: Compound[] = ["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"];
const P = (n: number) => `P${n.toFixed(1)}`;

function OptionRow({ o, best, onDo, suspended }: { o: Option; best: boolean; onDo: (c: Compound | null) => void; suspended: boolean }) {
  const pit = o.action.pit;
  return (
    <li className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-white/10 py-2 first:border-t-0 ${best ? "text-white" : "text-zinc-300"}`}>
      <span className="flex items-center gap-2 text-sm">
        {pit ? <Tyre compound={pit} size={18} /> : <span aria-hidden="true" className="inline-block h-[18px] w-[18px] rounded-full border-2 border-zinc-500" />}
        {o.action.label}
        {best && <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-300">advised</span>}
      </span>
      <span className="text-right font-mono text-xs tabular-nums">
        {P(o.meanPosition)} <span className="text-zinc-400">(P{o.p10}–P{o.p90})</span>
        {o.action.id !== "stay" && <span className={`ml-2 ${o.gain > 0.05 ? "text-emerald-400" : o.gain < -0.05 ? "text-red-400" : "text-zinc-400"}`}>{o.gain >= 0 ? "+" : ""}{o.gain.toFixed(1)}</span>}
      </span>
      {(pit || suspended) && <button type="button" onClick={() => onDo(pit)} className="font-mono text-[10px] uppercase tracking-widest text-zinc-300 underline-offset-4 hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">{suspended ? "Choose" : "Box"}<span className="sr-only"> {o.action.label}</span></button>}
    </li>
  );
}

/** The pit wall's call: what the engineers would do, with the odds. Planning with the fitted model, not a guess. */
export function AdvisorCard({
  advice, thinking, onAsk, onDo, auto, onAuto, suspended,
}: { advice: Advice | null; thinking: boolean; onAsk: () => void; onDo: (c: Compound | null) => void; auto: boolean; onAuto: (v: boolean) => void; suspended: boolean }) {
  return (
    <section aria-label="Pit wall advice" className="glass space-y-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Pit wall</h3>
        <button type="button" onClick={onAsk} disabled={thinking} className={`${chip(false)} !px-3 !py-1.5 disabled:opacity-50`}>{thinking ? "Thinking…" : "Ask now"}</button>
      </div>
      {advice ? (
        <>
          <p className="font-serif text-2xl leading-tight text-white" role="status">{advice.headline}</p>
          <p className="text-sm text-zinc-300">{advice.detail}</p>
          <ul aria-label="Options the pit wall weighed" className="pt-1">
            {advice.options.slice(0, suspended ? 6 : 4).map((o) => <OptionRow key={o.action.id} o={o} best={o === advice.best} onDo={onDo} suspended={suspended} />)}
          </ul>
          <p className="text-[11px] text-zinc-500">Each option was played out {advice.rollouts} times from here with different luck (retirements, safety cars, red flags, rain). Ranges are a good day to a bad one. A guide, not a guarantee.</p>
        </>
      ) : (
        <p className="text-sm text-zinc-400">{thinking ? "Playing out the rest of the race…" : "Ask the pit wall what it would do right now."}</p>
      )}
      <label className="flex items-center gap-2 text-xs text-zinc-300">
        <input type="checkbox" className="h-4 w-4 accent-red-500" checked={auto} onChange={(e) => onAuto(e.target.checked)} />
        Update every lap when paused or at 1×
      </label>
    </section>
  );
}

/** Race control: send out a safety car or VSC, or stop the race. */
export function ControlCard({
  disabled, scLaps, onScLaps, onSc, onVsc, onRed,
}: { disabled: boolean; scLaps: number; onScLaps: (n: number) => void; onSc: () => void; onVsc: () => void; onRed: () => void }) {
  return (
    <section aria-label="Race control" className="glass space-y-3 p-5">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Race control</h3>
      <p className="text-xs text-zinc-400">Test how your race copes. These take effect from the next lap.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={disabled} onClick={onSc} className={`${chip(false)} disabled:opacity-40`}>Safety car</button>
        <label className="sr-only" htmlFor="sc-laps">Safety car laps</label>
        <select id="sc-laps" className="rounded-sm border border-white/15 bg-black/40 px-2 py-2 font-mono text-xs text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600" value={scLaps} onChange={(e) => onScLaps(Number(e.target.value))}>
          {[2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n} laps</option>)}
        </select>
        <button type="button" disabled={disabled} onClick={onVsc} className={`${chip(false)} disabled:opacity-40`}>VSC</button>
        <button type="button" disabled={disabled} onClick={onRed} className="inline-flex items-center gap-2 rounded-sm border border-red-500/70 bg-red-500/10 px-3.5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-red-300 transition-colors hover:bg-red-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-40">Red flag</button>
      </div>
    </section>
  );
}

/** While the race is stopped: change tyres for free, then restart. */
export function RestartPanel({ choice, onChoice, onRestart, current }: { choice: Compound | null; onChoice: (c: Compound | null) => void; onRestart: () => void; current: Compound }) {
  return (
    <section aria-label="Red flag" className="space-y-4 border border-red-500/60 bg-red-500/10 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-red-300">Red flag · the race is stopped</p>
      <p className="text-sm text-zinc-200">The cars are lined up in running order, gaps wiped out. Tyres change for free. The restart is a standing start.</p>
      <div role="group" aria-label="Tyres for the restart" className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={choice === null} onClick={() => onChoice(null)} className={`${chip(choice === null)} !px-3`}>Keep {NAMES[current].toLowerCase()}s</button>
        {TYRES.map((c) => (
          <button key={c} type="button" aria-pressed={choice === c} aria-label={`Fit ${NAMES[c]}`} title={NAMES[c]} onClick={() => onChoice(c)} className={`grid h-11 w-11 place-items-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${choice === c ? "border-white bg-white/15" : "border-white/15 hover:bg-white/10"}`}>
            <Tyre compound={c} size={28} />
          </button>
        ))}
      </div>
      <button type="button" onClick={onRestart} className="bg-red-500 px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black hover:bg-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Restart the race</button>
    </section>
  );
}

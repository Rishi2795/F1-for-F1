import { chip } from "../ui/chipstyle";
import type { Allocation, PlayerRules, SimCircuit, UserEvent } from "../../lib/sim/types";
import { Slider } from "./bits";
import { control, pct0 } from "./format";

const KIND_LABEL: Record<UserEvent["kind"], string> = { sc: "Safety car", vsc: "Virtual safety car", red: "Red flag" };

/** Schedule race control: a safety car, a VSC or a red flag at the laps you choose, or leave it to the circuit's history. */
export function EventsPanel({
  circuit, mode, events, onMode, onChange,
}: { circuit: SimCircuit; mode: "random" | "mine"; events: UserEvent[]; onMode: (m: "random" | "mine") => void; onChange: (e: UserEvent[]) => void }) {
  const add = (kind: UserEvent["kind"]) => {
    const lap = Math.max(2, Math.round(circuit.laps * (kind === "red" ? 0.5 : 0.35)));
    onChange([...events, { id: Date.now() + events.length, kind, lap, laps: kind === "vsc" ? 2 : Math.max(2, Math.round(circuit.sc_laps)) }]);
  };
  const patch = (id: number, p: Partial<UserEvent>) => onChange(events.map((e) => (e.id === id ? { ...e, ...p } : e)));
  return (
    <section aria-labelledby="sim-events" className="glass space-y-5 p-5 md:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="sim-events" className="font-mono text-[11px] uppercase tracking-[0.35em] text-red-400">4 · Race control</h2>
        <div role="group" aria-label="Safety cars and red flags" className="flex gap-2">
          <button type="button" aria-pressed={mode === "random"} onClick={() => onMode("random")} className={chip(mode === "random")}>Random, from history</button>
          <button type="button" aria-pressed={mode === "mine"} onClick={() => onMode("mine")} className={chip(mode === "mine")}>My events</button>
        </div>
      </div>
      {mode === "random" ? (
        <p className="text-sm text-zinc-300">
          Each simulated race draws its own luck from what has happened at {circuit.name}: a safety car in {pct0(circuit.sc_prob)} of races, a VSC in {pct0(circuit.vsc_prob)}, a red flag in {pct0(circuit.red_prob ?? 0.06)}.
          Choose <b className="text-white">My events</b> to decide exactly when they happen.
        </p>
      ) : (
        <>
          <p className="text-sm text-zinc-300">
            Only these happen, in every race. A <b className="text-white">red flag</b> stops the race at the end of its lap: the cars line up again, everyone changes tyres for free, and the restart is a standing start with the gaps wiped out.
          </p>
          {events.length > 0 && (
            <ul aria-label="Scheduled events" className="space-y-2">
              {events.map((e) => (
                <li key={e.id} className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-3 border border-white/10 bg-black/30 p-3 sm:grid-cols-[10rem_7rem_7rem_auto]">
                  <label className="block"><span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-400">Event</span>
                    <select className={control} value={e.kind} onChange={(ev) => patch(e.id, { kind: ev.target.value as UserEvent["kind"] })}>
                      {(Object.keys(KIND_LABEL) as UserEvent["kind"][]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                    </select>
                  </label>
                  <label className="block"><span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-400">{e.kind === "red" ? "After lap" : "From lap"}</span>
                    <input type="number" min={2} max={circuit.laps - 2} className={`${control} font-mono`} value={e.lap} onChange={(ev) => patch(e.id, { lap: Math.max(2, Math.min(circuit.laps - 2, Number(ev.target.value) || 2)) })} />
                  </label>
                  {e.kind !== "red" ? (
                    <label className="block"><span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-400">Laps</span>
                      <input type="number" min={1} max={12} className={`${control} font-mono`} value={e.laps} onChange={(ev) => patch(e.id, { laps: Math.max(1, Math.min(12, Number(ev.target.value) || 1)) })} />
                    </label>
                  ) : <span aria-hidden="true" />}
                  <button type="button" aria-label={`Remove ${KIND_LABEL[e.kind].toLowerCase()} at lap ${e.lap}`} onClick={() => onChange(events.filter((x) => x.id !== e.id))} className="grid h-10 w-10 place-items-center rounded-sm border border-white/15 text-zinc-300 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">×</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => add("sc")} className={chip(false)}>+ Safety car</button>
            <button type="button" onClick={() => add("vsc")} className={chip(false)}>+ Virtual SC</button>
            <button type="button" onClick={() => add("red")} className={chip(false)}>+ Red flag</button>
          </div>
          {events.length === 0 && <p className="text-xs text-zinc-400">Nothing scheduled: a clean race. Add an event to see how the plan copes.</p>}
        </>
      )}
    </section>
  );
}

/** What the team does when nobody is calling the shots, and which tyres the weekend has. */
export function RulesPanel({
  rules, alloc, onRules, onAlloc,
}: { rules: PlayerRules; alloc: Allocation; onRules: (r: PlayerRules) => void; onAlloc: (a: Allocation) => void }) {
  return (
    <details className="border border-white/10 bg-black/20 p-4">
      <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">Team rules and tyre sets</summary>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <label className="flex items-start gap-3 text-sm text-zinc-200">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-red-500" checked={rules.scStops} onChange={(e) => onRules({ ...rules, scStops: e.target.checked })} />
            <span>Take a cheap stop under a safety car or VSC<span className="block text-xs text-zinc-400">Boxing then costs about half as much. The team does it when the tyre is far enough through its stint.</span></span>
          </label>
          {rules.scStops && <Slider label="Only once the tyre is" value={rules.scAt} min={0.3} max={0.9} step={0.05} onChange={(v) => onRules({ ...rules, scAt: v })} format={(v) => `${Math.round(v * 100)}% through`} />}
          <label className="flex items-start gap-3 text-sm text-zinc-200">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-red-500" checked={rules.rainReact} onChange={(e) => onRules({ ...rules, rainReact: e.target.checked })} />
            <span>Switch to wet tyres when it rains<span className="block text-xs text-zinc-400">Turn this off to gamble on staying on slicks.</span></span>
          </label>
          {rules.rainReact && <Slider label="Wait after the rain arrives" value={rules.rainDelay} min={0} max={4} step={1} onChange={(v) => onRules({ ...rules, rainDelay: v })} format={(v) => (v === 0 ? "box at once" : `${v} ${v === 1 ? "lap" : "laps"}`)} />}
        </div>
        <fieldset>
          <legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Sets of tyres for the weekend</legend>
          <div className="grid grid-cols-3 gap-3">
            {(["SOFT", "MEDIUM", "HARD"] as const).map((c) => (
              <label key={c} className="block"><span className="mb-1 block text-xs text-zinc-300">{c[0] + c.slice(1).toLowerCase()}</span>
                <input type="number" min={0} max={6} className={`${control} font-mono`} value={alloc[c]} onChange={(e) => onAlloc({ ...alloc, [c]: Math.max(0, Math.min(6, Number(e.target.value) || 0)) })} />
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-400">A plan cannot use more stints on a compound than it has sets. Mark a stint as a used set to start it with some laps already on it.</p>
        </fieldset>
      </div>
    </details>
  );
}

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { chip } from "../ui/chipstyle";
import { fitPlan, planProblem, previewLaps, type Suggestion } from "../../lib/sim/plan";
import { COMPOUND_COLOR, type Allocation, type Compound, type PlanStint, type SimCircuit, type SimModel, type UserEvent } from "../../lib/sim/types";
import { Tyre } from "./bits";
import { NAMES, control, fmtRace } from "./format";

const ALL: Compound[] = ["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"];

export function PlanBuilder({
  model, circuit, plan, onChange, suggestions, car, trackTemp, alloc, events,
}: {
  model: SimModel; circuit: SimCircuit; plan: PlanStint[]; onChange: (p: PlanStint[]) => void; suggestions: Suggestion[]; car: number; trackTemp: number; alloc: Allocation; events: UserEvent[];
}) {
  const still = useReducedMotion();
  const total = circuit.laps;
  const problem = planProblem(plan, total, alloc);
  const used = plan.reduce((n, s) => n + s.laps, 0);
  const update = (i: number, patch: Partial<PlanStint>) => onChange(plan.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const setLaps = (i: number, laps: number) => {
    // moving a stop shifts the lap into or out of the next stint, so the race length stays right
    const next = plan.map((s) => ({ ...s }));
    const delta = Math.max(1, Math.min(total - (plan.length - 1), laps)) - next[i].laps;
    next[i].laps += delta;
    const after = next[i + 1] ?? next[i - 1];
    if (after) after.laps = Math.max(1, after.laps - delta);
    onChange(fitPlan(next, total));
  };
  const addStop = () => {
    const last = plan[plan.length - 1];
    const half = Math.floor(last.laps / 2);
    if (half < 2) return;
    const other: Compound = last.compound === "HARD" ? "MEDIUM" : "HARD";
    onChange([...plan.slice(0, -1), { ...last, laps: last.laps - half }, { compound: other, laps: half, mode: "standard" }]);
  };
  const removeStint = (i: number) => {
    if (plan.length < 2) return;
    const next = plan.filter((_, j) => j !== i).map((s) => ({ ...s }));
    next[Math.min(i, next.length - 1)].laps += plan[i].laps;
    onChange(next);
  };

  const best = suggestions[0]?.time;
  const laps = useMemo(() => previewLaps(model, circuit, plan, total, car, trackTemp), [model, circuit, plan, total, car, trackTemp]);
  const cleanAir = laps.reduce((n, l) => n + l.time, 0);

  return (
    <div className="space-y-6">
      {suggestions.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Fastest plans on pace alone</p>
          <ul className="flex flex-wrap gap-2">
            {suggestions.slice(0, 4).map((s, i) => (
              <li key={s.plan.map((p) => p.compound[0] + p.laps).join("")}>
                <button type="button" onClick={() => onChange(s.plan.map((p) => ({ ...p })))} className={`${chip(false)} !tracking-[0.15em]`}>
                  <span className="flex items-center gap-1">{s.plan.map((p, j) => <Tyre key={j} compound={p.compound} size={16} />)}</span>
                  <span>{s.stops}-stop</span>
                  <span className="text-zinc-400">{i === 0 ? "fastest" : `+${(s.time - best).toFixed(1)} s`}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Timeline plan={plan} total={total} events={events} />

      <ol aria-label="Stints" className="space-y-3">
        <AnimatePresence initial={false}>
        {plan.map((s, i) => (
          <motion.li
            key={i}
            layout={!still}
            initial={still ? false : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={still ? undefined : { opacity: 0, x: 16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-3 border border-white/10 bg-black/30 p-3 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center lg:grid-cols-[auto_1fr_auto_auto]">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Stint {i + 1}</span>
            <div role="group" aria-label={`Stint ${i + 1} tyre`} className="flex flex-wrap gap-1.5">
              {ALL.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={s.compound === c}
                  aria-label={NAMES[c]}
                  title={NAMES[c]}
                  onClick={() => update(i, { compound: c })}
                  className={`relative grid h-10 w-10 place-items-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${s.compound === c ? "border-white bg-white/10" : "border-transparent hover:bg-white/10"}`}
                >
                  {s.compound === c && !still && <motion.span layoutId={`ring-${i}`} aria-hidden="true" className="absolute h-10 w-10 rounded-full" style={{ boxShadow: `0 0 14px ${COMPOUND_COLOR[c]}88` }} transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
                  <Tyre compound={c} size={26} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" aria-label={`Stint ${i + 1}: one lap shorter`} onClick={() => setLaps(i, s.laps - 1)} className="grid h-9 w-9 place-items-center rounded-sm border border-white/15 text-lg text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">−</button>
              <input aria-label={`Stint ${i + 1} laps`} type="number" min={1} max={total} value={s.laps} onChange={(e) => setLaps(i, Number(e.target.value) || 1)} className={`${control} !w-16 text-center font-mono`} />
              <button type="button" aria-label={`Stint ${i + 1}: one lap longer`} onClick={() => setLaps(i, s.laps + 1)} className="grid h-9 w-9 place-items-center rounded-sm border border-white/15 text-lg text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">+</button>
              <span className="text-xs text-zinc-400">laps</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor={`age-${i}`}>Stint {i + 1} tyre set</label>
              <select id={`age-${i}`} className={`${control} !w-auto`} value={s.startAge ?? 0} onChange={(e) => update(i, { startAge: Number(e.target.value) })}>
                {[[0, "New set"], [4, "Used, 4 laps"], [8, "Used, 8 laps"], [12, "Used, 12 laps"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <label className="sr-only" htmlFor={`mode-${i}`}>Stint {i + 1} engine mode</label>
              <select id={`mode-${i}`} className={`${control} !w-auto`} value={s.mode ?? "standard"} onChange={(e) => update(i, { mode: e.target.value as PlanStint["mode"] })}>
                {Object.entries(model.modes_assumed).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
              </select>
              {plan.length > 1 && <button type="button" onClick={() => removeStint(i)} aria-label={`Remove stint ${i + 1}`} className="grid h-9 w-9 place-items-center rounded-sm border border-white/15 text-zinc-300 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">×</button>}
            </div>
          </motion.li>
        ))}
        </AnimatePresence>
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={addStop} disabled={plan.length >= 5} className={`${chip(false)} disabled:opacity-40`}>+ Add a stop</button>
        <p role={problem ? "alert" : "status"} className={`text-sm ${problem ? "text-amber-300" : "text-zinc-300"}`}>
          {problem ?? `${used} laps · ${plan.length - 1} ${plan.length === 2 ? "stop" : "stops"} · about ${fmtRace(cleanAir)} in clear air`}
        </p>
      </div>

      {!problem && <LapChart laps={laps} pitLoss={circuit.pit_loss_s} />}
    </div>
  );
}

/** Clear-air lap time through the race: the tyre ring colours the line, and a pit lane shows as a spike. */
function LapChart({ laps, pitLoss }: { laps: { time: number; compound: Compound; pit: boolean }[]; pitLoss: number }) {
  const still = useReducedMotion();
  const W = 760;
  const H = 150;
  const times = laps.filter((l) => !l.pit).map((l) => l.time);
  const lo = Math.min(...times) - 0.3;
  const hi = Math.max(...times) + 0.3;
  const x = (i: number) => 8 + (i / Math.max(1, laps.length - 1)) * (W - 16);
  const y = (t: number) => H - 14 - ((Math.min(t, hi) - lo) / (hi - lo)) * (H - 28);
  const legs: { c: Compound; pts: string }[] = [];
  laps.forEach((l, i) => {
    const point = `${x(i).toFixed(1)},${y(l.pit ? l.time - pitLoss : l.time).toFixed(1)}`;
    const last = legs[legs.length - 1];
    if (last && last.c === l.compound) last.pts += ` ${point}`;
    else legs.push({ c: l.compound, pts: point });
  });
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Clear-air lap time through the race for this plan, with tyre changes marked" className="h-auto w-full">
        {[0, 0.5, 1].map((f) => <line key={f} x1="8" x2={W - 8} y1={14 + f * (H - 28)} y2={14 + f * (H - 28)} stroke="#ffffff1a" />)}
        {legs.map((l, i) => <motion.polyline key={`${l.c}-${i}-${l.pts.length}`} points={l.pts} fill="none" stroke={COMPOUND_COLOR[l.c]} strokeWidth="2.5" strokeLinejoin="round" initial={still ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, delay: i * 0.25, ease: "easeOut" }} />)}
        {laps.map((l, i) => l.pit && <line key={i} x1={x(i)} x2={x(i)} y1="6" y2={H - 8} stroke="#ffffff55" strokeDasharray="3 3" />)}
        <text x="8" y="9" fill="#a1a1aa" fontSize="6.5" fontFamily="monospace">{lo.toFixed(1)}–{hi.toFixed(1)} s a lap · dashed lines are stops</text>
      </svg>
    </figure>
  );
}

/** The race as a strip: each stint in its tyre colour, with the scheduled safety cars, VSCs and red flags marked. */
function Timeline({ plan, total, events }: { plan: PlanStint[]; total: number; events: UserEvent[] }) {
  const sum = plan.reduce((n, s) => n + s.laps, 0) || total;
  return (
    <figure>
      <div className="relative h-9 overflow-hidden rounded-sm border border-white/10" role="img" aria-label={`Race plan: ${plan.map((s) => `${s.laps} laps on ${s.compound.toLowerCase()}s`).join(", then ")}`}>
        {plan.map((s, i) => {
          const left = (plan.slice(0, i).reduce((n, x) => n + x.laps, 0) / sum) * 100;
          const width = (s.laps / sum) * 100;
          return (
            <div key={i} className="absolute inset-y-0 flex items-center justify-center font-mono text-[10px] font-bold text-black" style={{ left: `${left}%`, width: `${width}%`, backgroundColor: COMPOUND_COLOR[s.compound], borderRight: "2px solid #000" }}>
              {width > 7 ? `${s.compound[0]} ${s.laps}` : ""}
            </div>
          );
        })}
        {events.map((e) => (
          <span key={e.id} title={`${e.kind === "red" ? "Red flag" : e.kind === "sc" ? "Safety car" : "VSC"} at lap ${e.lap}`} aria-hidden="true" className={`absolute inset-y-0 w-[3px] ${e.kind === "red" ? "bg-red-600" : e.kind === "sc" ? "bg-amber-400" : "bg-yellow-200"}`} style={{ left: `${(e.lap / total) * 100}%`, boxShadow: "0 0 8px currentColor" }} />
        ))}
      </div>
      {events.length > 0 && <figcaption className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">Marks: <span className="text-amber-300">safety car</span> · <span className="text-yellow-100">VSC</span> · <span className="text-red-400">red flag</span></figcaption>}
    </figure>
  );
}

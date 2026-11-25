import { motion, useReducedMotion } from "framer-motion";
import { chip } from "../ui/chipstyle";
import type { Optimisation, Scored } from "../../lib/sim/optimise";
import type { PlanStint } from "../../lib/sim/types";
import { Tyre } from "./bits";
import { pct0 } from "./format";
import { Reveal } from "./fx";

const P = (n: number) => `P${n.toFixed(1)}`;

function PlanChips({ plan }: { plan: PlanStint[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {plan.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <Tyre compound={s.compound} size={18} />
          <span className="sr-only">{s.compound.toLowerCase()}, </span>
          <span className="font-mono text-xs tabular-nums text-zinc-200">{s.laps}</span>
        </span>
      ))}
    </span>
  );
}

/** The best strategy found, when conditions help or hurt it, and what is best if the race goes a particular way. */
export function OptimiserPanel({ data, total, current, onApply }: { data: Optimisation; total: number; current: PlanStint[]; onApply: (plan: PlanStint[]) => void }) {
  const { recommended, yours } = data;
  const gain = yours.summary.meanPosition - recommended.summary.meanPosition;
  const key = (p: PlanStint[]) => JSON.stringify(p.map((s) => [s.compound, s.laps]));
  const same = data.ranked[0] === yours;
  const applied = !same && key(current) === key(recommended.plan);
  return (
    <div className="space-y-8">
      <Reveal>
        <div className="glass relative space-y-4 border-l-2 border-red-500 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-red-400">Best strategy for this race</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="text-2xl text-white"><PlanChips plan={recommended.plan} /></div>
            <p className="font-serif text-4xl text-white">{P(recommended.summary.meanPosition)}</p>
          </div>
          <p className="text-zinc-300" role="status">
            {same
              ? "Your plan is already the best of the options tried across the usual mix of safety cars, red flags and weather."
              : applied
                ? `You have set this plan. It beat the plan you started with by ${gain.toFixed(1)} places on average (${P(yours.summary.meanPosition)} for that one).`
                : `Beats your plan by ${gain.toFixed(1)} ${Math.abs(gain - 1) < 0.05 ? "place" : "places"} on average (${P(yours.summary.meanPosition)} for yours).`}
            {" "}Win {pct0(recommended.summary.win)}, podium {pct0(recommended.summary.podium)}, points {pct0(recommended.summary.points)}.
          </p>
          {!same && !applied && <button type="button" onClick={() => onApply(recommended.plan)} className={chip(true)}>Use this plan</button>}
        </div>
      </Reveal>

      <div className="grid gap-4 md:grid-cols-2">
        <Reveal delay={0.08}>
          <div className="h-full border border-emerald-400/40 bg-emerald-400/[0.06] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-emerald-300">Best case</p>
            <p className="mt-2 text-lg text-white">A safety car around lap {data.bestCase.lap}</p>
            <p className="mt-1 text-sm text-zinc-300">The recommended plan averages <b className="text-white">{P(data.bestCase.meanPosition)}</b> when it comes then: the field bunches up just as you are due to stop.</p>
          </div>
        </Reveal>
        <Reveal delay={0.14}>
          <div className="h-full border border-red-400/40 bg-red-400/[0.06] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-red-300">Worst case</p>
            <p className="mt-2 text-lg text-white">A safety car around lap {data.worstCase.lap}</p>
            <p className="mt-1 text-sm text-zinc-300">Averages <b className="text-white">{P(data.worstCase.meanPosition)}</b> if it comes then: the rivals who have not stopped yet get the cheap stop you just paid for.</p>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.2}><ScanChart scan={data.scScan} best={data.bestCase.lap} worst={data.worstCase.lap} total={total} /></Reveal>

      <Reveal delay={0.26}>
        <div>
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.35em] text-zinc-300">If the race goes a particular way</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <caption className="sr-only">The best plan under different race scenarios, and how yours does</caption>
              <thead><tr className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">
                <th scope="col" className="py-2 pr-3 font-normal">Scenario</th>
                <th scope="col" className="py-2 pr-3 font-normal">Best plan</th>
                <th scope="col" className="py-2 pr-3 text-right font-normal">It finishes</th>
                <th scope="col" className="py-2 text-right font-normal">Yours</th>
              </tr></thead>
              <tbody>
                {data.scenarios.map((r) => (
                  <tr key={r.label} className="border-t border-white/10">
                    <th scope="row" className="py-3 pr-3 font-normal"><span className="block text-white">{r.label}</span><span className="block text-xs text-zinc-400">{r.note}</span></th>
                    <td className="py-3 pr-3">{r.yoursIsBest ? <span className="text-xs text-emerald-300">Yours</span> : <PlanChips plan={r.best.plan} />}</td>
                    <td className="py-3 pr-3 text-right font-mono tabular-nums text-white">{P(r.best.summary.meanPosition)}</td>
                    <td className="py-3 text-right font-mono tabular-nums text-zinc-300">{P(r.yours.meanPosition)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.32}><Ranking ranked={data.ranked} yours={yours} onApply={onApply} /></Reveal>
    </div>
  );
}

function Ranking({ ranked, yours, onApply }: { ranked: Scored[]; yours: Scored; onApply: (p: PlanStint[]) => void }) {
  return (
    <div>
      <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.35em] text-zinc-300">Every plan tried, best first</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-left">
          <caption className="sr-only">Strategies ranked by average finishing position</caption>
          <thead><tr className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">
            <th scope="col" className="py-2 pr-3 font-normal">Plan</th>
            <th scope="col" className="py-2 pr-3 text-right font-normal">Average finish</th>
            <th scope="col" className="py-2 pr-3 text-right font-normal">Win</th>
            <th scope="col" className="py-2 pr-3 text-right font-normal">Points</th>
            <th scope="col" className="py-2 text-right font-normal"><span className="sr-only">Use</span></th>
          </tr></thead>
          <tbody>
            {ranked.map((r, i) => (
              <tr key={r.label} className="border-t border-white/10">
                <td className="py-2.5 pr-3"><PlanChips plan={r.plan} />{r === yours && <span className="ml-3 font-mono text-[9px] uppercase tracking-widest text-red-400">yours</span>}{i === 0 && <span className="ml-3 font-mono text-[9px] uppercase tracking-widest text-emerald-300">best</span>}</td>
                <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-white">{P(r.summary.meanPosition)}</td>
                <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-zinc-300">{pct0(r.summary.win)}</td>
                <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-zinc-300">{pct0(r.summary.points)}</td>
                <td className="py-2.5 text-right">{r !== yours && <button type="button" onClick={() => onApply(r.plan)} className="font-mono text-[10px] uppercase tracking-widest text-zinc-300 underline-offset-4 hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">Use</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Average finish if a safety car comes at each point of the race: tall green is good for you, tall red is bad. */
function ScanChart({ scan, best, worst, total }: { scan: Optimisation["scScan"]; best: number; worst: number; total: number }) {
  const still = useReducedMotion();
  const lo = Math.min(...scan.map((s) => s.meanPosition));
  const hi = Math.max(...scan.map((s) => s.meanPosition));
  const span = Math.max(0.3, hi - lo);
  return (
    <figure>
      <figcaption className="mb-3 font-mono text-[11px] uppercase tracking-[0.35em] text-zinc-300">When a safety car helps you</figcaption>
      <div className="flex h-36 items-end gap-1.5" role="img" aria-label={`Average finish if a safety car comes at different laps. Best around lap ${best}, worst around lap ${worst}.`}>
        {scan.map((s, i) => {
          const h = 18 + (1 - (s.meanPosition - lo) / span) * 82; // better finish is taller
          const tone = s.lap === best ? "bg-emerald-400" : s.lap === worst ? "bg-red-500" : "bg-white/40";
          return (
            <div key={s.lap} className="flex h-full flex-1 flex-col justify-end" title={`Lap ${s.lap}: ${P(s.meanPosition)}`}>
              <motion.span aria-hidden="true" className={`block w-full origin-bottom ${tone}`} style={{ height: `${h}%` }} initial={still ? false : { scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.6, delay: 0.3 + i * 0.03, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="mt-1 flex gap-1.5 font-mono text-[9px] text-zinc-400">
        {scan.map((s) => <span key={s.lap} className="flex-1 text-center">{s.lap}</span>)}
      </div>
      <p className="mt-2 text-xs text-zinc-400">Safety car starting at each lap of {total}; taller is a better finish for your plan. Green is the best timing, red the worst.</p>
    </figure>
  );
}

import { COMPOUND_COLOR } from "../../lib/sim/types";
import type { CarResult } from "../../lib/sim/race";
import type { Summary } from "../../lib/sim/montecarlo";
import { Stat } from "./bits";
import { pct0 } from "./format";

export type WhatIf = { label: string; note: string; summary: Summary };

const place = (n: number) => `P${n.toFixed(1)}`;

export function ResultsPanel({
  mine, reference, referenceLabel, whatIf, runs,
}: { mine: Summary; reference: Summary | null; referenceLabel: string | null; whatIf: WhatIf[]; runs: number }) {
  const delta = reference ? reference.meanPosition - mine.meanPosition : 0;
  const verdict =
    !reference ? null : Math.abs(delta) < 0.15 ? "About level with the fastest plan." : delta > 0 ? `Better than the fastest plan by ${delta.toFixed(1)} places on average.` : `The fastest plan finishes ${(-delta).toFixed(1)} places higher on average.`;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Average finish" value={place(mine.meanPosition)} />
        <Stat label="Win" value={pct0(mine.win)} />
        <Stat label="Podium" value={pct0(mine.podium)} />
        <Stat label="Points" value={pct0(mine.points)} note={`${mine.meanPoints.toFixed(1)} on average`} />
        <Stat label="Did not finish" value={pct0(mine.dnf)} note="mechanical or accident" />
      </div>
      {verdict && <p className="text-lg text-white" role="status">{verdict} <span className="text-sm text-zinc-400">(Compared with {referenceLabel}, same {runs} races of luck.)</span></p>}

      <Histogram finish={mine.finish} reference={reference?.finish ?? null} />

      {whatIf.length > 0 && (
        <div>
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.35em] text-zinc-300">What if the race changes?</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-left">
              <caption className="sr-only">Your plan under different race scenarios</caption>
              <thead><tr className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">
                <th scope="col" className="py-2 pr-3 font-normal">Scenario</th>
                <th scope="col" className="py-2 pr-3 text-right font-normal">Average finish</th>
                <th scope="col" className="py-2 pr-3 text-right font-normal">Win</th>
                <th scope="col" className="py-2 text-right font-normal">Points</th>
              </tr></thead>
              <tbody>
                {whatIf.map((w) => (
                  <tr key={w.label} className="border-t border-white/10">
                    <th scope="row" className="py-3 pr-3 font-normal"><span className="block text-white">{w.label}</span><span className="block text-xs text-zinc-400">{w.note}</span></th>
                    <td className="py-3 pr-3 text-right font-mono tabular-nums text-white">{place(w.summary.meanPosition)}</td>
                    <td className="py-3 pr-3 text-right font-mono tabular-nums text-zinc-200">{pct0(w.summary.win)}</td>
                    <td className="py-3 text-right font-mono tabular-nums text-zinc-200">{pct0(w.summary.points)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Histogram({ finish, reference }: { finish: number[]; reference: number[] | null }) {
  const max = Math.max(0.05, ...finish, ...(reference ?? []));
  return (
    <figure>
      <figcaption className="mb-3 font-mono text-[11px] uppercase tracking-[0.35em] text-zinc-300">Where it finishes</figcaption>
      <div className="flex h-40 items-end gap-1" role="img" aria-label={`Finishing position chances: ${finish.slice(0, 5).map((p, i) => `P${i + 1} ${pct0(p)}`).join(", ")} and so on`}>
        {finish.map((p, i) => (
          <div key={i} className="relative flex h-full flex-1 flex-col justify-end" title={`P${i + 1}: ${pct0(p)}`}>
            {reference && <span aria-hidden="true" className="absolute inset-x-0 border-t-2 border-dashed border-zinc-300/70" style={{ bottom: `${(reference[i] / max) * 100}%` }} />}
            <span aria-hidden="true" className={`block w-full ${i < 3 ? "bg-red-500" : i < 10 ? "bg-white/70" : "bg-white/25"}`} style={{ height: `${Math.max(1, (p / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="mt-1 flex gap-1 font-mono text-[9px] text-zinc-400">
        {finish.map((_, i) => <span key={i} className="flex-1 text-center">{i + 1}</span>)}
      </div>
      <p className="mt-2 text-xs text-zinc-400">Red is the podium, white the points. {reference && "Dashed marks show the fastest plan."}</p>
    </figure>
  );
}

/** One simulated race, drawn: the player's position every lap, tyres underneath, stops marked. */
export function SampleRace({ result, total }: { result: CarResult; total: number }) {
  const W = 760;
  const H = 190;
  const n = Math.max(...result.positions, 22);
  const x = (lap: number) => 10 + ((lap - 1) / Math.max(1, total - 1)) * (W - 20);
  const y = (p: number) => 10 + ((p - 1) / (n - 1)) * (H - 50);
  const path = result.positions.map((p, i) => `${i ? "L" : "M"}${x(i + 1).toFixed(1)},${y(p).toFixed(1)}`).join("");
  return (
    <figure>
      <figcaption className="mb-3 font-mono text-[11px] uppercase tracking-[0.35em] text-zinc-300">One sample race</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Sample race: ${result.name} starts and finishes P${result.positions[result.positions.length - 1] ?? "?"}`} className="h-auto w-full">
        {[1, 5, 10, 15, 20].filter((p) => p <= n).map((p) => <g key={p}><line x1="10" x2={W - 10} y1={y(p)} y2={y(p)} stroke="#ffffff14" /><text x="12" y={y(p) - 3} fill="#a1a1aa" fontSize="6" fontFamily="monospace">P{p}</text></g>)}
        <path d={path} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
        {result.compounds.map((c, i) => <rect key={i} x={x(i + 1) - (W - 20) / total / 2} y={H - 28} width={(W - 20) / total + 0.5} height="8" fill={COMPOUND_COLOR[c]} />)}
        {result.pits.map((lap) => <g key={lap}><line x1={x(lap)} x2={x(lap)} y1="6" y2={H - 28} stroke="#ffffff55" strokeDasharray="3 3" /><text x={x(lap) + 3} y={H - 6} fill="#d4d4d8" fontSize="6.5" fontFamily="monospace">stop {lap}</text></g>)}
      </svg>
    </figure>
  );
}

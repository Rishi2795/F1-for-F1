import { useMemo } from "react";
import { fmtLap } from "../../lib/format";
import { fieldEvolution } from "../../lib/laps";
import type { DriverRace, LapDoc } from "../../types/api";

const W = 920;
const H = 240;
const M = { l: 60, r: 14, t: 12, b: 28 };

/** The field's typical lap time across the race: it falls as the track rubbers in and cars burn fuel, and jumps after flags. */
export function Evolution({ doc, drivers }: { doc: LapDoc; drivers: DriverRace[] }) {
  const pts = useMemo(() => fieldEvolution(doc, drivers), [doc, drivers]);
  if (pts.length < 8) return <p className="text-zinc-400">Not enough green-flag laps to show the evolution.</p>;
  const lo = Math.min(...pts.map((p) => p.time));
  const hi = Math.max(...pts.map((p) => p.time));
  const x = (lap: number) => M.l + ((lap - 1) / Math.max(1, doc.laps - 1)) * (W - M.l - M.r);
  const y = (t: number) => M.t + ((t - lo) / (hi - lo || 1)) * (H - M.t - M.b);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(p.lap).toFixed(1)},${y(p.time).toFixed(1)}`).join(" ");
  return (
    <figure>
      <div tabIndex={0} role="region" aria-label="Track evolution chart (scrolls sideways on small screens)" className="overflow-x-auto glass p-3">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Median lap time of the field falls from ${fmtLap(pts[0].time)} to ${fmtLap(pts.at(-1)?.time)}`} className="w-full min-w-[720px]">
          {doc.status.map((s, i) => (s === "SC" || s === "VSC" || s === "R" ? <rect key={i} x={x(i + 1) - (W - M.l - M.r) / doc.laps / 2} y={M.t} width={(W - M.l - M.r) / doc.laps} height={H - M.t - M.b} fill={s === "R" ? "#dc262655" : "#ffffff22"} /> : null))}
          {[lo, (lo + hi) / 2, hi].map((t) => (
            <g key={t}><line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="#fff" strokeOpacity="0.08" /><text x={M.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" className="fill-zinc-400">{fmtLap(t)}</text></g>
          ))}
          {[1, Math.round(doc.laps / 2), doc.laps].map((n) => <text key={n} x={x(n)} y={H - 8} textAnchor="middle" fontSize="11" className="fill-zinc-400">Lap {n}</text>)}
          <path d={path} fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
      <figcaption className="mt-2 text-xs text-zinc-500">Median clean lap of the field, lap by lap. A line that climbs means laps are getting quicker (the track is improving or cars are getting lighter); sudden drops show restarts, safety cars and weather. Light bands are safety-car laps, red bands red flags.</figcaption>
    </figure>
  );
}

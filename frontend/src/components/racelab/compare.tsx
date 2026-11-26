import { useMemo, useState } from "react";
import { chip } from "../ui/chipstyle";
import { readableOnDark } from "../../lib/color";
import { fmtLap } from "../../lib/format";
import { lapDeltas, quantile } from "../../lib/laps";
import type { DriverRace, LapDoc } from "../../types/api";

const W = 920;
const H = 220;
const M = { l: 52, r: 14, t: 12, b: 26 };

/** Two drivers head to head: lap-by-lap time difference, plus best sectors and top speed. */
export function Compare({ doc, drivers }: { doc: LapDoc; drivers: DriverRace[] }) {
  const finishers = drivers.filter((d) => doc.drivers.some((x) => x.code === d.driver_code));
  const [pair, setPair] = useState<string[]>(finishers.slice(0, 2).map((d) => d.driver_code));
  const toggle = (c: string) => setPair((p) => (p.includes(c) ? p.filter((x) => x !== c) : p.length >= 2 ? [p[1], c] : [...p, c]));
  const [a, b] = pair;
  const deltas = useMemo(() => (a && b ? lapDeltas(doc, drivers, a, b) : []), [doc, drivers, a, b]);
  const A = drivers.find((d) => d.driver_code === a);
  const B = drivers.find((d) => d.driver_code === b);
  const color = (d?: DriverRace) => readableOnDark(`#${(d?.team_color ?? "888888").replace("#", "")}`);
  const median = deltas.length ? quantile(deltas.map((d) => d.delta), 0.5) : null;
  const span = Math.max(1, ...deltas.map((d) => Math.min(Math.abs(d.delta), 3)));
  const x = (lap: number) => M.l + ((lap - 1) / Math.max(1, doc.laps - 1)) * (W - M.l - M.r);
  const y = (v: number) => M.t + ((span - Math.max(-span, Math.min(span, v))) / (2 * span)) * (H - M.t - M.b);
  const ra = doc.drivers.find((d) => d.code === a);
  const rb = doc.drivers.find((d) => d.code === b);
  const rows: [string, number | null | undefined, number | null | undefined, boolean][] = a && b ? [
    ["SECTOR_1", ra?.best_sectors[0], rb?.best_sectors[0], true],
    ["SECTOR_2", ra?.best_sectors[1], rb?.best_sectors[1], true],
    ["SECTOR_3", ra?.best_sectors[2], rb?.best_sectors[2], true],
    ["TOP_SPEED", ra?.top_speed_kph, rb?.top_speed_kph, false],
  ] : [];

  return (
    <div className="space-y-5">
      <div role="group" aria-label="Pick two drivers" className="flex flex-wrap gap-2">
        {finishers.map((d) => <button key={d.driver_code} type="button" aria-pressed={pair.includes(d.driver_code)} onClick={() => toggle(d.driver_code)} className={`${chip(pair.includes(d.driver_code))} !px-2.5 !py-1`}>{d.driver_code}</button>)}
      </div>
      {a && b && A && B ? (
        <>
          <p aria-live="polite" className="max-w-3xl text-lg text-zinc-200">
            {median === null ? "No laps where both ran cleanly." : (
              <>Over {deltas.length} comparable laps, <b className="text-white">{(median < 0 ? A : B).driver_name}</b> was typically <b className="text-white">{Math.abs(median).toFixed(3)}s</b> a lap quicker than {(median < 0 ? B : A).driver_name}.</>
            )}
          </p>
          {deltas.length > 0 && (
            <div tabIndex={0} role="region" aria-label="Lap time difference (scrolls sideways on small screens)" className="overflow-x-auto glass p-3">
              <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Lap time difference between ${a} and ${b}, median ${median?.toFixed(3)} seconds`} className="w-full min-w-[720px]">
                <line x1={M.l} x2={W - M.r} y1={y(0)} y2={y(0)} stroke="#fff" strokeOpacity="0.3" />
                <text x={M.l - 8} y={y(0) + 4} textAnchor="end" fontSize="11" className="fill-zinc-400">level</text>
                <text x={M.l - 8} y={M.t + 10} textAnchor="end" fontSize="11" fill={color(A)}>{a} quicker</text>
                <text x={M.l - 8} y={H - M.b - 2} textAnchor="end" fontSize="11" fill={color(B)}>{b} quicker</text>
                {deltas.map((d) => (
                  <rect key={d.lap} x={x(d.lap) - 2} width="4" y={Math.min(y(0), y(d.delta))} height={Math.max(1, Math.abs(y(d.delta) - y(0)))} fill={d.delta < 0 ? color(A) : color(B)} opacity="0.9" />
                ))}
                {[1, Math.round(doc.laps / 2), doc.laps].map((n) => <text key={n} x={x(n)} y={H - 8} textAnchor="middle" fontSize="11" className="fill-zinc-400">Lap {n}</text>)}
              </svg>
            </div>
          )}
          <dl className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-4">
            {rows.map(([label, va, vb, lowerWins]) => {
              const aWins = va != null && vb != null && (lowerWins ? va < vb : va > vb);
              const bWins = va != null && vb != null && (lowerWins ? vb < va : vb > va);
              const show = (v: number | null | undefined) => (v == null ? "—" : lowerWins ? v.toFixed(3) : `${Math.round(v)}`);
              return (
                <div key={label} className="glass-cell p-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{label}</dt>
                  <dd className="mt-2 flex justify-between font-mono text-lg"><span className={aWins ? "font-bold text-white" : "text-zinc-500"}>{show(va)}</span><span className={bWins ? "font-bold text-white" : "text-zinc-500"}>{show(vb)}</span></dd>
                  <dd className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-500"><span>{a}</span><span>{b}</span></dd>
                </div>
              );
            })}
          </dl>
          <p className="text-xs text-zinc-500">Bars: how much quicker one driver was on each lap both ran cleanly (green flag, no pit lap). Sectors are each driver's best of the race; top speed is the highest speed-trap reading. Median lap: {A.driver_code} {fmtLap(A.median_lap_s)} · {B.driver_code} {fmtLap(B.median_lap_s)}.</p>
        </>
      ) : <p className="text-zinc-400">Choose two drivers.</p>}
    </div>
  );
}

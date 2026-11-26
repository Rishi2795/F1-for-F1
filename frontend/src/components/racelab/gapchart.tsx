import { useMemo, useState } from "react";
import { chip } from "../ui/chipstyle";
import { readableOnDark } from "../../lib/color";
import type { DriverRace, LapDoc } from "../../types/api";

const W = 920;
const H = 340;
const M = { l: 52, r: 56, t: 14, b: 28 };
const FLAG = { SC: "#ffffff22", VSC: "#ffffff12", R: "#dc262655" } as Record<string, string>;

/** How far behind the race leader each chosen car was at the end of every lap. Flags are shaded. */
export function GapChart({ doc, drivers }: { doc: LapDoc; drivers: DriverRace[] }) {
  const finishers = drivers.filter((d) => d.classified && d.finish !== null).sort((a, b) => (a.finish as number) - (b.finish as number));
  const [picked, setPicked] = useState<string[]>(finishers.slice(1, 5).map((d) => d.driver_code));
  const toggle = (code: string) => setPicked((p) => (p.includes(code) ? p.filter((c) => c !== code) : p.length >= 6 ? p : [...p, code]));

  const series = useMemo(
    () =>
      picked
        .map((code) => ({ code, d: drivers.find((x) => x.driver_code === code), gap: doc.drivers.find((x) => x.code === code)?.gap ?? [] }))
        .filter((s) => s.d),
    [picked, doc, drivers],
  );
  const lapsN = doc.laps;
  const peak = Math.max(10, ...series.flatMap((s) => s.gap.filter((g): g is number => g !== null && g < 300)));
  const top = Math.ceil(peak / 10) * 10;
  const x = (lap: number) => M.l + ((lap - 1) / Math.max(1, lapsN - 1)) * (W - M.l - M.r);
  const y = (g: number) => M.t + (Math.min(g, top) / top) * (H - M.t - M.b);
  const ticks = [0, top / 2, top];

  return (
    <figure className="space-y-4">
      <div role="group" aria-label="Drivers to show (up to six)" className="flex flex-wrap gap-2">
        {finishers.map((d) => (
          <button key={d.driver_code} type="button" aria-pressed={picked.includes(d.driver_code)} onClick={() => toggle(d.driver_code)} className={`${chip(picked.includes(d.driver_code))} !px-2.5 !py-1`}>{d.driver_code}</button>
        ))}
      </div>
      <div tabIndex={0} role="region" aria-label="Gap to the leader chart (scrolls sideways on small screens)" className="relative overflow-x-auto glass p-3">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Gap to the leader over ${lapsN} laps for ${series.map((s) => s.code).join(", ")}`} className="w-full min-w-[720px]">
          {doc.status.map((s, i) => (FLAG[s] ? <rect key={i} x={x(i + 1) - (W - M.l - M.r) / lapsN / 2} y={M.t} width={(W - M.l - M.r) / lapsN} height={H - M.t - M.b} fill={FLAG[s]} /> : null))}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="#fff" strokeOpacity="0.08" />
              <text x={M.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" className="fill-zinc-400">{t === 0 ? "leader" : `+${Math.round(t)}s`}</text>
            </g>
          ))}
          {[1, Math.round(lapsN / 2), lapsN].map((n) => <text key={n} x={x(n)} y={H - 8} textAnchor="middle" fontSize="11" className="fill-zinc-400">Lap {n}</text>)}
          {series.map(({ code, d, gap }) => {
            const color = readableOnDark(`#${(d?.team_color ?? "888888").replace("#", "")}`);
            const path = gap.map((g, i) => (g === null || g >= 300 ? null : `${i && gap[i - 1] !== null && (gap[i - 1] as number) < 300 ? "L" : "M"}${x(i + 1).toFixed(1)},${y(g).toFixed(1)}`)).filter(Boolean).join(" ");
            const last = gap.map((g, i) => (g !== null && g < 300 ? i : -1)).reduce((a, b) => Math.max(a, b), -1);
            return (
              <g key={code}>
                <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
                {last >= 0 && <text x={x(last + 1) + 6} y={y(gap[last] as number) + 4} fontSize="11" fontWeight="700" fill={color}>{code}</text>}
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="text-xs text-zinc-500">Seconds behind the race leader at the end of each lap, from when each car crossed the line. Shaded bands are safety-car (light) and red-flag (red) laps. Cars more than five minutes behind are not drawn.</figcaption>
    </figure>
  );
}

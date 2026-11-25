import { useId, useMemo, useState } from "react";
import { readableOnDark } from "../../../lib/color";
import { chip } from "../../ui/chipstyle";
import type { DriverRace } from "../../../types/api";

const W = 920;
const H = 480;
const M = { l: 34, r: 52, t: 14, b: 28 };

/** Position after every lap (lap 0 = the grid). Team colour per line, a teammate is dashed.
 *  Pick a driver in the legend to follow them; the result table below carries the same data as text. */
export function LapChart({ drivers, totalLaps }: { drivers: DriverRace[]; totalLaps: number | null }) {
  const [focus, setFocus] = useState<string | null>(null);
  const clipId = `lap-${useId().replace(/:/g, "")}`;
  const lines = useMemo(() => {
    const seen = new Map<string, number>();
    return drivers
      .filter((d) => d.lap_positions && d.lap_positions.some((p) => p !== null))
      .map((d) => {
        const nth = seen.get(d.team) ?? 0;
        seen.set(d.team, nth + 1);
        const path = [d.grid ?? null, ...(d.lap_positions as (number | null)[])];
        return { d, path, dashed: nth > 0, color: readableOnDark(`#${(d.team_color ?? "888888").replace("#", "")}`) };
      });
  }, [drivers]);
  if (lines.length < 2) return null;

  const laps = Math.max(...lines.map((l) => l.path.length)) - 1;
  const field = Math.max(...lines.map((l) => Math.max(...l.path.filter((p): p is number => p !== null))), drivers.length);
  const x = (n: number) => M.l + (n / Math.max(1, laps)) * (W - M.l - M.r);
  const y = (p: number) => M.t + ((p - 1) / Math.max(1, field - 1)) * (H - M.t - M.b);
  const ticks = [1, 5, 10, 15, 20].filter((p) => p <= field);
  const summary = `Lap chart: position after each of ${totalLaps ?? laps} laps for ${lines.length} drivers.`;

  return (
    <figure className="rounded-sm glass p-4">
      <div role="group" aria-label="Follow a driver" className="mb-3 flex flex-wrap gap-1.5">
        {lines.map(({ d, color, dashed }) => (
          <button
            key={d.driver_code}
            aria-pressed={focus === d.driver_code}
            onClick={() => setFocus((f) => (f === d.driver_code ? null : d.driver_code))}
            className={`${chip(focus === d.driver_code)} !px-2.5 !py-1 !text-xs`}
          >
            <svg width="16" height="6" aria-hidden="true"><line x1="0" x2="16" y1="3" y2="3" stroke={color} strokeWidth="3" strokeDasharray={dashed ? "4 2" : undefined} /></svg>
            {d.driver_code}
          </button>
        ))}
      </div>
      <div tabIndex={0} role="region" aria-label="Lap chart (scrolls sideways on small screens)" className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="w-full min-w-[820px]">
        {ticks.map((p) => (
          <g key={p}>
            <line x1={M.l} x2={W - M.r} y1={y(p)} y2={y(p)} stroke="#fff" strokeOpacity="0.07" />
            <text x={M.l - 8} y={y(p) + 4} textAnchor="end" fontSize="12" className="fill-zinc-400">P{p}</text>
          </g>
        ))}
        {[0, Math.round(laps / 2), laps].map((n) => (
          <text key={n} x={x(n)} y={H - 8} textAnchor="middle" fontSize="12" className="fill-zinc-400">{n === 0 ? "Grid" : `Lap ${n}`}</text>
        ))}
        <defs>
          <clipPath id={clipId}>
            <rect className="f1-reveal" x={0} y={0} width={W} height={H} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
        {lines.map(({ d, path, color, dashed }) => {
          const dim = focus !== null && focus !== d.driver_code;
          const segments: string[] = [];
          let pen = false;
          path.forEach((p, n) => {
            if (p === null) { pen = false; return; }
            segments.push(`${pen ? "L" : "M"}${x(n).toFixed(1)},${y(p).toFixed(1)}`);
            pen = true;
          });
          const lastIndex = path.map((p) => p !== null).lastIndexOf(true);
          const lastPos = path[lastIndex] as number;
          const finished = d.classified; // lapped cars still saw the flag; only retirements get a cross
          return (
            <g key={d.driver_code} opacity={dim ? 0.12 : 1} style={{ transition: "opacity 200ms" }}>
              <path d={segments.join(" ")} fill="none" stroke={color} strokeWidth={focus === d.driver_code ? 3 : 2} strokeDasharray={dashed ? "6 3" : undefined} strokeLinejoin="round" strokeLinecap="round" />
              {finished ? (
                <text x={W - M.r + 8} y={y(lastPos) + 4} fontSize="12" fontWeight="600" fill={color}>{d.driver_code}</text>
              ) : (
                <g stroke={color} strokeWidth="2" strokeLinecap="round">
                  <title>{`${d.driver_code} out after lap ${lastIndex}`}</title>
                  <line x1={x(lastIndex) - 4} x2={x(lastIndex) + 4} y1={y(lastPos) - 4} y2={y(lastPos) + 4} />
                  <line x1={x(lastIndex) - 4} x2={x(lastIndex) + 4} y1={y(lastPos) + 4} y2={y(lastPos) - 4} />
                </g>
              )}
            </g>
          );
        })}
        </g>
      </svg>
      </div>
      <figcaption className="mt-2 text-xs text-zinc-400">Dashed line: a team's second car. ✕: retired.</figcaption>
    </figure>
  );
}

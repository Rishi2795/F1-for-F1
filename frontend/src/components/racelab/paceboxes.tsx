import { useMemo } from "react";
import { readableOnDark } from "../../lib/color";
import { fmtLap } from "../../lib/format";
import { paceBoxes } from "../../lib/laps";
import type { DriverRace, LapDoc } from "../../types/api";

/** The spread of each driver's clean lap times: where the middle half sits (box), the median (tick) and the extremes. */
export function PaceBoxes({ doc, drivers }: { doc: LapDoc; drivers: DriverRace[] }) {
  const boxes = useMemo(() => paceBoxes(doc, drivers), [doc, drivers]);
  if (boxes.length < 2) return <p className="text-zinc-400">Not enough clean laps to show pace.</p>;
  const lo = Math.min(...boxes.map((b) => b.min));
  const hi = Math.max(...boxes.map((b) => b.max));
  const pos = (t: number) => `${((t - lo) / (hi - lo || 1)) * 100}%`;
  return (
    <div>
      <ol aria-label="Pace distribution, quickest median first" className="glass py-2">
        {boxes.map((b) => {
          const d = drivers.find((x) => x.driver_code === b.code);
          const color = readableOnDark(`#${(d?.team_color ?? "888888").replace("#", "")}`);
          return (
            <li key={b.code} className="grid grid-cols-[3rem_1fr_5rem] items-center gap-3 px-4 py-1.5" aria-label={`${b.code}: median ${fmtLap(b.median)}, middle half ${fmtLap(b.q1)} to ${fmtLap(b.q3)}, over ${b.n} laps`}>
              <span className="font-mono text-xs font-bold text-white">{b.code}</span>
              <span aria-hidden="true" className="relative h-4">
                <span className="absolute top-1/2 h-px bg-white/30" style={{ left: pos(b.min), width: `calc(${pos(b.max)} - ${pos(b.min)})` }} />
                <span className="absolute inset-y-0.5" style={{ left: pos(b.q1), width: `calc(${pos(b.q3)} - ${pos(b.q1)})`, backgroundColor: color, opacity: 0.85 }} />
                <span className="absolute inset-y-0 w-0.5 bg-white" style={{ left: pos(b.median) }} />
              </span>
              <span className="text-right font-mono text-xs text-zinc-300">{fmtLap(b.median)}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-zinc-500">Coloured box: the middle half of a driver's clean laps. White tick: the median. Thin line: fastest to slowest clean lap. A narrow box is a consistent driver. Clean means green flag, not lap 1, not a pit lap, and within 107% of their own median.</p>
    </div>
  );
}

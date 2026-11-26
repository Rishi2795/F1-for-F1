import { useState } from "react";
import { readableOnDark } from "../../../lib/color";
import { fmtLap } from "../../../lib/format";
import type { DriverRace } from "../../../types/api";

/** Race pace as columns, quickest on the left. Height = time lost per lap to the quickest driver,
 *  measured on clean green-flag laps. Hover or focus a column for the detail. */
export function PaceColumns({ drivers }: { drivers: DriverRace[] }) {
  const rows = drivers.filter((d) => d.pace_rank != null && d.pace_gap_s != null).sort((a, b) => (a.pace_rank as number) - (b.pace_rank as number));
  const [active, setActive] = useState(0);
  if (rows.length < 2) return null;
  const worst = Math.max(...rows.map((d) => d.pace_gap_s as number), 0.001);
  const shown = rows[Math.min(active, rows.length - 1)];
  const gap = (d: DriverRace) => (d.pace_gap_s === 0 ? "quickest" : `+${(d.pace_gap_s as number).toFixed(3)}s per lap`);

  return (
    <div className="rounded-sm glass p-4 sm:p-6">
      <p aria-live="polite" className="mb-6 min-h-[3rem] sm:min-h-[2.5rem]">
        <span className="text-lg font-extrabold tracking-tight text-white">{shown.driver_name}</span>
        <span className="block font-mono text-sm text-zinc-400">
          {gap(shown)} · typical lap {fmtLap(shown.median_lap_s)} · rank {shown.pace_rank} of {rows.length}
        </span>
      </p>
      <div role="group" aria-label="Race pace by driver, quickest first" className="grid items-end gap-1 sm:gap-1.5" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
        {rows.map((d, i) => {
          const color = readableOnDark(`#${(d.team_color ?? "888888").replace("#", "")}`);
          const on = i === active;
          return (
            <button
              key={d.driver_code}
              type="button"
              aria-label={`${d.driver_name}, ${gap(d)}, typical lap ${fmtLap(d.median_lap_s)}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className="group flex h-48 flex-col justify-end rounded-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 sm:h-56"
            >
              <span
                aria-hidden="true"
                className="f1-grow-y block w-full rounded-t-sm transition-[opacity,filter] duration-200"
                style={{ height: `${Math.max(3, ((d.pace_gap_s as number) / worst) * 100)}%`, backgroundColor: color, opacity: on ? 1 : 0.55, filter: on ? "none" : "saturate(0.8)", "--d": `${i * 35}ms` } as React.CSSProperties}
              />
            </button>
          );
        })}
      </div>
      <div aria-hidden="true" className="mt-2 grid gap-1 border-t border-white/10 pt-2 sm:gap-1.5" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
        {rows.map((d, i) => (
          <span key={d.driver_code} className={`text-center font-mono text-[9px] transition-colors duration-200 sm:text-[11px] ${i === active ? "font-bold text-white" : "text-zinc-500"}`}>
            {d.driver_code}
          </span>
        ))}
      </div>
      <p className="mt-4 text-xs text-zinc-500">Taller bar = slower. Typical lap is the median of clean green-flag laps, so pit laps, safety cars and traffic are left out.</p>
    </div>
  );
}

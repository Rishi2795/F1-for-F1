import type { CSSProperties } from "react";
import { COMPOUND_COLORS } from "../../../lib/compounds";
import { fmt } from "../../../lib/format";
import type { DriverRace } from "../../../types/api";

const UNKNOWN = "#52525b";
const NAMES: Record<string, string> = { SOFT: "Soft", MEDIUM: "Medium", HARD: "Hard", INTERMEDIATE: "Intermediate", WET: "Wet" };

/** Every driver's race as one strip across the laps: tyre stints coloured by compound, pit stops marked.
 *  Replaces a stops table and a per-driver strategy list. */
export function StrategyChart({ drivers, totalLaps }: { drivers: DriverRace[]; totalLaps: number | null }) {
  const rows = drivers.filter((d) => d.stints && d.stints.length > 0);
  if (rows.length === 0) return null;
  const laps = totalLaps ?? Math.max(...rows.flatMap((d) => (d.stints ?? []).map((s) => s.lap_end)));
  const pct = (lap: number) => `${(lap / laps) * 100}%`;
  const timed = rows.flatMap((d) => (d.pit_stops ?? []).map((p) => p.duration_s).filter((v): v is number => v !== null));
  const quickest = timed.length ? Math.min(...timed) : null;
  const used = [...new Set(rows.flatMap((d) => (d.stints ?? []).map((s) => s.compound ?? "UNKNOWN")))];
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(laps * f));

  const describe = (d: DriverRace) =>
    `${d.driver_name}: ${(d.stints ?? []).map((s) => `${NAMES[s.compound ?? ""] ?? "unknown tyre"} for ${s.laps} laps`).join(", then ")}. ${fmt(d.stops)} stop${d.stops === 1 ? "" : "s"}.`;

  return (
    <div className="rounded-sm glass p-4 sm:p-6">
      <ul className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-300">
        {used.map((c) => (
          <li key={c} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: COMPOUND_COLORS[c] ?? UNKNOWN }} />
            {NAMES[c] ?? "Unknown"}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-4 w-0.5 bg-white" />
          Pit stop
        </li>
        {quickest !== null && (
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="h-4 w-0.5 bg-red-500" />
            Quickest stop
          </li>
        )}
      </ul>

      <ul aria-label="Tyre strategy by driver, in finishing order">
        {rows.map((d, row) => (
          <li key={d.driver_code} className="group grid grid-cols-[2.75rem_1fr] items-center gap-3 rounded-sm px-1 py-[3px] transition-colors hover:bg-white/[0.04] sm:grid-cols-[2.75rem_1fr_5.5rem] sm:px-2">
            <span className="font-mono text-xs font-bold text-white">{d.driver_code}</span>
            <div role="img" aria-label={describe(d)} className="relative h-5">
              {(d.stints ?? []).map((s, i) => (
                <span
                  key={s.number}
                  title={`${NAMES[s.compound ?? ""] ?? "Unknown tyre"} · ${s.laps} laps (${s.lap_start}–${s.lap_end})`}
                  className="f1-grow-x absolute inset-y-0 rounded-sm"
                  style={{ left: pct(s.lap_start - 1), width: `calc(${(s.laps / laps) * 100}% - 2px)`, backgroundColor: s.compound ? (COMPOUND_COLORS[s.compound] ?? UNKNOWN) : UNKNOWN, "--d": `${row * 30 + i * 60}ms` } as CSSProperties}
                />
              ))}
              {(d.stints ?? []).slice(0, -1).map((s) => {
                const stop = d.pit_stops?.find((p) => p.lap !== null && Math.abs(p.lap - s.lap_end) <= 1);
                const fastest = quickest !== null && stop?.duration_s === quickest;
                return (
                  <span
                    key={`stop-${s.number}`}
                    title={stop?.duration_s != null ? `Pit stop, lap ${stop.lap}: ${stop.duration_s.toFixed(1)}s` : `Pit stop, lap ${s.lap_end}`}
                    className={`absolute -inset-y-0.5 w-0.5 -translate-x-1/2 ${fastest ? "bg-red-500" : "bg-white"}`}
                    style={{ left: pct(s.lap_end) }}
                  />
                );
              })}
            </div>
            <span className="hidden text-right font-mono text-xs text-zinc-500 transition-colors group-hover:text-zinc-200 sm:block">
              {d.stops === null ? "—" : `${d.stops} stop${d.stops === 1 ? "" : "s"}`}
            </span>
          </li>
        ))}
      </ul>

      <div aria-hidden="true" className="relative mt-2 grid grid-cols-[2.75rem_1fr] gap-3 sm:grid-cols-[2.75rem_1fr_5.5rem] sm:px-2">
        <span />
        <div className="relative h-4 border-t border-white/10 font-mono text-[11px] text-zinc-500">
          {ticks.map((t, i) => (
            <span key={t} className="absolute top-1" style={{ left: pct(t), transform: i === 0 ? "none" : i === ticks.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}>
              {i === 0 ? "Lap 1" : t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

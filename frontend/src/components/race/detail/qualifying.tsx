import type { CSSProperties } from "react";
import { readableOnDark } from "../../../lib/color";
import type { DriverRace } from "../../../types/api";

/** Qualifying as a ladder: how far each car was from the pole lap, and where they finished against where they started. */
export function Qualifying({ drivers }: { drivers: DriverRace[] }) {
  const rows = drivers.filter((d) => d.quali_position != null).sort((a, b) => (a.quali_position as number) - (b.quali_position as number));
  if (rows.length < 5) return null;
  const worst = Math.max(...rows.map((d) => d.quali_gap_pct ?? 0), 0.5);
  const sprint = drivers.filter((d) => d.sprint_position != null).sort((a, b) => (a.sprint_position as number) - (b.sprint_position as number));
  return (
    <div className="space-y-8">
      <ol aria-label="Qualifying order and gap to pole" className="glass">
        {rows.map((d, i) => {
          const color = readableOnDark(`#${(d.team_color ?? "888888").replace("#", "")}`);
          const delta = d.classified && d.finish !== null ? (d.quali_position as number) - d.finish : null;
          return (
            <li key={d.driver_code} className="grid grid-cols-[2rem_3rem_1fr_5.5rem] items-center gap-3 border-t border-white/[0.06] px-4 py-2 first:border-t-0 sm:grid-cols-[2rem_4rem_1fr_7rem]">
              <span className="font-mono text-xs text-zinc-500">{d.quali_position}</span>
              <span className="font-mono text-xs font-bold text-white">{d.driver_code}</span>
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className="relative h-1.5 w-full bg-white/10">
                  <span className="f1-grow-x absolute inset-y-0 left-0" style={{ width: `${Math.max(((d.quali_gap_pct ?? 0) / worst) * 100, 1.5)}%`, backgroundColor: color, "--d": `${i * 25}ms` } as CSSProperties} />
                </span>
                <span className="w-16 shrink-0 text-right font-mono text-xs text-zinc-300">{i === 0 ? "POLE" : d.quali_gap_pct == null ? "—" : `+${d.quali_gap_pct.toFixed(2)}%`}</span>
              </span>
              <span className="text-right font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-400">
                {d.classified && d.finish !== null ? `→ P${d.finish}` : "→ OUT"}{" "}
                {delta !== null && delta !== 0 && <b className={delta > 0 ? "text-white" : "text-red-500"}>{delta > 0 ? `▲${delta}` : `▼${-delta}`}</b>}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-zinc-500">Gap is each driver's best qualifying lap against the pole lap. ▲ means they finished ahead of where they qualified, ▼ behind. Penalties and pit-lane starts can move the real grid.</p>
      {sprint.length > 0 && (
        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">SPRINT_RESULT // TOP_8</p>
          <ol className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-4">
            {sprint.slice(0, 8).map((d) => (
              <li key={d.driver_code} className="flex items-baseline justify-between glass-cell px-4 py-3">
                <span><span className="font-serif text-2xl text-white">{d.sprint_position}</span> <span className="font-mono text-xs text-zinc-300">{d.driver_code}</span></span>
                <span className="font-mono text-xs text-zinc-500">{d.sprint_points ? `+${d.sprint_points}` : ""}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

import { useMemo } from "react";
import { readableOnDark } from "../../../lib/color";
import { DASH } from "../../../lib/format";
import type { DriverRace } from "../../../types/api";

/** One card per team: how its cars finished on average, and how many places they made up in total. */
export function TeamCards({ drivers }: { drivers: DriverRace[] }) {
  const teams = useMemo(() => {
    const by = new Map<string, { team: string; color: string | null; finishes: number[]; gained: number; points: number }>();
    for (const d of drivers) {
      const t = by.get(d.team) ?? { team: d.team, color: d.team_color, finishes: [], gained: 0, points: 0 };
      if (d.classified && d.finish !== null) t.finishes.push(d.finish);
      t.gained += d.positions_gained ?? 0;
      t.points += d.points;
      by.set(d.team, t);
    }
    return [...by.values()]
      .map((t) => ({ ...t, avg: t.finishes.length ? t.finishes.reduce((a, b) => a + b, 0) / t.finishes.length : null }))
      .sort((a, b) => (b.points - a.points) || ((a.avg ?? 99) - (b.avg ?? 99)));
  }, [drivers]);

  return (
    <ul aria-label="Teams in this race" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {teams.map((t) => {
        const color = readableOnDark(`#${(t.color ?? "888888").replace("#", "")}`);
        return (
          <li
            key={t.team}
            className="group relative overflow-hidden rounded-sm glass p-5 transition-all duration-300 hover:border-white/30"
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px]" style={{ backgroundColor: color }} />
            <p className="relative text-sm font-bold text-white">{t.team}</p>
            <p className="relative mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">AVG_FINISH</p>
            <p className="relative font-serif text-5xl text-white">{t.avg === null ? DASH : t.avg.toFixed(1)}</p>
            <p className="relative mt-3 flex items-center justify-between text-xs text-zinc-400">
              <span>{t.points} {t.points === 1 ? "point" : "points"}</span>
              <span className={t.gained > 0 ? "text-white" : t.gained < 0 ? "text-red-500" : ""}>
                {t.gained > 0 ? "+" : ""}{t.gained} {Math.abs(t.gained) === 1 ? "place" : "places"}
              </span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

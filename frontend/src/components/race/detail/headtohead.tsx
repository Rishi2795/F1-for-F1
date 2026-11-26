import { useState, type CSSProperties } from "react";
import { readableOnDark } from "../../../lib/color";
import { DASH, fmtGap, fmtGrid, fmtLap, fmtSigned } from "../../../lib/format";
import { chip } from "../../ui/chipstyle";
import type { DriverRace } from "../../../types/api";

const colorOf = (d: DriverRace) => readableOnDark(`#${(d.team_color ?? "888888").replace("#", "")}`);

type Row = { label: string; a: string; b: string; better: "a" | "b" | null };

/** Compare two numbers where lower (or higher) wins; no winner when either is missing or they tie. */
const lower = (a: number | null | undefined, b: number | null | undefined): Row["better"] => (a == null || b == null || a === b ? null : a < b ? "a" : "b");
const higher = (a: number | null | undefined, b: number | null | undefined): Row["better"] => (a == null || b == null || a === b ? null : a > b ? "a" : "b");

function rows(a: DriverRace, b: DriverRace): Row[] {
  return [
    { label: "Finished", a: a.classified ? `P${a.finish}` : a.status, b: b.classified ? `P${b.finish}` : b.status, better: a.classified && b.classified ? lower(a.finish, b.finish) : a.classified ? "a" : b.classified ? "b" : null },
    { label: "Started", a: fmtGrid(a.grid, a.pit_lane_start), b: fmtGrid(b.grid, b.pit_lane_start), better: lower(a.grid, b.grid) },
    { label: "Places gained", a: fmtSigned(a.positions_gained), b: fmtSigned(b.positions_gained), better: higher(a.positions_gained, b.positions_gained) },
    { label: "Gap to winner", a: a.finish === 1 ? "Winner" : fmtGap(a.gap_to_winner_s), b: b.finish === 1 ? "Winner" : fmtGap(b.gap_to_winner_s), better: lower(a.finish === 1 ? 0 : a.gap_to_winner_s, b.finish === 1 ? 0 : b.gap_to_winner_s) },
    { label: "Typical lap", a: fmtLap(a.median_lap_s), b: fmtLap(b.median_lap_s), better: lower(a.median_lap_s, b.median_lap_s) },
    { label: "Fastest lap", a: fmtLap(a.fastest_lap?.time_s), b: fmtLap(b.fastest_lap?.time_s), better: lower(a.fastest_lap?.time_s, b.fastest_lap?.time_s) },
    { label: "Pit stops", a: a.stops === null ? DASH : String(a.stops), b: b.stops === null ? DASH : String(b.stops), better: null },
    { label: "Points", a: String(a.points), b: String(b.points), better: higher(a.points, b.points) },
  ].filter((r) => !(r.a === DASH && r.b === DASH));
}

/** Pick two drivers from the chips and see the race from each of their sides. */
export function HeadToHead({ drivers }: { drivers: DriverRace[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (code: string) =>
    setPicked((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : cur.length >= 2 ? [cur[1], code] : [...cur, code]));
  const [a, b] = picked.map((c) => drivers.find((d) => d.driver_code === c));

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Pick two drivers to compare" className="flex flex-wrap gap-2">
        {drivers.map((d) => (
          <button key={d.driver_code} type="button" aria-pressed={picked.includes(d.driver_code)} onClick={() => toggle(d.driver_code)} className={chip(picked.includes(d.driver_code))}>
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: colorOf(d) }} />
            {d.driver_code}
          </button>
        ))}
      </div>

      {a && b ? (
        <div key={`${a.driver_code}-${b.driver_code}`} className="f1-rise overflow-hidden rounded-sm glass">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/10 p-5 sm:p-7">
            {[a, b].map((d, i) => (
              <div key={d.driver_code} className={i === 0 ? "text-left" : "text-right"} style={{ order: i === 0 ? 0 : 2 }}>
                <p className="text-xl font-black italic tracking-tighter text-white sm:text-3xl">{d.driver_name}</p>
                <p className="mt-1 inline-flex items-center gap-2 text-xs text-zinc-400">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: colorOf(d) }} />
                  {d.team}
                </p>
              </div>
            ))}
            <span className="text-center font-serif text-sm italic text-zinc-500" style={{ order: 1 }}>vs</span>
          </div>
          <dl>
            {rows(a, b).map((r, i) => (
              <div key={r.label} className="f1-rise grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/[0.06] px-5 py-3.5 transition-colors last:border-0 hover:bg-white/[0.04] sm:px-7" style={{ "--d": `${i * 45}ms` } as CSSProperties}>
                <dd className={`flex items-center gap-2 font-mono text-base sm:text-lg ${r.better === "a" ? "font-bold text-white" : "text-zinc-400"}`}>
                  {r.better === "a" && <span aria-hidden="true" className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorOf(a) }} />}
                  {r.a}
                </dd>
                <dt className="min-w-[6.5rem] text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{r.label}</dt>
                <dd className={`flex items-center justify-end gap-2 font-mono text-base sm:text-lg ${r.better === "b" ? "font-bold text-white" : "text-zinc-400"}`}>
                  {r.b}
                  {r.better === "b" && <span aria-hidden="true" className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorOf(b) }} />}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="rounded-sm border border-dashed border-white/15 p-8 text-center text-sm text-zinc-400">
          {picked.length === 0 ? "Choose two drivers above." : "Choose one more driver."}
        </p>
      )}
    </div>
  );
}

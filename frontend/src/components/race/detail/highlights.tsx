import { tag } from "../../../lib/tag";
import { DASH, fmtGap, fmtLap } from "../../../lib/format";
import type { RaceDoc } from "../../../types/api";

type Tile = { label: string; value: string; sub: string };

/** The headline numbers of a race. A tile with no data is left out, never filled with zeros. */
export function Highlights({ race }: { race: RaceDoc }) {
  const a = race.analysis;
  const name = (code: string) => race.drivers.find((d) => d.driver_code === code)?.driver_name.split(" ").at(-1) ?? code;
  const second = race.drivers.find((d) => d.finish === 2);
  const tiles: (Tile | null)[] = [
    a?.fastest_lap ? { label: "Fastest lap", value: fmtLap(a.fastest_lap.value_s), sub: `${name(a.fastest_lap.driver_code)}${a.fastest_lap.lap ? ` · lap ${a.fastest_lap.lap}` : ""}` } : null,
    a?.fastest_pit ? { label: "Quickest pit stop", value: `${a.fastest_pit.value_s.toFixed(1)}s`, sub: `${name(a.fastest_pit.driver_code)}${a.fastest_pit.lap ? ` · lap ${a.fastest_pit.lap}` : ""}` } : null,
    second?.gap_to_winner_s != null ? { label: "Winning margin", value: fmtGap(second.gap_to_winner_s), sub: `over ${name(second.driver_code)}` } : null,
  ];
  const shown = tiles.filter((t): t is Tile => t !== null);
  if (shown.length === 0) return <p className="text-sm text-zinc-400">Detailed race numbers are not available for this race ({DASH}).</p>;
  return (
    <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-white/10 bg-white/10 sm:grid-cols-3">
      {shown.map((t) => (
        <div key={t.label} className="bg-[#0a0a0b] px-5 py-4">
          <dt className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{tag(t.label)}</dt>
          <dd className="mt-2 font-serif text-3xl text-white">{t.value}</dd>
          <dd className="text-xs text-zinc-400">{t.sub}</dd>
        </div>
      ))}
    </dl>
  );
}

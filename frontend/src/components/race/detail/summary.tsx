import { DASH, fmt, fmtGrid } from "../../../lib/format";
import { raceStory } from "../../../lib/racestory";
import { tag } from "../../../lib/tag";
import type { RaceDoc } from "../../../types/api";

const CIRCUIT_NOTES: Record<string, string> = {
  "Bahrain Grand Prix": "Bahrain rewards tyre management and disciplined execution. Rear degradation exposes weak setups.",
  "Miami Grand Prix": "Miami mixes street sections with long straights, so timing and track position are critical.",
  "Monaco Grand Prix": "Overtaking is nearly impossible. Strategy revolves entirely around track control.",
};

/** The original bento: the race told in serif italic on black, beside a white STRATEGY_WINDOW panel. */
export function Summary({ race }: { race: RaceDoc }) {
  const recipe = race.derived.winning_recipe;
  const winner = race.drivers.find((d) => d.finish === 1);
  const [headline, ...rest] = raceStory(race);
  const facts: [string, string][] = [
    ["Pit stops", fmt(recipe.typical_stops)],
    ["Compound", recipe.common_tyre_sequence ? recipe.common_tyre_sequence.replace(/->/g, "→") : DASH],
    ["Max stint", recipe.avg_longest_stint === null ? DASH : `${recipe.avg_longest_stint} laps`],
    ["Winner started", winner ? fmtGrid(winner.grid, winner.pit_lane_start) : DASH],
  ];
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden border border-white/10 bg-white/10 lg:grid-cols-3">
      <div className="bg-black p-8 md:p-12 lg:col-span-2">
        <p className="max-w-3xl font-serif text-2xl italic leading-snug text-zinc-100 md:text-3xl">“{headline}”</p>
        <ul className="mt-8 max-w-2xl space-y-2 text-base leading-relaxed text-zinc-300">
          {rest.map((line) => (
            <li key={line} className="flex gap-3">
              <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-red-600" />
              {line}
            </li>
          ))}
        </ul>
        {CIRCUIT_NOTES[race.event_name] && <p className="mt-6 max-w-2xl text-sm italic text-zinc-400">{CIRCUIT_NOTES[race.event_name]}</p>}
        {race.derived.style_profile.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {race.derived.style_profile.map((t) => (
              <span key={t} className="border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white p-8 md:p-12">
        <h3 className="font-mono text-xs font-black uppercase tracking-[0.3em] text-zinc-600">STRATEGY_WINDOW</h3>
        <dl className="mt-8 space-y-6">
          {facts.map(([label, value]) => (
            <div key={label} className="flex items-end justify-between gap-4 border-b border-zinc-200 pb-2 transition-colors hover:border-black">
              <dt className="text-xs font-black uppercase tracking-widest text-zinc-600">{tag(label).replace(/_/g, " ")}</dt>
              <dd className="text-right text-xl font-black uppercase italic leading-none tracking-tighter text-black">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

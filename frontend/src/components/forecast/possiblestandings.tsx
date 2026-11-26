import type { TitleForecast } from "../../types/api";
import { pct } from "../../lib/forecast";

const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`;

/** How the table might end: each driver's most likely final place, how likely each place is, and a typical points range. */
export function PossibleStandings({ data }: { data: TitleForecast }) {
  const rows = data.drivers
    .filter((d) => d.positions && d.positions.length > 0)
    .map((d) => {
      const probs = d.positions as number[];
      const best = probs.indexOf(Math.max(...probs));
      return { d, probs, place: best + 1, chance: probs[best] };
    })
    .sort((a, b) => a.place - b.place || b.d.exp_points - a.d.exp_points)
    .slice(0, 10);
  if (rows.length === 0) return null;
  const places = rows[0].probs.length;
  const shown = Math.min(places, 10);

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-zinc-300">
        {data.races_left === 0 ? "The season is over. These are the final results." : `With ${data.races_left} ${data.races_left === 1 ? "race" : "races"} to go, we ran the rest of the season 20,000 times. Each bar shows how often a driver ended in each place; darker means more likely.`}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <caption className="sr-only">Possible final drivers' standings</caption>
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">
              <th scope="col" className="py-2 pr-3 font-normal">Likely</th>
              <th scope="col" className="py-2 pr-3 font-normal">Driver</th>
              <th scope="col" className="py-2 pr-3 font-normal">Chance by place (1st to {ordinal(shown)})</th>
              <th scope="col" className="py-2 text-right font-normal">Points (typical)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ d, probs, place, chance }) => {
              const colour = d.team_color ? `#${d.team_color.replace("#", "")}` : "#a1a1aa";
              return (
                <tr key={d.code} className="border-t border-white/10">
                  <td className="py-3 pr-3 align-middle">
                    <span className="font-serif text-2xl text-white">{ordinal(place)}</span>
                    <span className="ml-2 text-xs text-zinc-400">{pct(chance)}</span>
                  </td>
                  <td className="py-3 pr-3 align-middle text-white">
                    <span aria-hidden="true" className="mr-2 inline-block h-4 w-1 rounded-full align-middle" style={{ backgroundColor: colour }} />
                    {d.name}
                  </td>
                  <td className="py-3 pr-3 align-middle">
                    <div className="flex h-6 gap-px" role="img" aria-label={`${d.name}: most likely ${ordinal(place)}, ${pct(chance)}`}>
                      {probs.slice(0, shown).map((p, i) => (
                        <span key={i} title={`${ordinal(i + 1)}: ${pct(p)}`} className="flex-1" style={{ backgroundColor: colour, opacity: p < 0.005 ? 0.06 : 0.12 + Math.min(p, 1) * 0.88 }} />
                      ))}
                    </div>
                  </td>
                  <td className="py-3 text-right align-middle font-mono text-sm tabular-nums text-zinc-200">
                    {d.points_lo != null && d.points_hi != null ? `${Math.round(d.points_lo)}–${Math.round(d.points_hi)}` : Math.round(d.exp_points)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">Points show the middle 80% of simulated outcomes. A forecast, not a promise.</p>
    </div>
  );
}

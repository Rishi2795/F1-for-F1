import { DataTable } from "../ui/datatable";
import { HEAD, ROW, TD, TH } from "../ui/tablestyle";
import { pct, typicalChance } from "../../lib/forecast";
import type { ForecastModelCard } from "../../types/api";

const ROWS: [string, string][] = [
  ["ratings_only", "Driver and car ratings only"],
  ["ratings_pace", "+ recent car race pace"],
  ["ratings_pace_form", "+ recent form (the forecast above)"],
  ["grid_only", "Starting grid only (after qualifying)"],
  ["everything_with_grid", "Everything + grid (after qualifying)"],
];

/** How good the forecasts are on races the model never saw, in plain terms. */
export function Accuracy({ card }: { card: ForecastModelCard }) {
  const pre = card.variants[card.forecast_variant];
  const post = card.variants.everything_with_grid;
  const random = typicalChance(card.uniform_winner_log_loss);
  const tb = card.title_backtest;
  return (
    <div className="space-y-6">
      <div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-3">
        {[
          ["BEFORE_QUALIFYING", pct(typicalChance(pre.winner_log_loss)), `typical chance given to the real winner. A random guess gives ${pct(random)}.`],
          ["AFTER_QUALIFYING", pct(typicalChance(post.winner_log_loss)), "once the grid is known. The starting order is the strongest clue."],
          ["TITLE_PICKS", pct(tb.pick_correct), `of ${tb.forecasts} past title forecasts named the eventual champion, against ${pct(tb.leader_correct)} for "the leader wins".`],
        ].map(([label, value, text]) => (
          <div key={label} className="glass-cell p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{label}</p>
            <p className="mt-2 font-serif text-4xl text-white">{value}</p>
            <p className="mt-2 text-sm text-zinc-400">{text}</p>
          </div>
        ))}
      </div>

      <DataTable caption="How each version of the forecast scored on races it never saw">
        <thead className={HEAD}>
          <tr>
            <th scope="col" className="px-4 py-4">WHAT_IT_USES</th>
            <th scope="col" className={`${TH} text-right`}>TYPICAL_CHANCE_FOR_WINNER</th>
            <th scope="col" className="hidden px-4 py-4 text-right sm:table-cell">WINNER_PICKED_RIGHT</th>
          </tr>
        </thead>
        <tbody>
          <tr className={ROW}>
            <td className="px-4 py-3 text-zinc-400">Random guess</td>
            <td className={`${TD} text-right font-mono text-zinc-400`}>{pct(random)}</td>
            <td className="hidden px-4 py-3 text-right font-mono text-zinc-400 sm:table-cell">{pct(1 / 20)}</td>
          </tr>
          {ROWS.map(([key, label]) => {
            const v = card.variants[key];
            return (
              <tr key={key} className={ROW}>
                <td className={`px-4 py-3 ${key === card.forecast_variant ? "font-semibold text-white" : "text-zinc-300"}`}>{label}</td>
                <td className={`${TD} text-right font-mono text-white`}>{pct(typicalChance(v.winner_log_loss))}</td>
                <td className="hidden px-4 py-3 text-right font-mono text-zinc-300 sm:table-cell">{pct(v.winner_top1)}</td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
      <p className="text-sm text-zinc-400">
        Scored on {card.test.races} races from {card.test.seasons[0]} onward. Each season's forecast uses settings learned only from earlier seasons.
        Adding recent car pace and recent form helps a little each time, which is why they are in.
      </p>

      <div className="glass p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">WHAT_IT_CANNOT_DO</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-300">
          {card.limitations.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </div>
    </div>
  );
}

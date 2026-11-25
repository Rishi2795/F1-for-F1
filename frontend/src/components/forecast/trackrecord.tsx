import { DataTable } from "../ui/datatable";
import { HEAD, ROW, TD, TH } from "../ui/tablestyle";
import { pct, reviewSummary } from "../../lib/forecast";
import type { ForecastReviewRow } from "../../types/api";

/** What the model said before each recent race against what happened, misses included. */
export function TrackRecord({ rows }: { rows: ForecastReviewRow[] }) {
  if (rows.length === 0) return null;
  const s = reviewSummary(rows);
  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-lg text-zinc-300">
        In the last {s.races} races the model backed the right winner {s.backed} {s.backed === 1 ? "time" : "times"}, and the real winner was in its top three {s.top3} times.
        Winners are hard to call before qualifying, so misses are normal. They are shown here, not hidden.
      </p>
      <DataTable caption="Pre-race forecast against the real winner, newest first">
        <thead className={HEAD}>
          <tr>
            <th scope="col" className="px-4 py-4">RACE</th>
            <th scope="col" className={TH}>MODEL_BACKED</th>
            <th scope="col" className={TH}>WINNER</th>
            <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>CHANCE_GIVEN_TO_WINNER</th>
            <th scope="col" className="px-4 py-4 text-right">VERDICT</th>
          </tr>
        </thead>
        <tbody>
          {[...rows].reverse().map((r) => (
            <tr key={`${r.season}-${r.round}`} className={ROW}>
              <td className="px-4 py-3 font-semibold text-white">{r.event_name.replace(" Grand Prix", "")} <span className="font-mono text-xs text-zinc-500">{r.season}</span></td>
              <td className={`${TD} text-zinc-300`}>{r.favourite_name} <span className="font-mono text-xs text-zinc-500">{pct(r.favourite_win)}</span></td>
              <td className={`${TD} text-white`}>{r.winner_name}</td>
              <td className={`${TD} hidden text-right font-mono text-zinc-300 sm:table-cell`}>{pct(r.winner_win)}</td>
              <td className="px-4 py-3 text-right">
                <span className={`inline-block whitespace-nowrap rounded-sm border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${r.winner_rank === 1 ? "border-white bg-white text-black" : r.winner_rank <= 3 ? "border-white/25 text-zinc-300" : "border-red-500/70 text-red-400"}`}>
                  {r.winner_rank === 1 ? "BACKED" : r.winner_rank <= 3 ? `RANKED_${r.winner_rank}` : `MISSED_RANKED_${r.winner_rank}`}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}

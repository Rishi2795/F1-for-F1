import { useApi } from "../../hooks/useApi";
import { Skeleton } from "../ui/states";
import type { RatingModelCard } from "../../types/api";

const ROWS: [string, string][] = [
  ["coin_flip", "Coin flip"],
  ["grid_only", "Starting grid only"],
  ["recent_form", "Recent form only"],
  ["grid_plus_form", "Grid + recent form"],
  ["ratings_only", "Ratings only"],
  ["ratings_plus_grid", "Ratings + grid"],
];

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

/** Methodology section for the ratings model. Numbers come from the published model card, never hard-coded. */
export function RatingModelSection({ n }: { n?: string }) {
  const { data: card, loading } = useApi<RatingModelCard>("/ratings/model");
  return (
    <section id="ratings" aria-labelledby="ratings-h" className="scroll-mt-20 space-y-4">
      <h2 id="ratings-h" className="text-2xl font-black uppercase italic tracking-tighter text-white md:text-3xl">{n && <span aria-hidden="true" className="mr-3 font-mono text-xs font-black not-italic text-red-500">[{n}]</span>}The ratings model</h2>
      {loading && <Skeleton className="h-64" />}
      {card && <Body card={card} />}
    </section>
  );
}

function Body({ card }: { card: RatingModelCard }) {
  const grid = card.metrics.grid_plus_form;
  const ratingsGrid = card.metrics.ratings_plus_grid;
  const tied = ratingsGrid.log_loss >= grid.log_loss - 0.01;
  const winner = card.winner_pick;
  return (
    <>
      <ul className="list-disc space-y-1 pl-5 text-zinc-400">
        {card.method.map((m) => <li key={m}>{m}</li>)}
      </ul>
      <h3 className="pt-2 font-semibold text-white">How well does it predict?</h3>
      <p className="text-zinc-400">
        Tuned on {card.tuning.seasons.join(", ")} only, then scored on {card.test.races} races from {card.test.seasons[0]} onward
        ({card.test.pairs.toLocaleString()} driver-vs-driver comparisons) that it never saw. Lower log loss is better; 0.693 is a coin flip.
      </p>
      <div className="relative overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Prediction accuracy of each approach on held-out races</caption>
          <thead className="text-xs uppercase text-zinc-400">
            <tr><th scope="col" className="py-2 pr-4">Approach</th><th scope="col" className="pr-4">Log loss</th><th scope="col">Pairs called right</th></tr>
          </thead>
          <tbody>
            {ROWS.map(([key, label]) => (
              <tr key={key} className="border-t border-white/5">
                <th scope="row" className="py-2 pr-4 font-normal text-zinc-200">{label}</th>
                <td className="pr-4 font-mono">{card.metrics[key].log_loss.toFixed(3)}</td>
                <td className="font-mono">{pct(card.metrics[key].accuracy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="rounded-sm border border-white/10 bg-white/5 p-4 text-zinc-300">
        {tied
          ? "Honest reading: once the starting grid is known, ratings add almost nothing over grid plus recent form. "
          : "Ratings improve on grid plus recent form. "}
        Their value is different: they separate driver from car, and they give a forecast before qualifying, when there is no grid yet.
        Picking the pole sitter wins {winner.pole_sitter.correct} of {winner.pole_sitter.races} races ({pct(winner.pole_sitter.accuracy)});
        picking the highest-rated driver wins {pct(winner.best_rating.accuracy)}.
      </p>
      <h3 className="pt-2 font-semibold text-white">Is the probability honest?</h3>
      <div className="relative overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Predicted versus observed win rate per probability band</caption>
          <thead className="text-xs uppercase text-zinc-400">
            <tr><th scope="col" className="py-2 pr-4">Said</th><th scope="col" className="pr-4">Happened</th><th scope="col">Comparisons</th></tr>
          </thead>
          <tbody>
            {card.calibration.filter((c) => c.observed !== null).map((c) => (
              <tr key={c.bin} className="border-t border-white/5">
                <td className="py-1.5 pr-4 font-mono">{pct(c.predicted)}</td>
                <td className="pr-4 font-mono">{pct(c.observed as number)}</td>
                <td className="font-mono">{c.n.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="pt-2 font-semibold text-white">Limits</h3>
      <ul className="list-disc space-y-1 pl-5 text-zinc-400">
        {card.limitations.map((l) => <li key={l}>{l}</li>)}
      </ul>
    </>
  );
}

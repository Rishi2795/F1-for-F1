import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { Skeleton } from "../ui/states";
import { tag } from "../../lib/tag";
import type { ForecastModelCard } from "../../types/api";

/** Methodology section for the forecasts: what goes in, how odds are made, and where to see the scores. */
export function ForecastModelSection() {
  const { data: card, loading } = useApi<ForecastModelCard>("/predictions/model");
  return (
    <section id="forecast" aria-labelledby="forecast-h" className="scroll-mt-20 space-y-4">
      <h2 id="forecast-h" className="text-2xl font-black uppercase italic tracking-tighter text-white md:text-3xl">{tag("The forecasts")}</h2>
      {loading && <Skeleton className="h-40" />}
      {card && (
        <>
          <ul className="list-disc space-y-1 pl-5 text-zinc-400">
            {card.method.map((m) => <li key={m}>{m}</li>)}
          </ul>
          <p className="text-zinc-400">
            Settings are learned on {card.tuning.seasons.join(", ")} and scored on {card.test.races} races from {card.test.seasons[0]} onward, with each
            season using only earlier seasons. The scorecard, track record and limits are on the <Link to="/forecast#accuracy" className="text-zinc-200 underline underline-offset-4 hover:text-white">forecast page</Link>.
          </p>
        </>
      )}
    </section>
  );
}

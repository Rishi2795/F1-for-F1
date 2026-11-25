import { Link } from "react-router-dom";
import { PageHead } from "../components/ui/pagehead";
import { pct } from "../lib/forecast";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ErrorState, Skeleton } from "../components/ui/states";
import { Block } from "../components/race/detail/block";
import { Accuracy } from "../components/forecast/accuracy";
import { RacePanel } from "../components/forecast/racepanel";
import { TitlePanel } from "../components/forecast/titlepanel";
import { TrackRecord } from "../components/forecast/trackrecord";
import type { ForecastModelCard, ForecastReviewRow, NextForecasts, TitleForecast } from "../types/api";

export default function Forecast() {
  useDocumentTitle("Forecast: who wins next?");
  const next = useApi<NextForecasts>("/predictions/next");
  const title = useApi<TitleForecast>("/predictions/championship");
  const review = useApi<ForecastReviewRow[]>("/predictions/review");
  const card = useApi<ForecastModelCard>("/predictions/model");

  const upcoming = next.data?.races[0];
  const favourite = upcoming?.drivers[0];

  return (
    <div className="min-h-screen px-5 pb-32 pt-16 text-zinc-300 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl space-y-14">
        <PageHead
          align="split"
          kicker="FORECAST"
          title="Who wins"
          accent="next?"
          intro="Odds for every race still to come and for both championships, from a model we test in the open. It looks at how good each driver and car is, how fast each team has been lately, and how reliable they are."
          aside={
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{upcoming ? upcoming.event_name.toUpperCase().replace(/\s+/g, "_") : "NO_RACE_LEFT"}</p>
              <p className="mt-3 font-serif text-5xl text-white">{favourite ? pct(favourite.win) : "—"}</p>
              <p className="mt-1 text-sm text-zinc-300">{favourite ? `${favourite.name} is the favourite` : "Forecast appears after the next calendar is published"}</p>
              <p className="mt-4 text-xs text-zinc-500">
                {next.data && `After round ${next.data.as_of_round} of ${next.data.as_of_season}. `}Probabilities, not promises, and not betting advice.{" "}
                <Link to="/methodology#forecast" className="text-zinc-300 underline underline-offset-4 hover:text-white">How it works</Link>
              </p>
            </div>
          }
        />

        <Block id="next-h" n="01" title="Next" accent="race">
          {next.loading ? <Skeleton className="h-[420px]" /> : next.data ? <RacePanel data={next.data} /> : <ErrorState error={next.error} onRetry={next.reload} subject="forecast" />}
        </Block>

        <Block id="title-h" n="02" title="Title" accent="race">
          {title.loading ? <Skeleton className="h-[420px]" /> : title.data ? <TitlePanel data={title.data} /> : <ErrorState error={title.error} onRetry={title.reload} subject="championship forecast" />}
        </Block>

        <Block id="record-h" n="03" title="Track" accent="record">
          {review.loading ? <Skeleton className="h-64" /> : review.data ? <TrackRecord rows={review.data} /> : null}
        </Block>

        <section id="accuracy" className="scroll-mt-20">
          <Block id="accuracy-h" n="04" title="How" accent="accurate">
            {card.loading ? <Skeleton className="h-64" /> : card.data ? <Accuracy card={card.data} /> : null}
          </Block>
        </section>
      </div>
    </div>
  );
}

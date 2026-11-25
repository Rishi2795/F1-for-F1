import { useMemo } from "react";
import { Link } from "react-router-dom";
import { tag } from "../../lib/tag";
import { useApi } from "../../hooks/useApi";
import { Skeleton } from "../ui/states";
import { VERDICT_TEXT, ordinal, rateAll } from "../../lib/ratings";
import { RatingChart } from "./ratingchart";
import type { RatingHistory, RatingsCurrent, RatingSummary } from "../../types/api";

/** Rating card for a driver profile, in ranks and words rather than raw scores. */
export function RatingPanel({ code, name, rating }: { code: string; name: string; rating: RatingSummary }) {
  const history = useApi<RatingHistory>(`/ratings/${code}`);
  const current = useApi<RatingsCurrent>("/ratings").data;
  const view = useMemo(() => {
    if (!current) return null;
    const all = rateAll(current.ratings);
    const mine = all.views.find((v) => v.entry.code === code);
    return mine ? { ...mine, drivers: all.drivers, cars: all.cars } : null;
  }, [current, code]);

  return (
    <section aria-labelledby="rating-h" className="rounded-sm border border-white/10 bg-[#080808] p-6">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="rating-h" className="font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-400"><span aria-hidden="true" className="mr-3 inline-block h-2 w-2 bg-red-600" />DRIVER_AND_CAR_RATING</h3>
        <Link to="/ratings" className="text-xs text-zinc-400 underline-offset-4 hover:text-white hover:underline">See everyone</Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Tile label="Overall" value={`#${rating.rank}`} sub="on the current grid" />
        {view ? (
          <>
            <Tile label="As a driver" value={ordinal(view.driverRank)} sub={`of ${view.drivers} rated drivers`} />
            <Tile label="Car" value={ordinal(view.carRank)} sub={`best of ${view.cars} cars`} />
          </>
        ) : (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        )}
      </div>

      {view && (
        <p className="mb-6 text-sm text-zinc-300">
          <span className="font-semibold text-white">{VERDICT_TEXT[view.verdict].label}.</span> {VERDICT_TEXT[view.verdict].meaning}.
          {rating.provisional && <span className="ml-2 rounded-sm border border-red-500/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-red-400">Still learning: fewer than 15 races so far</span>}
        </p>
      )}

      {history.loading ? <Skeleton className="h-[220px]" /> : history.data && <RatingChart history={history.data.history} name={name} />}
      <p className="mt-4 text-xs text-zinc-500">
        An estimate from every result since 2020, updated after each race. A driver is judged against their teammates, so a very strong teammate can pull the rank down. <Link to="/methodology#ratings" className="underline underline-offset-4 hover:text-zinc-300">How it works</Link>
      </p>
    </section>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-sm glass p-4 transition-colors duration-200 hover:bg-white/[0.06]">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{tag(label)}</p>
      <p className="mt-2 font-serif text-4xl text-white">{value}</p>
      <p className="text-xs text-zinc-400">{sub}</p>
    </div>
  );
}

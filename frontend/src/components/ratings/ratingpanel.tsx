import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { Skeleton } from "../ui/states";
import { RatingChart } from "./ratingchart";
import { SplitBar } from "./splitbar";
import type { RatingHistory, RatingSummary } from "../../types/api";

/** Rating card for a driver profile: overall, the driver/car split, and the history. */
export function RatingPanel({ code, name, rating }: { code: string; name: string; rating: RatingSummary }) {
  const history = useApi<RatingHistory>(`/ratings/${code}`);
  return (
    <section aria-labelledby="rating-h" className="rounded-xl border border-white/10 bg-[#080808] p-6">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="rating-h" className="font-mono text-xs text-red-500">DRIVER &amp; CAR RATING</h3>
        <Link to="/methodology#ratings" className="text-xs text-zinc-400 underline-offset-4 hover:text-white hover:underline">How is this calculated?</Link>
      </div>
      <div className="mb-6 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="text-5xl font-black italic text-white">{rating.overall}</p>
          <p className="text-xs text-zinc-400">Overall · #{rating.rank} of the current grid · as of {rating.as_of}</p>
        </div>
        {rating.provisional && (
          <p className="rounded border border-amber-400/40 px-2 py-1 text-xs text-amber-300">Provisional: fewer than 15 races rated</p>
        )}
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <SplitBar label="Driver skill" hint="Strength against teammates" value={rating.driver} />
        <SplitBar label="Car strength" hint="Strength against other teams" value={rating.car} />
      </div>
      {history.loading ? <Skeleton className="h-[220px]" /> : history.data && <RatingChart history={history.data.history} name={name} />}
    </section>
  );
}

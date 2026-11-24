import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ErrorState, Skeleton } from "../components/ui/states";
import { SplitBar } from "../components/ratings/splitbar";
import type { RatingsCurrent } from "../types/api";

export default function Ratings() {
  useDocumentTitle("Driver & car ratings");
  const { data, error, loading, reload } = useApi<RatingsCurrent>("/ratings");

  return (
    <div className="min-h-screen bg-[#050505] px-4 pb-24 pt-16 text-zinc-300 md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-red-500">
            <span aria-hidden="true" className="h-px w-10 bg-red-600" />
            Ratings
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-5xl">Driver or car?</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Every result since 2020 is split into how good the driver is and how good the car is. 1500 is average.
            {data && ` Updated after ${data.season} round ${data.round}.`}{" "}
            <Link to="/methodology#ratings" className="text-zinc-200 underline underline-offset-4">How it works and how accurate it is</Link>.
          </p>
        </header>

        {loading && <Skeleton className="h-[480px]" />}
        {error && <ErrorState error={error} onRetry={reload} subject="ratings" />}
        {data && (
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Current driver and car ratings, highest overall first</caption>
            <thead className="text-xs uppercase text-zinc-400">
              <tr>
                <th scope="col" className="py-2 pr-3">#</th>
                <th scope="col" className="pr-3">Driver</th>
                <th scope="col" className="hidden pr-3 md:table-cell">Team</th>
                <th scope="col" className="pr-3 text-right">Overall</th>
                <th scope="col" className="hidden w-40 pr-4 sm:table-cell">Driver skill</th>
                <th scope="col" className="hidden w-40 sm:table-cell">Car strength</th>
              </tr>
            </thead>
            <tbody>
              {data.ratings.map((r) => (
                <tr key={r.code} className="border-t border-white/5">
                  <td className="py-3 pr-3 font-mono text-zinc-400">{r.rank}</td>
                  <td className="pr-3">
                    <Link to={`/driver/${r.code}`} className="font-semibold text-white underline-offset-4 hover:underline">{r.name}</Link>
                    {r.provisional && <span className="ml-2 text-[11px] text-amber-300">provisional</span>}
                  </td>
                  <td className="hidden pr-3 text-zinc-400 md:table-cell">{r.team ?? "—"}</td>
                  <td className="pr-3 text-right text-lg font-black italic text-white">{r.overall}</td>
                  <td className="hidden pr-4 sm:table-cell"><SplitBar label={`${r.name} driver skill`} value={r.driver} /></td>
                  <td className="hidden sm:table-cell"><SplitBar label={`${r.name} car strength`} value={r.car} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

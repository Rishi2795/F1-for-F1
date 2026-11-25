import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ErrorState, Skeleton } from "../components/ui/states";
import { DataTable, DriverCell, Pos } from "../components/ui/datatable";
import { HEAD, ROW, TD, TH } from "../components/ui/tablestyle";
import { DriverCarMap } from "../components/ratings/drivercarmap";
import { VERDICT_TEXT, ordinal, rateAll, type Verdict } from "../lib/ratings";
import type { RatingsCurrent } from "../types/api";

type SortKey = "overall" | "driver" | "car";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "overall", label: "Overall" },
  { key: "driver", label: "Best drivers" },
  { key: "car", label: "Best cars" },
];
const VERDICT_STYLE: Record<Verdict, string> = {
  beats: "border-white bg-white text-black",
  matched: "border-white/25 text-zinc-300",
  carried: "border-red-500/70 text-red-400",
};

export default function Ratings() {
  useDocumentTitle("Driver or car?");
  const { data, error, loading, reload } = useApi<RatingsCurrent>("/ratings");
  const [sort, setSort] = useState<SortKey>("overall");
  const model = useMemo(() => (data ? rateAll(data.ratings) : null), [data]);
  const rows = useMemo(() => {
    if (!model) return [];
    const key = (v: (typeof model.views)[number]) => (sort === "overall" ? v.entry.rank : sort === "driver" ? v.driverRank : v.carRank);
    return [...model.views].sort((a, b) => key(a) - key(b) || a.entry.rank - b.entry.rank);
  }, [model, sort]);

  return (
    <div className="min-h-screen px-5 pb-32 pt-16 text-zinc-300 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="f1-rise max-w-3xl">
          <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-400">
            <span aria-hidden="true" className="h-2 w-2 bg-red-600" />
            REGISTRY // RATINGS
          </p>
          <h1 className="mt-4 text-5xl font-black uppercase italic leading-[0.95] tracking-tighter text-white md:text-7xl">Driver or <span className="text-red-500">car?</span></h1>
          <p className="mt-4 text-lg text-zinc-300">
            A race result is part driver, part car. Using every result since 2020, we separate the two, so you can see who is
            outdriving their car and who is being carried by it.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {data && `Up to date after the ${data.season} season's round ${data.round}. `}
            <Link to="/methodology#ratings" className="text-zinc-300 underline underline-offset-4 hover:text-white">How it works and how accurate it is</Link>
          </p>
        </header>

        {loading && <Skeleton className="h-[480px]" />}
        {error && <ErrorState error={error} onRetry={reload} subject="ratings" />}

        {model && (
          <>
            <section aria-labelledby="map-h" className="f1-rise space-y-4" style={{ "--d": "120ms" } as React.CSSProperties}>
              <h2 id="map-h" className="text-2xl font-black uppercase italic tracking-tighter text-white md:text-3xl">The map</h2>
              <DriverCarMap views={model.views} drivers={model.drivers} cars={model.cars} />
            </section>

            <section aria-labelledby="rank-h" className="f1-rise space-y-4" style={{ "--d": "220ms" } as React.CSSProperties}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="rank-h" className="text-2xl font-black uppercase italic tracking-tighter text-white md:text-3xl">The ranking</h2>
                <div role="group" aria-label="Sort the ranking" className="inline-flex rounded-sm border border-white/15 bg-white/[0.04] p-1">
                  {SORTS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      aria-pressed={sort === s.key}
                      onClick={() => setSort(s.key)}
                      className={`rounded-sm px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 ${sort === s.key ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <DataTable caption="Drivers ranked by overall rating, best drivers or best cars">
                <thead className={HEAD}>
                  <tr>
                    <th scope="col" className="px-4 py-4">RANK</th>
                    <th scope="col" className={TH}>DRIVER</th>
                    <th scope="col" className={`${TH} hidden md:table-cell`}>TEAM</th>
                    <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>AS_A_DRIVER</th>
                    <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>CAR</th>
                    <th scope="col" className="px-4 py-4 text-right">VERDICT</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v, i) => (
                    <tr key={v.entry.code} className={ROW}>
                      <td className="px-4 py-3"><Pos n={i + 1} /></td>
                      <td className={TD}>
                        <DriverCell name={v.entry.name} code={v.entry.code} color={v.entry.team_color ?? null} team={v.entry.team} />
                        {v.entry.provisional && <span className="ml-4 font-mono text-[10px] uppercase tracking-widest text-red-400">STILL_LEARNING</span>}
                      </td>
                      <td className={`${TD} hidden text-zinc-400 md:table-cell`}>{v.entry.team}</td>
                      <td className={`${TD} hidden text-right text-zinc-300 sm:table-cell`}>{ordinal(v.driverRank)}</td>
                      <td className={`${TD} hidden text-right text-zinc-300 sm:table-cell`}>{ordinal(v.carRank)}</td>
                      <td className="px-4 py-3 text-right">
                        <span title={VERDICT_TEXT[v.verdict].meaning} className={`inline-block whitespace-nowrap rounded-sm border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${VERDICT_STYLE[v.verdict]}`}>
                          {VERDICT_TEXT[v.verdict].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
              <p className="text-xs text-zinc-500">
                “As a driver” and “Car” are ranks among the {model.drivers} drivers and {model.cars} cars rated. Drivers in the same car share the car's rank.
                “Still learning” means fewer than 15 races so far, so the rating can still move a lot.
              </p>
              <p className="rounded-sm glass p-4 text-sm text-zinc-400">
                <span className="font-semibold text-zinc-200">Read these as estimates, not verdicts.</span> A driver is judged against their teammates, so
                someone beside a very strong teammate can look weaker than they are. The model only sees results, not the car's true pace.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

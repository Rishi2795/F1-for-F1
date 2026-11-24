import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { describeMissing } from "../lib/format";
import { ErrorState, Skeleton } from "../components/ui/states";
import { RatingModelSection } from "../components/ratings/modelcard";
import type { BundleMeta, Coverage } from "../types/api";

const SOURCES = [
  { name: "Jolpica-F1", years: "1950 to now", gives: "Results, grid, official standings (sprint points included), pit stops, champions." },
  { name: "TracingInsights", years: "2018 to now", gives: "Every lap: lap time, tyre compound and age, stint, track status, weather." },
  { name: "OpenF1", years: "2023 to now", gives: "Independent tyre-stint data, used to cross-check and to fill compounds the lap archive is missing." },
];

const RULES = [
  ["Blank, never guessed.", "If a value is missing it shows as “—”. We never substitute a plausible-looking number."],
  ["Tyre gaps are filled only with proof.", "A run of laps with no tyre data is joined to its neighbouring stint only if the official pit record shows no stop between them, because a tyre cannot change without a stop. Each such value is marked as inferred."],
  ["Two sources must agree.", "From 2023 every stint's tyre compound is compared with OpenF1 in stint order. A second source fills a gap only when it agrees with the official stop count for that driver."],
  ["Nothing replaces better data with worse.", "A re-run can never overwrite a complete race with a partial one, and every data change is written to a tamper-evident audit log."],
];

const LIMITS = [
  "Race pages show race points only; the standings pages use the official totals, which include sprint points.",
  "“Strategy risk” and “verdict” are simple rules. Only the driver and car ratings are machine-learned.",
  "Lap numbering can differ by a lap between sources after red flags; stints are compared in order, not by lap number.",
  "A few races have partial tyre data because no free source has it (listed above).",
];

export default function Methodology() {
  useDocumentTitle("Methodology and data coverage");
  const coverage = useApi<Coverage>("/coverage");
  const meta = useApi<BundleMeta>("/meta").data;

  const seasons = coverage.data ? Object.entries(coverage.data.seasons).sort((a, b) => Number(b[0]) - Number(a[0])) : [];
  const partial = seasons.flatMap(([year, s]) => s.races.filter((r) => r.status === "partial").map((r) => ({ year, ...r })));

  return (
    <div className="min-h-screen bg-[#050505] px-4 pb-24 pt-16 text-zinc-300 md:px-8">
      <div className="mx-auto max-w-3xl space-y-14">
        <header>
          <p className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-red-500">
            <span aria-hidden="true" className="h-px w-10 bg-red-600" />
            Methodology
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-5xl">How the numbers are made</h1>
          <p className="mt-3 text-zinc-400">Where the data comes from, how gaps are handled, and exactly how complete it is right now.</p>
          {meta?.generated_at && <p className="mt-2 text-sm text-zinc-500">Data last built {new Date(meta.generated_at).toLocaleString()}.</p>}
        </header>

        <section aria-labelledby="sources-h" className="space-y-4">
          <h2 id="sources-h" className="text-2xl font-extrabold text-white">Where the data comes from</h2>
          <p>Everything is free and open; nothing needs an account, a key or a subscription.</p>
          <ul className="grid gap-3 md:grid-cols-3">
            {SOURCES.map((s) => (
              <li key={s.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="font-bold text-white">{s.name}</p>
                <p className="text-xs text-zinc-500">{s.years}</p>
                <p className="mt-2 text-sm">{s.gives}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="rules-h" className="space-y-4">
          <h2 id="rules-h" className="text-2xl font-extrabold text-white">How gaps are handled</h2>
          <dl className="space-y-4">
            {RULES.map(([term, text]) => (
              <div key={term}>
                <dt className="font-semibold text-white">{term}</dt>
                <dd className="text-zinc-400">{text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="coverage-h" className="space-y-4">
          <h2 id="coverage-h" className="text-2xl font-extrabold text-white">How complete is it?</h2>
          {coverage.loading && <Skeleton className="h-64" />}
          {coverage.error && <ErrorState error={coverage.error} onRetry={coverage.reload} subject="report" />}
          {coverage.data && (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Races by completeness for each season</caption>
                  <thead className="bg-white/5 text-xs uppercase tracking-wide text-zinc-400">
                    <tr>
                      <th scope="col" className="px-4 py-3">Season</th>
                      <th scope="col" className="px-4 py-3 text-right">Complete</th>
                      <th scope="col" className="px-4 py-3 text-right">Partial</th>
                      <th scope="col" className="px-4 py-3 text-right">Upcoming</th>
                      <th scope="col" className="px-4 py-3">Coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasons.map(([year, s]) => (
                      <tr key={year} className="border-t border-white/5">
                        <th scope="row" className="px-4 py-3 font-semibold text-white">{year}</th>
                        <td className="px-4 py-3 text-right font-mono">{s.ok}</td>
                        <td className="px-4 py-3 text-right font-mono">{s.partial}</td>
                        <td className="px-4 py-3 text-right font-mono">{s.scheduled}</td>
                        <td className="w-40 px-4 py-3">
                          <span aria-hidden="true" className="flex h-2 overflow-hidden rounded-full bg-white/10">
                            <span className="bg-emerald-500" style={{ width: `${(s.ok / s.expected_rounds) * 100}%` }} />
                            <span className="bg-amber-500" style={{ width: `${(s.partial / s.expected_rounds) * 100}%` }} />
                          </span>
                          <span className="sr-only">{s.ok} of {s.expected_rounds} complete</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {partial.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold text-white">Races with partial data</h3>
                  <ul className="space-y-1 text-sm">
                    {partial.map((r) => (
                      <li key={`${r.year}-${r.round}`}>
                        <Link to={`/race/${r.year}/${r.round}`} className="text-red-400 underline-offset-4 hover:underline">
                          {r.year} {r.event_name}
                        </Link>{" "}
                        <span className="text-zinc-500">· missing {describeMissing(r.missing)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>

        <RatingModelSection />

        <section aria-labelledby="limits-h" className="space-y-3">
          <h2 id="limits-h" className="text-2xl font-extrabold text-white">Things to keep in mind</h2>
          <ul className="list-disc space-y-2 pl-5 text-zinc-400">
            {LIMITS.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

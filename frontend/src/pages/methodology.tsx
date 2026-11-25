import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { describeMissing } from "../lib/format";
import { ErrorState, Skeleton } from "../components/ui/states";
import { ForecastModelSection } from "../components/forecast/modelsection";
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

const ANALYTICS: [string, string][] = [
  ["Worth watching.", "A 0 to 10 score from real signals: on-track passes (a car that was behind is ahead a lap later, and neither pitted), how far drivers moved between grid and finish, a close finish, safety-car laps, retirements and lead changes. Each is ranked against every race since 2020, so 5 is typical and 9 is exceptional."],
  ["Qualifying.", "Positions and lap times come from Jolpica. The gap is each driver's best qualifying lap against the pole lap. When upstream lists two drivers in the same position, the faster lap breaks the tie."],
  ["Tyre model.", "For each race: lap time = driver + compound + wear × tyre age + fuel × lap number, fitted on clean green-flag laps with each driver's own average removed. Fuel burn is estimated from the data, not assumed. A race is dropped, not shown, if the fit is not physically sensible (cars getting slower as fuel burns, a softer tyre priced slower than a harder one, a red flag, wet tyres). About four in ten races pass."],
  ["Strategy what-if.", "The same tyre model prices other stop plans. It counts tyre wear, compound pace and pit loss only: traffic, safety cars, weather and the undercut are ignored, so the gap is a direction, not a verdict."],
  ["Teammate duels.", "A pair needs three races together. Qualifying counts sessions where both set a time; the race counts only when both were classified; race pace is the median clean-lap difference."],
  ["Race lab.", "Gap to the leader is exact: it is the difference between when each car and the leader crossed the line, from the timing archive. Pace distribution and track evolution use clean laps only. Flags come from the track-status code of every driver's lap. An undercut is counted when a car stopped within four laps before the car directly ahead of it, with no safety car or red flag in between, and succeeded if it was ahead once both had stopped."],
  ["Team pace.", "Each team's quicker driver's median clean lap against the quickest car that weekend, as a percentage so tracks of different length compare. Improving or fading compares the first and second half of the season."],
  ["Circuits.", "Everything since 2020, grouped by location. The overtaking rank compares average on-track passes across all circuits."],
];

const LIMITS = [
  "Race pages show race points only; the standings pages use the official totals, which include sprint points.",
  "The driver and car ratings and the race and title forecasts are the only machine-learned parts; everything else is arithmetic on official results.",
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
    <div className="min-h-screen px-5 pb-24 pt-16 text-zinc-300 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl space-y-14">
        <header>
          <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-400">
            <span aria-hidden="true" className="h-2 w-2 bg-red-600" />
            REGISTRY // METHODOLOGY
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase italic leading-[0.95] tracking-tighter text-white md:text-6xl">How the numbers are <span className="text-red-500">made</span></h1>
          <p className="mt-3 text-zinc-400">Where the data comes from, how gaps are handled, and exactly how complete it is right now.</p>
          {meta?.generated_at && <p className="mt-2 text-sm text-zinc-500">Data last built {new Date(meta.generated_at).toLocaleString()}.</p>}
        </header>

        <section aria-labelledby="sources-h" className="space-y-4">
          <h2 id="sources-h" className="text-2xl font-black uppercase italic tracking-tighter text-white md:text-3xl">Where the data comes from</h2>
          <p>Everything is free and open; nothing needs an account, a key or a subscription.</p>
          <ul className="grid gap-3 md:grid-cols-3">
            {SOURCES.map((s) => (
              <li key={s.name} className="rounded-sm glass p-4">
                <p className="font-bold text-white">{s.name}</p>
                <p className="text-xs text-zinc-500">{s.years}</p>
                <p className="mt-2 text-sm">{s.gives}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="rules-h" className="space-y-4">
          <h2 id="rules-h" className="text-2xl font-black uppercase italic tracking-tighter text-white md:text-3xl">How gaps are handled</h2>
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
          <h2 id="coverage-h" className="text-2xl font-black uppercase italic tracking-tighter text-white md:text-3xl">How complete is it?</h2>
          {coverage.loading && <Skeleton className="h-64" />}
          {coverage.error && <ErrorState error={coverage.error} onRetry={coverage.reload} subject="report" />}
          {coverage.data && (
            <>
              <div className="relative overflow-x-auto rounded-sm border border-white/10">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Races by completeness for each season</caption>
                  <thead className="bg-white/5 text-xs uppercase tracking-wide text-zinc-400">
                    <tr>
                      <th scope="col" className="px-4 py-3">SEASON</th>
                      <th scope="col" className="px-4 py-3 text-right">COMPLETE</th>
                      <th scope="col" className="px-4 py-3 text-right">PARTIAL</th>
                      <th scope="col" className="px-4 py-3 text-right">UPCOMING</th>
                      <th scope="col" className="px-4 py-3">COVERAGE</th>
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
                            <span className="bg-white" style={{ width: `${(s.ok / s.expected_rounds) * 100}%` }} />
                            <span className="bg-red-500" style={{ width: `${(s.partial / s.expected_rounds) * 100}%` }} />
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

        <section id="analytics" aria-labelledby="analytics-h" className="scroll-mt-20 space-y-4">
          <h2 id="analytics-h" className="text-2xl font-black uppercase italic tracking-tighter text-white md:text-3xl">THE_EXTRA_ANALYTICS</h2>
          <ul className="space-y-3 text-zinc-400">
            {ANALYTICS.map(([title, body]) => (
              <li key={title}><b className="text-zinc-200">{title}</b> {body}</li>
            ))}
          </ul>
        </section>

        <RatingModelSection />

        <ForecastModelSection />

        <section aria-labelledby="limits-h" className="space-y-3">
          <h2 id="limits-h" className="text-2xl font-black uppercase italic tracking-tighter text-white md:text-3xl">Things to keep in mind</h2>
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

import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { describeMissing } from "../lib/format";
import { ErrorState, Skeleton } from "../components/ui/states";
import { PageHead } from "../components/ui/pagehead";
import { StatBoard } from "../components/ui/statboard";
import { Chapter, Toc, type TocEntry } from "../components/methodology/chapter";
import { ModelCard } from "../components/sim/modelcard";
import type { SimModel } from "../lib/sim/types";
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

const TOC: TocEntry[] = [
  { id: "sources", label: "Where it comes from" },
  { id: "rules", label: "How gaps are handled" },
  { id: "coverage", label: "How complete it is" },
  { id: "analytics", label: "The extra analytics" },
  { id: "ratings", label: "The ratings model" },
  { id: "forecast", label: "The forecasts" },
  { id: "simulator", label: "The strategy simulator" },
  { id: "limits", label: "Things to keep in mind" },
];
const ACCENT = ["border-t-red-500", "border-t-white", "border-t-amber-400"];

export default function Methodology() {
  useDocumentTitle("Methodology and data coverage");
  const coverage = useApi<Coverage>("/coverage");
  const meta = useApi<BundleMeta>("/meta").data;
  const sim = useApi<SimModel>("/simulator/model");

  const seasons = coverage.data ? Object.entries(coverage.data.seasons).sort((a, b) => Number(b[0]) - Number(a[0])) : [];
  const partial = seasons.flatMap(([year, s]) => s.races.filter((r) => r.status === "partial").map((r) => ({ year, ...r })));
  const complete = seasons.reduce((n, [, s]) => n + s.ok, 0);

  return (
    <div className="min-h-screen pb-24 pt-10 text-zinc-300 md:pt-12">
      <div className="page space-y-10">
        <PageHead kicker="METHODOLOGY" title="How the numbers are" accent="made" intro="Where the data comes from, how gaps are handled, how each model works, and exactly how complete and how accurate it all is right now.">
          {meta?.generated_at && <p className="mt-3 text-sm text-zinc-500">Data last built {new Date(meta.generated_at).toLocaleString()}.</p>}
        </PageHead>

        <StatBoard
          label="The numbers behind the numbers"
          items={[
            { label: "Races fully covered", value: complete, sub: seasons.length ? `across ${seasons.length} seasons` : "loading", headline: true },
            { label: "Free sources", value: SOURCES.length, sub: "no account, no key" },
            { label: "Models", value: 3, sub: "ratings, forecasts, simulator" },
            { label: "Rule for gaps", value: "Blank", sub: "never a guess" },
          ]}
        />

        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
          <Toc entries={TOC} />

          <div className="min-w-0 space-y-14">
            <Chapter id="sources" n="01" title="Where the data comes from" lead="Everything is free and open; nothing needs an account, a key or a subscription.">
              <ul className="grid gap-3 md:grid-cols-3">
                {SOURCES.map((s, i) => (
                  <li key={s.name} className={`rounded-sm border border-white/10 border-t-2 ${ACCENT[i % ACCENT.length]} bg-white/[0.03] p-5`}>
                    <p className="text-lg font-bold text-white">{s.name}</p>
                    <p className="mt-1 inline-block rounded-sm border border-white/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-300">{s.years}</p>
                    <p className="mt-3 text-sm text-zinc-300">{s.gives}</p>
                  </li>
                ))}
              </ul>
            </Chapter>

            <Chapter id="rules" n="02" title="How gaps are handled" lead="Four rules that decide what you see when the data is incomplete.">
              <ul className="grid gap-3 md:grid-cols-2">
                {RULES.map(([term, text], i) => (
                  <li key={term} className="flex gap-4 rounded-sm border border-white/10 bg-white/[0.03] p-5">
                    <span aria-hidden="true" className="font-serif text-3xl leading-none text-red-500">{i + 1}</span>
                    <div>
                      <p className="font-semibold text-white">{term}</p>
                      <p className="mt-1 text-sm text-zinc-400">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Chapter>

            <Chapter id="coverage" n="03" title="How complete is it?" lead="Every race, season by season. White is complete, red is partial.">
              {coverage.loading && <Skeleton className="h-64" />}
              {coverage.error && <ErrorState error={coverage.error} onRetry={coverage.reload} subject="report" />}
              {coverage.data && (
                <>
                  <div className="relative overflow-x-auto rounded-sm glass">
                    <table className="w-full text-left text-sm">
                      <caption className="sr-only">Races by completeness for each season</caption>
                      <thead className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">
                        <tr>
                          <th scope="col" className="px-4 py-3 font-normal">SEASON</th>
                          <th scope="col" className="px-4 py-3 text-right font-normal">COMPLETE</th>
                          <th scope="col" className="px-4 py-3 text-right font-normal">PARTIAL</th>
                          <th scope="col" className="px-4 py-3 text-right font-normal">UPCOMING</th>
                          <th scope="col" className="px-4 py-3 font-normal">COVERAGE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seasons.map(([year, s]) => (
                          <tr key={year} className="border-t border-white/[0.06] transition-colors hover:bg-white/[0.04]">
                            <th scope="row" className="px-4 py-2.5 font-serif text-xl font-normal text-white">{year}</th>
                            <td className="px-4 py-2.5 text-right font-mono text-white">{s.ok}</td>
                            <td className={`px-4 py-2.5 text-right font-mono ${s.partial ? "text-red-400" : "text-zinc-500"}`}>{s.partial}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-zinc-400">{s.scheduled}</td>
                            <td className="w-44 px-4 py-2.5">
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
                      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-300">Races with partial data</h3>
                      <ul className="flex flex-wrap gap-2 text-sm">
                        {partial.map((r) => (
                          <li key={`${r.year}-${r.round}`} className="rounded-sm border border-red-500/30 bg-red-500/[0.06] px-3 py-1.5">
                            <Link to={`/race/${r.year}/${r.round}`} className="text-red-300 underline-offset-4 hover:underline">
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
            </Chapter>

            <Chapter id="analytics" n="04" title="The extra analytics" lead="The pages beyond results and standings, and the arithmetic behind each.">
              <ul className="grid gap-3 md:grid-cols-2">
                {ANALYTICS.map(([title, body]) => (
                  <li key={title} className="rounded-sm border border-white/10 bg-white/[0.03] p-5">
                    <p className="font-semibold text-white">{title.replace(/\.$/, "")}</p>
                    <p className="mt-2 text-sm text-zinc-400">{body}</p>
                  </li>
                ))}
              </ul>
            </Chapter>

            <div className="rounded-sm border border-white/10 bg-white/[0.02] p-5 md:p-7"><RatingModelSection n="05" /></div>

            <div className="rounded-sm border border-white/10 bg-white/[0.02] p-5 md:p-7"><ForecastModelSection n="06" /></div>

            <Chapter id="simulator" n="07" title="The strategy simulator" lead="A model fitted from real laps, then used to play out whole races. What is measured and what is assumed are kept apart.">
              {sim.loading && <Skeleton className="h-64" />}
              {sim.data && <div className="rounded-sm border border-white/10 bg-white/[0.03] p-5 md:p-7"><ModelCard model={sim.data} /></div>}
              <p className="text-sm text-zinc-400">Try it on the <Link to="/simulation" className="text-zinc-200 underline underline-offset-4 hover:text-white">strategy simulator</Link>.</p>
            </Chapter>

            <Chapter id="limits" n="08" title="Things to keep in mind">
              <ul className="space-y-3">
                {LIMITS.map((l) => (
                  <li key={l} className="rounded-sm border border-white/10 border-l-[3px] border-l-amber-400 bg-amber-400/[0.05] p-4 text-sm text-zinc-300">{l}</li>
                ))}
              </ul>
            </Chapter>
          </div>
        </div>
      </div>
    </div>
  );
}

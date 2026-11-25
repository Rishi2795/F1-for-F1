import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useLocalState } from "../hooks/useLocalState";
import { ErrorState, Skeleton } from "../components/ui/states";
import { PageHead } from "../components/ui/pagehead";
import { chip } from "../components/ui/chipstyle";
import { readableOnDark } from "../lib/color";
import { pct } from "../lib/forecast";
import { VERDICT_TEXT, ordinal, rateAll } from "../lib/ratings";
import type { DuelsDoc, NextForecasts, RatingsCurrent, TitleForecast } from "../types/api";

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass-cell p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{label}</p>
      <p className="mt-2 font-serif text-4xl text-white">{value}</p>
      {sub && <p className="mt-1 text-sm text-zinc-400">{sub}</p>}
    </div>
  );
}

export default function My() {
  useDocumentTitle("My driver");
  const [fav, setFav] = useLocalState<string>("f1.my", "");
  const ratings = useApi<RatingsCurrent>("/ratings");
  const next = useApi<NextForecasts>("/predictions/next");
  const title = useApi<TitleForecast>("/predictions/championship");
  const duels = useApi<DuelsDoc>(ratings.data ? `/seasons/${ratings.data.season}/duels` : null);
  const model = useMemo(() => (ratings.data ? rateAll(ratings.data.ratings) : null), [ratings.data]);
  const mine = model?.views.find((v) => v.entry.code === fav);
  const race = next.data?.races[0];
  const forecast = race?.drivers.find((d) => d.code === fav);
  const standing = title.data?.drivers.find((d) => d.code === fav);
  const standingRank = title.data ? [...title.data.drivers].sort((a, b) => b.points - a.points).findIndex((d) => d.code === fav) + 1 : 0;
  const duel = duels.data?.duels.find((d) => d.a.code === fav || d.b.code === fav);
  const mate = duel ? (duel.a.code === fav ? duel.b : duel.a) : null;
  const q = duel ? (duel.a.code === fav ? [duel.qualifying.a, duel.qualifying.b] : [duel.qualifying.b, duel.qualifying.a]) : null;
  const r = duel ? (duel.a.code === fav ? [duel.race.a, duel.race.b] : [duel.race.b, duel.race.a]) : null;

  return (
    <div className="min-h-screen px-5 pb-32 pt-16 text-zinc-300 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl space-y-10">
        <PageHead kicker="MY_F1" title="My" accent="driver" intro="Pick your driver once. This page becomes your weekend briefing: their chances next race, the title picture, and how they stack up against their teammate. Saved on this device only." />
        {ratings.loading && <Skeleton className="h-40" />}
        {ratings.error && <ErrorState error={ratings.error} onRetry={ratings.reload} subject="drivers" />}
        {ratings.data && (
          <div role="group" aria-label="Choose your driver" className="flex flex-wrap gap-2">
            {ratings.data.ratings.map((r2) => (
              <button key={r2.code} type="button" aria-pressed={fav === r2.code} onClick={() => setFav(r2.code)} className={chip(fav === r2.code)}>
                <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: readableOnDark(`#${(r2.team_color ?? "888888").replace("#", "")}`) }} />
                {r2.name.split(" ").at(-1)}
              </button>
            ))}
          </div>
        )}
        {!fav && ratings.data && <p className="border border-dashed border-white/15 p-8 text-center text-zinc-400">Choose a driver above to see your briefing.</p>}
        {fav && mine && (
          <section aria-label={`Briefing for ${mine.entry.name}`} className="f1-rise space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{(mine.entry.team ?? "").toUpperCase().replace(/\s+/g, "_")}</p>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white md:text-5xl">{mine.entry.name}</h2>
              </div>
              <Link to={`/driver/${fav}`} className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-300 underline underline-offset-4 hover:text-white">FULL_PROFILE →</Link>
            </div>
            <div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
              {forecast && race ? <Tile label={`${race.event_name.replace(" Grand Prix", "").toUpperCase()}_WIN`} value={pct(forecast.win)} sub={`podium ${pct(forecast.podium)} · points ${pct(forecast.top10)}`} /> : <Tile label="NEXT_RACE" value="—" sub="no race left this season" />}
              {standing && title.data ? <Tile label="TITLE" value={standing.champion >= 0.005 ? pct(standing.champion) : `P${standingRank}`} sub={`${standing.points} points · P${standingRank} in the standings`} /> : <Tile label="TITLE" value="—" />}
              <Tile label="AS_A_DRIVER" value={ordinal(mine.driverRank)} sub={`of ${model?.drivers} rated drivers`} />
              <Tile label="VERDICT" value={VERDICT_TEXT[mine.verdict].label} sub={VERDICT_TEXT[mine.verdict].meaning} />
            </div>
            {duel && mate && q && r && (
              <p className="max-w-3xl text-lg text-zinc-300">
                Against {mate.name} this season: <b className="text-white">{q[0]}–{q[1]}</b> in qualifying and <b className="text-white">{r[0]}–{r[1]}</b> on Sundays.{" "}
                <Link to="/duels" className="text-zinc-400 underline underline-offset-4 hover:text-white">All duels</Link>
              </p>
            )}
            <p className="text-xs text-zinc-500">Chances come from the forecast model; read them as probabilities, not promises.</p>
          </section>
        )}
      </div>
    </div>
  );
}

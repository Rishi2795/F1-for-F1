import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ErrorState, Skeleton } from "../components/ui/states";
import { PageHead } from "../components/ui/pagehead";
import { SeasonChips } from "../components/ui/seasonchips";
import { readableOnDark } from "../lib/color";
import type { Duel, DuelsDoc } from "../types/api";

/** "20 to 4" as a split bar, the side that is ahead in white and the other grey. */
function Split({ label, a, b, aName, bName, color }: { label: string; a: number; b: number; aName: string; bName: string; color: string }) {
  const total = a + b || 1;
  return (
    <div role="img" aria-label={`${label}: ${aName} ${a}, ${bName} ${b}`}>
      <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">
        <span>{aName}</span><span>{label}</span><span>{bName}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="w-8 text-right font-serif text-xl text-white">{a}</span>
        <span aria-hidden="true" className="flex h-1.5 flex-1 gap-px bg-white/10">
          <span className="f1-grow-x" style={{ width: `${(a / total) * 100}%`, backgroundColor: a >= b ? color : "#52525b" }} />
          <span className="f1-grow-x" style={{ width: `${(b / total) * 100}%`, backgroundColor: b > a ? color : "#52525b" }} />
        </span>
        <span className="w-8 font-serif text-xl text-white">{b}</span>
      </div>
    </div>
  );
}

function verdict(d: Duel): string {
  const last = (n: string) => n.split(" ").at(-1) as string;
  const A = last(d.a.name), B = last(d.b.name);
  const q = d.qualifying.a === d.qualifying.b ? null : d.qualifying.a > d.qualifying.b ? A : B;
  const r = d.race.a === d.race.b ? null : d.race.a > d.race.b ? A : B;
  if (q && r && q === r) return `${q} had the edge in both qualifying and the race.`;
  if (q && r) return `${q} was quicker over one lap; ${r} came out ahead on Sundays.`;
  if (q) return `${q} was quicker over one lap; Sundays were even.`;
  if (r) return `${r} came out ahead on Sundays; qualifying was even.`;
  return "Too close to call.";
}

export default function Duels() {
  useDocumentTitle("Teammate duels");
  const seasons = useApi<{ seasons: number[] }>("/seasons").data?.seasons ?? [];
  const [picked, setPicked] = useState<number | null>(null);
  const season = picked ?? (seasons.length ? Math.max(...seasons) : null);
  const duels = useApi<DuelsDoc>(season ? `/seasons/${season}/duels` : null);

  return (
    <div className="min-h-screen pb-32 pt-16 text-zinc-300">
      <div className="page space-y-10">
        <PageHead
          kicker="DUELS"
          title="Teammate"
          accent="duels"
          intro="Two drivers, the same car: the cleanest comparison in the sport. Qualifying, race results and race pace, season by season."
        />
        {seasons.length > 0 && season && <SeasonChips seasons={seasons} value={season} onChange={setPicked} />}
        {duels.loading && <Skeleton className="h-[480px]" />}
        {duels.error && <ErrorState error={duels.error} onRetry={duels.reload} subject="duels" />}
        <div className="grid gap-px border border-white/10 bg-white/10 lg:grid-cols-2">
          {duels.data?.duels.map((d, i) => {
            const color = readableOnDark(`#${(d.team_color ?? "888888").replace("#", "")}`);
            const aName = d.a.code, bName = d.b.code;
            return (
              <article key={`${d.team}-${d.a.code}-${d.b.code}`} className="f1-rise space-y-5 glass-cell p-6" style={{ "--d": `${Math.min(i, 8) * 50}ms`, boxShadow: `inset 3px 0 0 ${color}` } as React.CSSProperties}>
                <header>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{d.team.toUpperCase().replace(/\s+/g, "_")} // {d.races}_RACES_TOGETHER</p>
                  <h2 className="mt-2 text-2xl font-black uppercase italic tracking-tighter text-white">
                    <Link to={`/driver/${d.a.code}`} className="hover:text-red-500">{d.a.name}</Link>
                    <span className="mx-2 font-serif text-base font-normal not-italic text-zinc-500">vs</span>
                    <Link to={`/driver/${d.b.code}`} className="hover:text-red-500">{d.b.name}</Link>
                  </h2>
                </header>
                <Split label="QUALIFYING" a={d.qualifying.a} b={d.qualifying.b} aName={aName} bName={bName} color={color} />
                <Split label="RACE_RESULT" a={d.race.a} b={d.race.b} aName={aName} bName={bName} color={color} />
                <dl className="grid grid-cols-2 gap-px border border-white/10 bg-white/10 text-sm">
                  <div className="glass-cell p-3">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">RACE_PACE</dt>
                    <dd className="mt-1 font-serif text-xl text-white">
                      {d.pace_gap_s === null ? "—" : d.pace_gap_s === 0 ? "level" : `${d.pace_gap_s < 0 ? aName : bName} +${Math.abs(d.pace_gap_s).toFixed(2)}s`}
                    </dd>
                    <dd className="text-xs text-zinc-500">quicker per lap, typical lap, {d.pace_races} races</dd>
                  </div>
                  <div className="glass-cell p-3">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">POINTS</dt>
                    <dd className="mt-1 font-serif text-xl text-white">{d.points_a} – {d.points_b}</dd>
                    <dd className="text-xs text-zinc-500">{aName} – {bName}, sprints included</dd>
                  </div>
                </dl>
                <p className="text-sm text-zinc-300">{verdict(d)}</p>
                {(d.only_a_finished > 0 || d.only_b_finished > 0) && (
                  <p className="text-xs text-zinc-500">One driver finished while the other did not: {aName} {d.only_a_finished} times, {bName} {d.only_b_finished} times. Those races are left out of the race result score.</p>
                )}
              </article>
            );
          })}
        </div>
        {duels.data && duels.data.duels.length === 0 && <p className="text-zinc-400">No teammate pairs raced three or more times together in {season}.</p>}
        <p className="text-xs text-zinc-500">A pair needs at least three races together. Race pace is the median clean-lap time difference. Qualifying counts only sessions where both set a time.</p>
      </div>
    </div>
  );
}

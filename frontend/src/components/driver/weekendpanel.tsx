import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { pct } from "../../lib/forecast";
import type { DuelsDoc, NextForecasts, TitleForecast } from "../../types/api";

/** For a driver on this season's grid: their chances next race, in the title fight, and against their teammate. */
export function WeekendPanel({ code }: { code: string }) {
  const next = useApi<NextForecasts>("/predictions/next").data;
  const title = useApi<TitleForecast>("/predictions/championship").data;
  const duels = useApi<DuelsDoc>(title ? `/seasons/${title.season}/duels` : null).data;
  const race = next?.races[0];
  const f = race?.drivers.find((d) => d.code === code);
  const t = title?.drivers.find((d) => d.code === code);
  const duel = duels?.duels.find((d) => d.a.code === code || d.b.code === code);
  if (!f && !t && !duel) return null;
  const mine = duel && (duel.a.code === code ? 0 : 1);
  const pair = (x: { a: number; b: number }) => (mine === 0 ? `${x.a}–${x.b}` : `${x.b}–${x.a}`);
  const mate = duel && (mine === 0 ? duel.b.name : duel.a.name);
  return (
    <section aria-labelledby="weekend-h" className="glass p-6">
      <h3 id="weekend-h" className="mb-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-400"><span aria-hidden="true" className="h-2 w-2 bg-red-600" />THIS_WEEKEND_AND_SEASON</h3>
      <div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-3">
        {f && race && (
          <div className="glass-cell p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{race.event_name.replace(" Grand Prix", "").toUpperCase()}_WIN</p>
            <p className="mt-2 font-serif text-3xl text-white">{pct(f.win)}</p>
            <p className="text-xs text-zinc-500">podium {pct(f.podium)} · points {pct(f.top10)}</p>
          </div>
        )}
        {t && title && (
          <div className="glass-cell p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{title.season}_TITLE</p>
            <p className="mt-2 font-serif text-3xl text-white">{t.champion >= 0.005 ? pct(t.champion) : "out"}</p>
            <p className="text-xs text-zinc-500">{t.points} points</p>
          </div>
        )}
        {duel && mate && (
          <div className="glass-cell p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">VS_TEAMMATE</p>
            <p className="mt-2 font-serif text-3xl text-white">{pair(duel.qualifying)}</p>
            <p className="text-xs text-zinc-500">qualifying against {mate.split(" ").at(-1)} · race {pair(duel.race)}</p>
          </div>
        )}
      </div>
      <p className="mt-4 text-xs text-zinc-500">From the <Link to="/forecast" className="underline underline-offset-4 hover:text-zinc-300">forecast</Link> and <Link to="/duels" className="underline underline-offset-4 hover:text-zinc-300">teammate duels</Link>.</p>
    </section>
  );
}

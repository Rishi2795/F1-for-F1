import { Link, useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ErrorState, Skeleton } from "../components/ui/states";
import { PageHead } from "../components/ui/pagehead";
import { DataTable } from "../components/ui/datatable";
import { HEAD, ROW, TD, TH } from "../components/ui/tablestyle";
import { TrackArt } from "../components/circuit/trackart";
import { ordinal } from "../lib/ratings";
import type { CircuitDoc, CircuitIndexEntry } from "../types/api";

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass-cell p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{label}</p>
      <p className="mt-2 font-serif text-3xl text-white">{value}</p>
      {sub && <p className="mt-1 text-sm text-zinc-400">{sub}</p>}
    </div>
  );
}

export default function Circuit() {
  const { slug = "" } = useParams();
  const { data: c, error, loading, reload } = useApi<CircuitDoc>(slug ? `/circuits/${slug}` : null);
  const all = useApi<CircuitIndexEntry[]>("/circuits").data;
  useDocumentTitle(c ? `${c.location}: what to expect` : "Circuit");

  if (loading) return <div className="min-h-screen px-8 pt-24"><Skeleton className="mx-auto h-96 max-w-5xl" /></div>;
  if (!c) return <div className="min-h-screen"><ErrorState error={error} onRetry={reload} subject="circuit" backTo={{ href: "/circuits", label: "All circuits" }} /></div>;
  const visits = c.races.length;
  return (
    <div className="min-h-screen px-5 pb-32 pt-16 text-zinc-300 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl space-y-12">
        <Link to="/circuits" className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400 hover:text-white">← ALL_CIRCUITS</Link>
        <PageHead
          align="split"
          kicker={(c.country ?? "CIRCUIT").toUpperCase()}
          title={c.location}
          accent=""
          intro={`${visits} ${visits === 1 ? "race" : "races"} here since 2019. Here is what usually happens.`}
          aside={
            c.outline ? (
              <TrackArt points={c.outline.points} lengthM={c.outline.length_m} source={c.outline.source} name={c.location} />
            ) : c.pole_races > 0 ? (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">POLE_TO_WIN</p>
                <p className="mt-3 font-serif text-6xl text-white">{Math.round((c.pole_wins / c.pole_races) * 100)}%</p>
                <p className="mt-1 text-sm text-zinc-300">the pole sitter won {c.pole_wins} of {c.pole_races}</p>
              </div>
            ) : (
              <p className="text-zinc-400">No qualifying data for this circuit yet.</p>
            )
          }
        />
        {c.next_race && (
          <Link to="/forecast" className="block glass p-5 transition-colors hover:border-white/40" style={{ boxShadow: "inset 3px 0 0 #dc2626" }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-red-500">NEXT_RACE_HERE</p>
            <p className="mt-1 text-xl font-black uppercase italic tracking-tighter text-white">{c.next_race.event_name} · {c.next_race.date}</p>
            <p className="text-sm text-zinc-400">See who the forecast likes →</p>
          </Link>
        )}
        <div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {c.avg_overtakes !== null && <Fact label="OVERTAKING" value={`${c.avg_overtakes}`} sub={`on-track passes per race${c.overtaking_rank && all ? ` · ${ordinal(c.overtaking_rank)} most of ${all.length} circuits` : ""}`} />}
          {c.outline && c.pole_races > 0 && <Fact label="POLE_TO_WIN" value={`${Math.round((c.pole_wins / c.pole_races) * 100)}%`} sub={`the pole sitter won ${c.pole_wins} of ${c.pole_races}`} />}
          <Fact label="SAFETY_CAR" value={`${c.safety_car_races} of ${visits}`} sub={c.red_flag_races ? `races; ${c.red_flag_races} red-flagged` : "races had one"} />
          <Fact label="RETIREMENTS" value={c.avg_retirements.toFixed(1)} sub="cars out per race, on average" />
          {c.avg_winner_stops !== null && <Fact label="WINNER_STOPS" value={c.avg_winner_stops.toFixed(1)} sub={c.typical_winning_tyres ? `typical: ${c.typical_winning_tyres}` : undefined} />}
          {c.avg_excitement !== null && <Fact label="EXCITEMENT" value={`${c.avg_excitement.toFixed(1)}/10`} sub="average, against all circuits" />}
        </div>
        <div className="grid gap-10 md:grid-cols-2">
          {[["MOST_WINS // DRIVERS", c.winners_by_driver], ["MOST_WINS // TEAMS", c.winners_by_team]].map(([label, rows]) => (
            <div key={label as string}>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{label as string}</p>
              <ul className="divide-y divide-white/10 glass">
                {(rows as CircuitDoc["winners_by_driver"]).map((r) => (
                  <li key={r.name} className="flex justify-between px-4 py-3"><span className="text-white">{r.name}</span><span className="font-serif text-xl">{r.count}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div>
          <h2 className="mb-4 text-2xl font-black uppercase italic tracking-tighter text-white">PAST_RACES</h2>
          <DataTable caption={`Past races at ${c.location}, newest first`}>
            <thead className={HEAD}>
              <tr>
                <th scope="col" className="px-4 py-4">YEAR</th>
                <th scope="col" className={TH}>WINNER</th>
                <th scope="col" className={`${TH} hidden sm:table-cell`}>TEAM</th>
                <th scope="col" className={`${TH} hidden text-right md:table-cell`}>FROM_POLE</th>
                <th scope="col" className="px-4 py-4 text-right">EXCITEMENT</th>
              </tr>
            </thead>
            <tbody>
              {[...c.races].reverse().map((r) => (
                <tr key={`${r.season}-${r.round}`} className={ROW}>
                  <td className="px-4 py-3"><Link to={`/race/${r.season}/${r.round}`} className="font-semibold text-white underline-offset-4 hover:underline">{r.season}</Link></td>
                  <td className={`${TD} text-white`}>{r.winner_name ?? "—"}</td>
                  <td className={`${TD} hidden text-zinc-400 sm:table-cell`}>{r.winner_team ?? "—"}</td>
                  <td className={`${TD} hidden text-right font-mono text-zinc-300 md:table-cell`}>{r.winner && r.pole ? (r.winner === r.pole ? "yes" : "no") : "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{r.excitement?.toFixed(1) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      </div>
    </div>
  );
}

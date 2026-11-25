import { Link, useParams, useSearchParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ErrorState, Skeleton } from "../components/ui/states";
import { DataTable } from "../components/ui/datatable";
import { HEAD, ROW, TD, TH } from "../components/ui/tablestyle";
import { TrackGlow } from "../components/circuit/trackglow";
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

/** One big number in a bordered tile, like the stat tiles of a race app. */
function Tile({ label, value, unit, note }: { label: string; value: string; unit?: string; note?: string }) {
  return (
    <div className="rounded-sm border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">{label}</p>
      <p className="mt-2 font-serif text-3xl text-white sm:text-4xl">{value}{unit && <span className="ml-1 text-base text-zinc-400">{unit}</span>}</p>
      {note && <p className="mt-1 text-xs text-zinc-500">{note}</p>}
    </div>
  );
}

const TABS = [["track", "Track"], ["records", "Records"]] as const;

export default function Circuit() {
  const { slug = "" } = useParams();
  const { data: c, error, loading, reload } = useApi<CircuitDoc>(slug ? `/circuits/${slug}` : null);
  const all = useApi<CircuitIndexEntry[]>("/circuits").data;
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "records" ? "records" : "track";
  useDocumentTitle(c ? `${c.location}: what to expect` : "Circuit");

  if (loading) return <div className="min-h-screen pt-24"><div className="page"><Skeleton className="h-96" /></div></div>;
  if (!c) return <div className="min-h-screen"><ErrorState error={error} onRetry={reload} subject="circuit" backTo={{ href: "/circuits", label: "All circuits" }} /></div>;
  const visits = c.races.length;
  const latest = [...c.races].sort((x, y) => y.season - x.season || y.round - x.round).find((r) => r.laps);
  const km = c.outline ? c.outline.length_m / 1000 : null;
  const laps = latest?.laps ?? null;
  const about = [
    `${visits} ${visits === 1 ? "race" : "races"} here since 2019.`,
    c.avg_overtakes !== null ? `Drivers make about ${c.avg_overtakes} on-track passes a race${c.overtaking_rank && all ? `, the ${ordinal(c.overtaking_rank)} most of ${all.length} circuits` : ""}.` : null,
    visits ? `A safety car came out in ${c.safety_car_races} of ${visits} races` + (c.red_flag_races ? ` and the red flag in ${c.red_flag_races}.` : ".") : null,
    c.avg_winner_stops !== null ? `Winners typically stop ${c.avg_winner_stops.toFixed(1)} times${c.typical_winning_tyres ? ` (${c.typical_winning_tyres})` : ""}.` : null,
  ].filter(Boolean).join(" ");
  return (
    <div className="min-h-screen pb-32 pt-10 md:pt-12 text-zinc-300">
      <div className="page space-y-8">
        <Link to="/circuits" className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400 hover:text-white">← ALL_CIRCUITS</Link>
        <header className="f1-rise">
          <h1 className="text-5xl font-black uppercase italic leading-[0.95] tracking-tighter text-white md:text-7xl">{c.location}</h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" /></svg>
            {c.name}{c.country ? ` · ${c.country}` : ""}
          </p>
        </header>

        <div role="tablist" aria-label="Circuit sections" className="grid grid-cols-2 gap-1 rounded-sm border border-white/10 bg-white/[0.03] p-1">
          {TABS.map(([key, label]) => (
            <button key={key} role="tab" id={`tab-${key}`} aria-selected={tab === key} aria-controls={`panel-${key}`} type="button" onClick={() => setParams(key === "track" ? {} : { tab: key }, { replace: true })} className={`rounded-sm py-2.5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 ${tab === key ? "bg-white text-black" : "text-zinc-300 hover:bg-white/10 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "track" && (
          <div role="tabpanel" id="panel-track" aria-labelledby="tab-track" className="space-y-8">
            {c.outline ? (
              <TrackGlow points={c.outline.points} lengthM={c.outline.length_m} name={c.location} />
            ) : c.pole_races > 0 ? (
              <div className="glass p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">POLE_TO_WIN</p>
                <p className="mt-3 font-serif text-6xl text-white">{Math.round((c.pole_wins / c.pole_races) * 100)}%</p>
                <p className="mt-1 text-sm text-zinc-300">the pole sitter won {c.pole_wins} of {c.pole_races}</p>
              </div>
            ) : (
              <p className="text-zinc-400">No track drawing or qualifying data for this circuit yet.</p>
            )}

            <section aria-labelledby="about-h">
              <h2 id="about-h" className="text-2xl font-black uppercase italic tracking-tighter text-white">About</h2>
              <p className="mt-3 max-w-3xl leading-relaxed text-zinc-300">{about}</p>
              {c.outline && <p className="mt-2 text-xs text-zinc-500">The track is drawn from one real lap of car position data, {(c.outline.length_m / 1000).toFixed(2)} km measured from it.</p>}
            </section>

            <div className="grid grid-cols-2 gap-3">
              {km !== null && <Tile label="Circuit length" value={km.toFixed(3)} unit="km" note="from a real lap" />}
              {laps !== null && <Tile label="Number of laps" value={String(laps)} note={`${latest?.season} race`} />}
              {km !== null && laps !== null && <Tile label="Race distance" value={(km * laps).toFixed(1)} unit="km" note="laps × length" />}
              <Tile label="Races here" value={String(visits)} note="since 2019" />
            </div>

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
          </div>
        )}

        {tab === "records" && (
          <div role="tabpanel" id="panel-records" aria-labelledby="tab-records" className="space-y-10">
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
        )}
      </div>
    </div>
  );
}

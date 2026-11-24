import { useMemo, useState, type KeyboardEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ApiRequestError, prefetch } from "../lib/api";
import { ErrorState, Skeleton } from "../components/ui/states";
import { ProgressionChart, type Series } from "../components/standings/progressionchart";
import type { SeasonStandings, StandingsConstructor, StandingsDriver } from "../types/api";

type Tab = "drivers" | "constructors";
const CHART_DEFAULT = 6;
const CHART_MAX = 10;
const FALLBACK = "#a1a1aa";

/** /standings → the latest season. */
export function StandingsRedirect() {
  const { data, error, reload } = useApi<{ seasons: number[] }>("/seasons");
  if (data?.seasons.length) return <Navigate to={`/season/${data.seasons[0]}`} replace />;
  if (error) return <ErrorState error={error} onRetry={reload} subject="season" />;
  return <PageSkeleton />;
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#050505] px-4 pt-20 md:px-8" role="status" aria-label="Loading standings">
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

export default function Standings() {
  const { year = "" } = useParams();
  const navigate = useNavigate();
  const valid = /^\d{4}$/.test(year);
  const seasons = useApi<{ seasons: number[] }>("/seasons").data?.seasons ?? [];
  const { data, error, reload } = useApi<SeasonStandings>(valid ? `/seasons/${year}/standings` : null);
  const [tab, setTab] = useState<Tab>("drivers");
  const [toggles, setToggles] = useState<{ key: string; ids: Set<string> }>({ key: "", ids: new Set() });
  useDocumentTitle(`${year} championship standings`);

  const view = useMemo(() => (data && data.rounds.length ? derive(data, tab) : null), [data, tab]);

  if (!valid) return <Bad />;
  if (error) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <ErrorState error={error} onRetry={reload} subject="season" backTo={{ href: "/explore", label: "All races" }} />
      </div>
    );
  }
  if (!data) return <PageSkeleton />;
  if (!view) return <Bad missing />;

  // A line is on if it is in the default top group, unless the user flipped it. Flips reset per season and tab.
  const toggleKey = `${data.season}-${tab}`;
  const flipped = toggles.key === toggleKey ? toggles.ids : new Set<string>();
  const isOn = (id: string, index: number) => (index < CHART_DEFAULT) !== flipped.has(id);
  const toggle = (id: string) => {
    const next = new Set(flipped);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setToggles({ key: toggleKey, ids: next });
  };
  const shown = view.series.filter((s, i) => isOn(s.id, i));
  const onTabKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setTab((t) => (t === "drivers" ? "constructors" : "drivers"));
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] px-4 pb-32 pt-16 text-zinc-200 md:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-red-600">Championship</p>
            <h1 className="text-4xl font-black italic text-white md:text-5xl">{data.season} standings</h1>
            <p className="mt-1 text-sm text-zinc-400">
              After round {view.last.round} · {view.last.event_name}. Official points, sprints included.
            </p>
          </div>
          <label className="text-sm text-zinc-400">
            Season{" "}
            <select
              value={data.season}
              onChange={(e) => navigate(`/season/${e.target.value}`)}
              className="ml-2 rounded border border-white/15 bg-black px-3 py-2 text-white"
            >
              {(seasons.length ? seasons : [data.season]).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </header>

        <div role="tablist" aria-label="Standings type" className="inline-flex rounded-md border border-white/15 p-1" onKeyDown={onTabKey}>
          {(["drivers", "constructors"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              tabIndex={tab === t ? 0 : -1}
              onClick={() => setTab(t)}
              className={`rounded px-4 py-2 text-sm font-semibold capitalize transition-colors ${tab === t ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={tab === "drivers" ? "Leader" : "Leading team"} value={view.rows[0]?.label ?? "—"} sub={`${view.rows[0]?.points ?? 0} pts`} />
          <Stat label="Lead over 2nd" value={view.rows[1] ? `${view.rows[0].points - view.rows[1].points} pts` : "—"} sub={view.rows[1]?.label} />
          <Stat label="Lead changes" value={String(view.leadChanges)} sub={`across ${data.rounds.length} rounds`} />
          <Stat label="Wins by leader" value={String(view.rows[0]?.wins ?? 0)} sub="race wins only" />
        </section>

        <section aria-labelledby="progress-h" className="space-y-3">
          <h2 id="progress-h" className="text-lg font-bold text-white">
            Points after each round
          </h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose lines to show">
            {view.series.map((s, i) => {
              const on = isOn(s.id, i);
              return (
                <button
                  key={s.id}
                  aria-pressed={on}
                  onClick={() => toggle(s.id)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-opacity ${on ? "border-white/30 text-white" : "border-white/10 text-zinc-500 opacity-60"}`}
                >
                  <svg width="18" height="6" aria-hidden="true">
                    <line x1="0" x2="18" y1="3" y2="3" stroke={s.color} strokeWidth="3" strokeDasharray={s.dashed ? "5 3" : undefined} />
                  </svg>
                  {s.label}
                </button>
              );
            })}
          </div>
          {shown.length === 0 ? (
            <p className="rounded border border-dashed border-white/15 p-6 text-center text-sm text-zinc-400">Pick at least one line to show the chart.</p>
          ) : (
            <ProgressionChart
              series={shown}
              rounds={data.rounds.map((r) => ({ round: r.round, label: r.event_name.replace("Grand Prix", "GP").trim() }))}
              ariaLabel={`Line chart of ${tab} championship points after each of ${data.rounds.length} rounds in ${data.season}. ${view.rows[0]?.label} leads with ${view.rows[0]?.points} points.`}
            />
          )}
        </section>

        <section aria-labelledby="table-h">
          <h2 id="table-h" className="mb-3 text-lg font-bold text-white">
            {tab === "drivers" ? "Drivers' championship" : "Constructors' championship"}
          </h2>
          <div className="overflow-x-auto rounded-md border border-white/10">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <caption className="sr-only">
                {tab} standings after round {view.last.round} of {data.season}
              </caption>
              <thead className="bg-white/5 text-xs uppercase text-zinc-400">
                <tr>
                  <th scope="col" className="px-3 py-3">Pos</th>
                  <th scope="col" className="px-3 py-3">{tab === "drivers" ? "Driver" : "Team"}</th>
                  {tab === "drivers" && <th scope="col" className="px-3 py-3">Team</th>}
                  <th scope="col" className="px-3 py-3 text-right">Points</th>
                  <th scope="col" className="px-3 py-3 text-right">Gap</th>
                  <th scope="col" className="px-3 py-3 text-right">Wins</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                    <td className="px-3 py-2.5 font-mono text-zinc-400">{row.position ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-3">
                        <span className="h-6 w-1 rounded-full" style={{ backgroundColor: row.color }} aria-hidden="true" />
                        {row.href ? (
                          <Link to={row.href} onMouseEnter={() => row.prefetch && prefetch(row.prefetch)} className="font-semibold text-white hover:text-red-500">
                            {row.label}
                          </Link>
                        ) : (
                          <span className="font-semibold text-white">{row.label}</span>
                        )}
                      </span>
                    </td>
                    {tab === "drivers" && <td className="px-3 py-2.5 text-zinc-400">{row.team ?? "—"}</td>}
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-white">{row.points}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-zinc-400">{row.position === 1 ? "—" : `−${view.rows[0].points - row.points}`}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-zinc-300">{row.wins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Source: Jolpica-F1 official standings. Wins count Grand Prix victories only.</p>
        </section>
      </div>
    </div>
  );
}

/** Malformed address, or a season with no standings: say so, never a generic failure. */
function Bad({ missing = false }: { missing?: boolean }) {
  const error = missing
    ? new ApiRequestError("No standings are published for this season.", 404, "not_available", null, null)
    : new ApiRequestError("Invalid link", 422, "invalid_request", null, null);
  return (
    <div className="min-h-screen bg-[#050505]">
      <ErrorState error={error} subject="season" backTo={{ href: "/explore", label: "All races" }} />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-xl font-black text-white">{value}</p>
      {sub && <p className="truncate text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

type Row = { id: string; label: string; team: string | null; color: string; position: number | null; points: number; wins: number; href?: string; prefetch?: string };

const isDriver = (r: StandingsDriver | StandingsConstructor): r is StandingsDriver => "code" in r;

/** Turn the raw standings into table rows, chart lines and a lead-change count for one tab. */
function derive(data: SeasonStandings, tab: Tab) {
  const rounds = data.rounds;
  const last = rounds[rounds.length - 1];
  const finals = tab === "drivers" ? last.drivers : last.constructors;
  const keyOf = (r: StandingsDriver | StandingsConstructor) => (isDriver(r) ? r.code : r.name);

  const rows: Row[] = [...finals]
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
    .map((r) => ({
      id: keyOf(r),
      label: r.name,
      team: isDriver(r) ? r.team : null,
      color: r.team_color ?? FALLBACK,
      position: r.position,
      points: r.points,
      wins: r.wins,
      href: isDriver(r) ? `/driver/${r.code}` : undefined,
      prefetch: isDriver(r) ? `/drivers/${r.code}` : undefined,
    }));

  const usedColors = new Set<string>();
  const series: Series[] = rows.slice(0, CHART_MAX).map((row) => {
    const dashed = usedColors.has(row.color);
    usedColors.add(row.color);
    return {
      id: row.id,
      label: tab === "drivers" ? row.id : row.label,
      color: row.color,
      dashed,
      values: rounds.map((rd) => {
        const list = tab === "drivers" ? rd.drivers : rd.constructors;
        const hit = list.find((x) => keyOf(x) === row.id);
        return hit ? hit.points : null;
      }),
    };
  });

  const leaders = rounds.map((rd) => {
    const list = tab === "drivers" ? rd.drivers : rd.constructors;
    return list.find((x) => x.position === 1)?.name ?? null;
  });
  const leadChanges = leaders.reduce((n, cur, i) => (i > 0 && cur !== leaders[i - 1] ? n + 1 : n), 0);
  return { rows, series, last, leadChanges };
}

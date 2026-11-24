import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ApiRequestError, prefetch } from "../lib/api";
import { readableOnDark } from "../lib/color";
import { ErrorState, Skeleton } from "../components/ui/states";
import { ProgressionChart, type ChartMode, type Series } from "../components/standings/progressionchart";
import { Podium, type PodiumEntry } from "../components/standings/podium";
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
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </div>
        <Skeleton className="h-80" />
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

export default function Standings() {
  const { year = "" } = useParams();
  const navigate = useNavigate();
  const valid = /^\d{4}$/.test(year);
  const seasons = useApi<{ seasons: number[] }>("/seasons").data?.seasons ?? [];
  const { data, error, reload } = useApi<SeasonStandings>(valid ? `/seasons/${year}/standings` : null);
  const [tab, setTab] = useState<Tab>("drivers");
  const [mode, setMode] = useState<ChartMode>("points");
  const [highlight, setHighlight] = useState<string | null>(null);
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
  const chartSeries = mode === "points" ? view.pointSeries : view.gapSeries;
  const shown = chartSeries.filter((s, i) => isOn(s.id, i));
  const onTabKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setTab((t) => (t === "drivers" ? "constructors" : "drivers"));
    }
  };
  const leader = view.rows[0];
  const second = view.rows[1];

  return (
    <div className="f1-carbon relative min-h-screen overflow-hidden px-4 pb-32 pt-16 text-zinc-200 md:px-8">
      {/* Depth: a pool of the leader's colour at the top, and a vignette at the edges. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 45% at 78% 0%, ${leader.color}33, transparent 70%), radial-gradient(120% 80% at 50% 100%, transparent 40%, #000 100%)` }} />

      <div className="relative mx-auto max-w-5xl space-y-12">
        <header className="relative min-h-[12rem]">
          {/* The car (the site's own artwork), faded into the page, with the leader's colour pooled beneath it. */}
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-6 hidden w-[36rem] md:block">
            <div className="absolute inset-x-16 bottom-4 h-16 rounded-[100%] opacity-60 blur-2xl" style={{ backgroundColor: leader.color }} />
            <img
              src="/f1_new-hd.webp"
              alt=""
              decoding="async"
              className="f1-drive relative w-full select-none"
              style={{ maskImage: "linear-gradient(to right, transparent 0%, #000 28%)", WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 28%)" }}
            />
          </div>

          <p className="relative flex items-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-red-500">
            <span aria-hidden="true" className="h-px w-10 bg-red-600" />
            Championship
          </p>
          <h1 className="relative mt-3 text-6xl font-black italic leading-[0.95] tracking-tight md:text-7xl">
            <span className="text-white">{data.season}</span> <span className="f1-outline" style={{ "--stroke": "rgba(255,255,255,0.55)" } as CSSProperties}>standings</span>
          </h1>
          <p className="relative mt-4 max-w-md text-sm text-zinc-400">
            After round {view.last.round}, the {view.last.event_name}. Official points, sprints included.
          </p>
        </header>

        {/* One filter row above everything it scopes. */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div role="tablist" aria-label="Standings type" className="inline-flex rounded-full border border-white/15 bg-white/[0.04] p-1 backdrop-blur" onKeyDown={onTabKey}>
            {(["drivers", "constructors"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                tabIndex={tab === t ? 0 : -1}
                onClick={() => setTab(t)}
                className={`rounded-full px-5 py-2 text-sm font-semibold capitalize transition-colors ${tab === t ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <label className="ml-auto text-sm text-zinc-400">
            Season
            <select
              value={data.season}
              onChange={(e) => navigate(`/season/${e.target.value}`)}
              className="ml-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-white backdrop-blur"
            >
              {(seasons.length ? seasons : [data.season]).map((y) => (
                <option key={y} value={y} className="bg-black">
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Podium entries={view.podium} leaderPoints={leader.points} />

        <section aria-label="Summary" className="f1-rise grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-4" style={{ "--d": "380ms" } as CSSProperties}>
          <Stat label="Lead over 2nd" value={second ? `${leader.points - second.points} pts` : "—"} sub={second?.label} />
          <Stat label="Lead changes" value={String(view.leadChanges)} sub={`across ${data.rounds.length} rounds`} />
          <Stat label="Rounds scored" value={String(data.rounds.length)} sub={`through ${view.last.event_name.replace("Grand Prix", "GP")}`} />
          <Stat label="Wins by leader" value={String(leader.wins)} sub="Grand Prix victories" />
        </section>

        <section aria-labelledby="progress-h" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="progress-h" className="text-2xl font-extrabold tracking-tight text-white">
                {mode === "points" ? "Points after each round" : "Points behind the leader"}
              </h2>
              <p className="text-sm text-zinc-400">{mode === "points" ? "How the championship was built, round by round." : "Where the title fight was won and lost."}</p>
            </div>
            <div role="group" aria-label="Chart view" className="inline-flex rounded-full border border-white/15 bg-white/[0.04] p-1 backdrop-blur">
              {([["points", "Total points"], ["gap", "Gap to leader"]] as const).map(([m, label]) => (
                <button
                  key={m}
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${mode === m ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose lines to show">
            {chartSeries.map((s, i) => {
              const on = isOn(s.id, i);
              return (
                <button
                  key={s.id}
                  aria-pressed={on}
                  onClick={() => toggle(s.id)}
                  onMouseEnter={() => setHighlight(s.id)}
                  onMouseLeave={() => setHighlight(null)}
                  onFocus={() => setHighlight(s.id)}
                  onBlur={() => setHighlight(null)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-all ${on ? "border-white/25 bg-white/[0.07] text-white" : "border-white/10 text-zinc-500 opacity-55 hover:opacity-100"}`}
                >
                  <svg width="18" height="6" aria-hidden="true">
                    <line x1="0" x2="18" y1="3" y2="3" stroke={s.color} strokeWidth="3" strokeDasharray={s.dashed ? "5 3" : undefined} />
                  </svg>
                  {s.short}
                </button>
              );
            })}
          </div>

          {shown.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-400">Pick at least one line to show the chart.</p>
          ) : (
            <ProgressionChart
              series={shown}
              mode={mode}
              leaderId={leader.id}
              highlight={highlight}
              rounds={data.rounds.map((r) => ({ round: r.round, label: r.event_name.replace("Grand Prix", "GP").trim() }))}
              ariaLabel={`Line chart of ${tab} championship points ${mode === "gap" ? "behind the leader " : ""}after each of ${data.rounds.length} rounds in ${data.season}. ${leader.label} leads with ${leader.points} points.`}
            />
          )}
        </section>

        <section aria-labelledby="table-h">
          <h2 id="table-h" className="mb-4 text-2xl font-extrabold tracking-tight text-white">
            {tab === "drivers" ? "Drivers' championship" : "Constructors' championship"}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                {tab} standings after round {view.last.round} of {data.season}
              </caption>
              <thead className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">
                <tr>
                  <th scope="col" className="px-4 py-4">Pos</th>
                  <th scope="col" className="px-3 py-4">{tab === "drivers" ? "Driver" : "Team"}</th>
                  {tab === "drivers" && <th scope="col" className="hidden px-3 py-4 md:table-cell">Team</th>}
                  <th scope="col" className="px-3 py-4 text-right">Points</th>
                  <th scope="col" className="hidden px-3 py-4 text-right sm:table-cell">Gap</th>
                  <th scope="col" className="hidden px-4 py-4 text-right sm:table-cell">Wins</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.map((row) => (
                  <tr key={row.id} className="group border-t border-white/[0.06] transition-colors hover:bg-white/[0.04]">
                    <td className="px-4 py-3.5" style={row.position !== null && row.position <= 3 ? { boxShadow: `inset 3px 0 0 ${row.color}` } : undefined}>
                      <span className={`text-xl font-black italic leading-none ${row.position === 1 ? "text-white" : row.position !== null && row.position <= 3 ? "text-zinc-200" : "text-zinc-500"}`}>{row.position ?? "—"}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="flex items-center gap-3">
                        <span className="h-8 w-1 rounded-full" style={{ backgroundColor: row.color }} aria-hidden="true" />
                        <span className="min-w-0">
                          {row.href ? (
                            <Link to={row.href} onMouseEnter={() => row.prefetch && prefetch(row.prefetch)} className="font-semibold text-white transition-colors hover:text-red-400">
                              {row.label}
                            </Link>
                          ) : (
                            <span className="font-semibold text-white">{row.label}</span>
                          )}
                          {tab === "drivers" && <span className="block text-xs text-zinc-500 md:hidden">{row.team ?? "—"}</span>}
                        </span>
                      </span>
                    </td>
                    {tab === "drivers" && <td className="hidden px-3 py-3.5 text-zinc-400 md:table-cell">{row.team ?? "—"}</td>}
                    <td className="w-32 px-3 py-3.5 text-right sm:w-44">
                      <span className="font-mono text-base font-bold text-white">{row.points}</span>
                      <span aria-hidden="true" className="mt-1.5 block h-1 rounded-full bg-white/[0.07]">
                        <span className="block h-full rounded-full" style={{ width: `${leader.points ? (row.points / leader.points) * 100 : 0}%`, background: `linear-gradient(90deg, ${row.color}99, ${row.color})` }} />
                      </span>
                    </td>
                    <td className="hidden px-3 py-3.5 text-right font-mono text-zinc-400 sm:table-cell">{row.position === 1 ? "—" : `−${leader.points - row.points}`}</td>
                    <td className="hidden px-4 py-3.5 text-right font-mono text-zinc-300 sm:table-cell">{row.wins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-zinc-500">Source: Jolpica-F1 official standings. Wins count Grand Prix victories only. Team colours are brightened where needed to stay visible on a dark background.</p>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#0a0a0b] px-5 py-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-extrabold tracking-tight text-white">{value}</p>
      {sub && <p className="truncate text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

type Row = { id: string; label: string; number: number | null; team: string | null; color: string; position: number | null; points: number; wins: number; href?: string; prefetch?: string };

const isDriver = (r: StandingsDriver | StandingsConstructor): r is StandingsDriver => "code" in r;
const SUFFIX = /\b(Racing|F1|Team|Kick|Scuderia)\b/g;

/** A short direct label for a constructor: drop filler words and cap the length. */
function shortTeam(name: string): string {
  const s = name.replace(SUFFIX, "").replace(/\s+/g, " ").trim() || name;
  return s.length > 12 ? `${s.slice(0, 11)}…` : s;
}

/** Turn the raw standings into table rows, podium, chart lines (points and gap) and a lead-change count for one tab. */
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
      number: isDriver(r) ? r.number : null,
      team: isDriver(r) ? r.team : null,
      color: readableOnDark(r.team_color ?? FALLBACK),
      position: r.position,
      points: r.points,
      wins: r.wins,
      href: isDriver(r) ? `/driver/${r.code}` : undefined,
      prefetch: isDriver(r) ? `/drivers/${r.code}` : undefined,
    }));

  // For a team, the sub-line is its drivers; for a driver, the team.
  const driversOf = (team: string) =>
    last.drivers
      .filter((d) => d.team === team)
      .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
      .map((d) => d.code)
      .join(" · ");
  const podium: PodiumEntry[] = rows.slice(0, 3).map((r) => ({
    id: r.id, label: r.label, sublabel: tab === "drivers" ? r.team : driversOf(r.label) || null, color: r.color, points: r.points, wins: r.wins, position: r.position, number: r.number, href: r.href, prefetch: r.prefetch,
  }));

  const pointsAt = (rd: (typeof rounds)[number], id: string): number | null => {
    const list = tab === "drivers" ? rd.drivers : rd.constructors;
    const hit = list.find((x) => keyOf(x) === id);
    return hit ? hit.points : null;
  };
  const leaderAt = rounds.map((rd) => Math.max(0, ...(tab === "drivers" ? rd.drivers : rd.constructors).map((x) => x.points)));

  const used = new Set<string>();
  const base = rows.slice(0, CHART_MAX).map((row) => {
    const dashed = used.has(row.color);
    used.add(row.color);
    return { row, dashed, points: rounds.map((rd) => pointsAt(rd, row.id)) };
  });
  const make = (values: (id: number) => (number | null)[]): Series[] =>
    base.map(({ row, dashed }, i) => ({
      id: row.id,
      label: tab === "drivers" ? `${row.label}` : row.label,
      short: tab === "drivers" ? row.id : shortTeam(row.label),
      color: row.color,
      dashed,
      values: values(i),
    }));
  const pointSeries = make((i) => base[i].points);
  const gapSeries = make((i) => base[i].points.map((p, r) => (p === null ? null : -(leaderAt[r] - p))));

  const leaders = rounds.map((rd) => (tab === "drivers" ? rd.drivers : rd.constructors).find((x) => x.position === 1)?.name ?? null);
  const leadChanges = leaders.reduce((n, cur, i) => (i > 0 && cur !== leaders[i - 1] ? n + 1 : n), 0);
  return { rows, podium, pointSeries, gapSeries, last, leadChanges };
}

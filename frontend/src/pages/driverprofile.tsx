import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ErrorState, Skeleton } from "../components/ui/states";
import { ChampionBadge } from "../components/ui/championbadge";
import { fmt, fmtSigned } from "../lib/format";
import { WeekendPanel } from "../components/driver/weekendpanel";
import { RatingPanel } from "../components/ratings/ratingpanel";
import type { DriverProfile } from "../types/api";

/* DNA and AI insight arrive with the ratings model (see plan.md). The API answers 404
   "not_available" for them today, so the panels are only drawn when data exists. */
type DriverDNA = {
  pace: number;
  racecraft: number;
  tyres: number;
  consistency: number;
  wet: number;
  risk_management: number;
};

type AIInsight = {
  rating: number;
  tier: string;
  strength: string;
  weakness: string;
  trend: string;
  risk: string;
  summary: string;
};

export default function DriverPage() {
  const { code = "" } = useParams();
  const stats = useApi<DriverProfile>(code ? `/drivers/${code}` : null);
  // Not built yet: only request them once the ratings model ships (VITE_FEATURE_DRIVER_AI=true).
  const withAi = import.meta.env.VITE_FEATURE_DRIVER_AI === "true" && code !== "";
  const dna = useApi<DriverDNA>(withAi ? `/drivers/${code}/dna` : null).data;
  const ai = useApi<AIInsight>(withAi ? `/ai/driver/${code}` : null).data;

  useDocumentTitle(stats.data?.name ?? "Driver");

  if (stats.loading) {
    return (
      <div className="min-h-screen px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-12">
          <Skeleton className="h-[420px] lg:col-span-4" />
          <Skeleton className="h-[420px] lg:col-span-8" />
        </div>
      </div>
    );
  }
  if (!stats.data) {
    return (
      <div className="min-h-screen">
        <ErrorState error={stats.error} onRetry={stats.reload} subject="driver" backTo={{ href: "/drivers", label: "All drivers" }} />
      </div>
    );
  }
  const driver = stats.data;
  const s = driver.stats;

  return (
    <div className="min-h-screen px-5 py-14 text-zinc-200 sm:px-8 lg:px-12">
      <div className="mx-auto mb-10 flex max-w-7xl justify-between">
        <Link to="/drivers" className="text-xs font-mono text-zinc-400 hover:text-white">
          ← ALL DRIVERS
        </Link>
        <span className="text-xs font-mono text-red-500">DRIVER PROFILE</span>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="overflow-hidden rounded-sm border border-white/10 bg-[#080808]">
            <div className="relative flex h-[320px] items-center justify-center overflow-hidden glass-cell">
              <span aria-hidden="true" className="f1-outline text-9xl font-black italic">
                {driver.code}
              </span>
            </div>
            <div className="space-y-3 p-6">
              <h1 className="text-3xl font-black italic text-white">{driver.name}</h1>
              <ChampionBadge titles={driver.titles} years={driver.title_years} />
              <p className="text-sm text-zinc-400">
                {driver.team ?? "—"}
                {driver.number !== null && ` · #${driver.number}`}
              </p>
              {ai && (
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-black text-red-500">{ai.rating}</span>
                  <span className="text-xs font-mono uppercase text-zinc-500">{ai.tier}</span>
                </div>
              )}
              {ai && (
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <Tag text={ai.strength} />
                  <Tag text={ai.trend} />
                  <Tag text={`${ai.risk} Risk`} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8 lg:col-span-8">
          <Panel title={`${driver.latest_season} SEASON`}>
            <Grid4>
              <Mini label="Races" value={s.races} />
              <Mini label="Wins" value={s.wins} />
              <Mini label="Podiums" value={s.podiums} />
              <Mini label="Race points (excl. sprints)" value={s.points} />
              <Mini label="Best finish" value={s.best_finish === null ? "—" : `P${s.best_finish}`} />
              <Mini label="Avg finish" value={fmt(s.avg_finish)} />
              <Mini label="Avg grid" value={fmt(s.avg_grid)} />
              <Mini label="Positions gained" value={fmtSigned(s.positions_gained)} signed={s.positions_gained} />
              <Mini label="Consistency" value={fmt(s.consistency, "%")} />
              <Mini label="Avg longest stint" value={fmt(s.avg_longest_stint, " laps")} />
              <Mini label="Recent form (avg finish, last 5)" value={fmt(s.recent_form)} />
            </Grid4>
          </Panel>

          {driver.latest_season >= 2026 && <WeekendPanel code={driver.code} />}

          {driver.rating && <RatingPanel code={driver.code} name={driver.name} rating={driver.rating} />}

          <Panel title="BY SEASON">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Season-by-season results for {driver.name}</caption>
                <thead className="text-xs uppercase text-zinc-500">
                  <tr>
                    <th scope="col" className="py-2 pr-4">SEASON</th>
                    <th scope="col" className="pr-4">TEAM</th>
                    <th scope="col" className="pr-4">RACES</th>
                    <th scope="col" className="pr-4">WINS</th>
                    <th scope="col" className="pr-4">PODIUMS</th>
                    <th scope="col">RACE_PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {driver.seasons.map((row) => (
                    <tr key={row.season} className="border-t border-white/5">
                      <td className="py-2 pr-4 font-semibold text-white">{row.season}</td>
                      <td className="pr-4">{row.team ?? "—"}</td>
                      <td className="pr-4">{row.races}</td>
                      <td className="pr-4">{row.wins}</td>
                      <td className="pr-4">{row.podiums}</td>
                      <td>{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {dna && (
            <Panel title="PERFORMANCE_DNA">
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
                <Bar label="Pace" value={dna.pace} />
                <Bar label="Racecraft" value={dna.racecraft} />
                <Bar label="Tyres" value={dna.tyres} />
                <Bar label="Consistency" value={dna.consistency} />
                <Bar label="Wet" value={dna.wet} />
                <Bar label="Risk Ctrl" value={dna.risk_management} />
              </div>
            </Panel>
          )}

          {ai && (
            <Panel title="INSIGHT">
              <p className="text-lg italic leading-relaxed text-zinc-300">"{ai.summary}"</p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}



/* ================= UI ================= */


function Panel({ children, title }: { children: ReactNode; title?: string }) {

  return (
    <div className="
      bg-[#080808]
      border border-white/10
      rounded-sm
      p-6
    ">

      {title && (
        <h3 className="
          text-xs
          font-mono
          text-red-500
          mb-5
        ">
          {title}
        </h3>
      )}

      {children}

    </div>
  );
}


function Grid4({ children }: { children: ReactNode }) {
  return (
    <div className="
      grid grid-cols-2 md:grid-cols-4 gap-4
    ">
      {children}
    </div>
  );
}


function Mini({ label, value, signed }: { label: string; value: string | number; signed?: number | null }) {

  const color =
    signed === undefined || signed === null
      ? "text-white"
      : signed >= 0
        ? "text-white"
        : "text-red-500";

  return (
    <div className="bg-white/5 border border-white/10 p-4 rounded">

      <p className="text-[10px] uppercase text-zinc-500 mb-1">
        {label}
      </p>

      <p className={`text-xl font-black italic ${color}`}>
        {value}
      </p>

    </div>
  );
}


function Bar({ label, value }: { label: string; value: number }) {

  const v = Math.max(0, Math.min(100, value));

  const color =
    v > 80
      ? "bg-white"
      : v > 65
      ? "bg-zinc-400"
      : "bg-red-500";

  return (
    <div className="space-y-1">

      <div className="
        flex justify-between
        text-[10px]
        font-mono
        text-zinc-400
      ">

        <span>{label}</span>

        <span>{v}</span>

      </div>

      <div className="h-2 bg-white/10 rounded">

        <div
          className={`${color} h-full rounded transition-all`}
          style={{ width: `${v}%` }}
        />

      </div>

    </div>
  );
}


function Tag({ text }: { text: string }) {
  return (
    <span className="
      px-2 py-1
      bg-red-600/10
      border border-red-600/30
      rounded
      text-red-500
      uppercase
      font-mono
    ">
      {text}
    </span>
  );
}

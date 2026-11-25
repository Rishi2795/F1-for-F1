import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ErrorState, Skeleton } from "../components/ui/states";
import { PageHead } from "../components/ui/pagehead";
import { SeasonChips } from "../components/ui/seasonchips";
import { chip } from "../components/ui/chipstyle";
import { DataTable } from "../components/ui/datatable";
import { HEAD, ROW, TD, TH } from "../components/ui/tablestyle";
import { readableOnDark } from "../lib/color";
import type { TeamPaceDoc } from "../types/api";

const W = 920;
const H = 360;
const M = { l: 52, r: 78, t: 14, b: 30 };

export default function TeamPace() {
  useDocumentTitle("Team pace");
  const seasons = useApi<{ seasons: number[] }>("/seasons").data?.seasons ?? [];
  const [picked, setPicked] = useState<number | null>(null);
  const season = picked ?? (seasons.length ? Math.max(...seasons) : null);
  const { data, error, loading, reload } = useApi<TeamPaceDoc>(season ? `/seasons/${season}/team-pace` : null);
  const [focus, setFocus] = useState<string | null>(null);

  const rounds = data?.rounds ?? [];
  const teams = data?.teams ?? [];
  const cap = Math.min(6, Math.max(2, ...rounds.flatMap((r) => Object.values(r.gaps).filter((g) => g < 6))));
  const x = (i: number) => M.l + (i / Math.max(1, rounds.length - 1)) * (W - M.l - M.r);
  const y = (g: number) => M.t + (Math.min(g, cap) / cap) * (H - M.t - M.b);

  return (
    <div className="min-h-screen pb-32 pt-16 text-zinc-300">
      <div className="page space-y-10">
        <PageHead align="right" kicker="TEAM_PACE" title="Who has the" accent="quickest car?" intro="Race pace for every team, round by round: how far each car was from the quickest car that weekend, on clean laps. It shows who is improving, who is fading, and who only looked quick at one track." />
        {seasons.length > 0 && season && <SeasonChips seasons={seasons} value={season} onChange={(s) => { setPicked(s); setFocus(null); }} />}
        {loading && <Skeleton className="h-[420px]" />}
        {error && <ErrorState error={error} onRetry={reload} subject="team pace" />}
        {data && rounds.length > 1 && (
          <>
            <div role="group" aria-label="Highlight a team" className="flex flex-wrap gap-2">
              {teams.map((t) => (
                <button key={t.name} type="button" aria-pressed={focus === t.name} onClick={() => setFocus((f) => (f === t.name ? null : t.name))} className={`${chip(focus === t.name)} !px-2.5 !py-1`}>
                  <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: readableOnDark(`#${(t.team_color ?? "888888").replace("#", "")}`) }} />{t.name}
                </button>
              ))}
            </div>
            <figure>
              <div tabIndex={0} role="region" aria-label="Team pace chart (scrolls sideways on small screens)" className="overflow-x-auto glass p-3">
                <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Race pace gap to the quickest car for ${teams.length} teams over ${rounds.length} rounds in ${season}`} className="w-full min-w-[720px]">
                  {[0, cap / 2, cap].map((g) => (
                    <g key={g}><line x1={M.l} x2={W - M.r} y1={y(g)} y2={y(g)} stroke="#fff" strokeOpacity="0.08" /><text x={M.l - 8} y={y(g) + 4} textAnchor="end" fontSize="11" className="fill-zinc-400">{g === 0 ? "quickest" : `+${g.toFixed(1)}%`}</text></g>
                  ))}
                  {rounds.map((r, i) => (i % Math.ceil(rounds.length / 12) === 0 ? <text key={r.round} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" className="fill-zinc-400">R{r.round}</text> : null))}
                  {teams.map((t) => {
                    const color = readableOnDark(`#${(t.team_color ?? "888888").replace("#", "")}`);
                    const dim = focus !== null && focus !== t.name;
                    const pts = rounds.map((r, i) => (r.gaps[t.name] === undefined ? null : [x(i), y(r.gaps[t.name])] as const));
                    const path = pts.map((p, i) => (p ? `${i && pts[i - 1] ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}` : "")).join(" ");
                    const last = [...pts].reverse().find(Boolean);
                    return (
                      <g key={t.name} opacity={dim ? 0.12 : 1} style={{ transition: "opacity 200ms" }}>
                        <path d={path} fill="none" stroke={color} strokeWidth={focus === t.name ? 3 : 2} strokeLinejoin="round" />
                        {last && <text x={last[0] + 6} y={last[1] + 4} fontSize="11" fontWeight="700" fill={color}>{t.name.replace(" Racing", "").replace(" F1 Team", "").slice(0, 11)}</text>}
                      </g>
                    );
                  })}
                </svg>
              </div>
              <figcaption className="mt-2 text-xs text-zinc-500">Each line is a team's quicker driver's median clean lap against the quickest car that weekend. Lower is better. Gaps above {cap.toFixed(0)}% are drawn at the edge.</figcaption>
            </figure>
            <DataTable caption={`Season ${season} team pace, quickest first`}>
              <thead className={HEAD}><tr><th scope="col" className="px-4 py-4">TEAM</th><th scope="col" className={`${TH} text-right`}>AVG_GAP</th><th scope="col" className={`${TH} hidden text-right sm:table-cell`}>FIRST_HALF</th><th scope="col" className={`${TH} hidden text-right sm:table-cell`}>SECOND_HALF</th><th scope="col" className="px-4 py-4 text-right">TREND</th></tr></thead>
              <tbody>
                {teams.map((t) => {
                  const d = t.first_half_pct !== null && t.second_half_pct !== null ? t.second_half_pct - t.first_half_pct : null;
                  return (
                    <tr key={t.name} className={ROW}>
                      <td className="px-4 py-3 font-semibold text-white"><span aria-hidden="true" className="mr-3 inline-block h-4 w-1 align-middle" style={{ backgroundColor: readableOnDark(`#${(t.team_color ?? "888888").replace("#", "")}`) }} />{t.name}</td>
                      <td className={`${TD} text-right font-mono text-white`}>{t.avg_gap_pct === 0 ? "—" : `+${t.avg_gap_pct.toFixed(2)}%`}</td>
                      <td className={`${TD} hidden text-right font-mono text-zinc-400 sm:table-cell`}>{t.first_half_pct?.toFixed(2) ?? "—"}%</td>
                      <td className={`${TD} hidden text-right font-mono text-zinc-400 sm:table-cell`}>{t.second_half_pct?.toFixed(2) ?? "—"}%</td>
                      <td className="px-4 py-3 text-right font-mono text-xs uppercase tracking-widest">
                        {d === null ? <span className="text-zinc-500">—</span> : d < -0.15 ? <span className="text-white">▲ IMPROVING</span> : d > 0.15 ? <span className="text-red-500">▼ FADING</span> : <span className="text-zinc-400">STEADY</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
            <p className="text-xs text-zinc-500">The trend compares the first and second half of the season: more than 0.15 percentage points quicker is improving, slower is fading. Pace excludes pit laps, safety cars and lap 1.</p>
          </>
        )}
        {data && rounds.length <= 1 && <p className="text-zinc-400">Not enough races with pace data in {season} yet.</p>}
      </div>
    </div>
  );
}

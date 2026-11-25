import { useState } from "react";
import { DataTable, DriverCell, Pos } from "../ui/datatable";
import { chip } from "../ui/chipstyle";
import { HEAD, ROW, TD, TH } from "../ui/tablestyle";
import { pct } from "../../lib/forecast";
import { titleMaths } from "../../lib/titlemaths";
import { ProbBar } from "./probbar";
import type { TitleForecast } from "../../types/api";

type Row = { id: string; code?: string; name: string; team?: string; color: string | null; points: number; champion: number; expected: number };

/** Title odds for drivers and constructors, with a plain statement when a title is already decided. */
export function TitlePanel({ data }: { data: TitleForecast }) {
  const [tab, setTab] = useState<"drivers" | "constructors">("drivers");
  const [all, setAll] = useState(false);
  const decided = tab === "drivers" ? data.clinched_driver !== null : data.clinched_constructor !== null;
  const rows: Row[] =
    tab === "drivers"
      ? data.drivers.map((d) => ({ id: d.code, code: d.code, name: d.name, team: d.team, color: d.team_color, points: d.points, champion: d.champion, expected: d.exp_points }))
      : data.constructors.map((c) => ({ id: c.name, name: c.name, color: c.team_color, points: c.points, champion: c.champion, expected: c.exp_points }));
  const shown = all ? rows : rows.slice(0, 6);
  const byPoints = [...rows].sort((a, b) => b.points - a.points);
  const lead = byPoints.length > 1 ? byPoints[0].points - byPoints[1].points : 0;
  const leaderName = byPoints[0]?.name ?? "";
  const favourite = rows[0];
  const left = data.races_left;

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Which championship" className="flex flex-wrap gap-2">
        {(["drivers", "constructors"] as const).map((t) => (
          <button key={t} type="button" aria-pressed={tab === t} onClick={() => { setTab(t); setAll(false); }} className={chip(tab === t)}>{t}</button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[22rem_1fr] xl:items-start">
      <div className="glass p-5 md:p-6 xl:sticky xl:top-6">
        {decided ? (
          <>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-red-500">TITLE_DECIDED</p>
            <p className="mt-3 font-serif text-2xl italic leading-snug text-white md:text-3xl">“{leaderName} {tab === "drivers" ? "is" : "are"} the {data.season} {tab === "drivers" ? "champion" : "constructors' champions"}.”</p>
            <p className="mt-3 max-w-2xl text-zinc-300">
              They lead by {lead} points with {left} {left === 1 ? "race" : "races"} left. Even if a rival won every Grand Prix and every sprint left, they could not catch up.
              Nothing below is in doubt except the places behind them.
            </p>
          </>
        ) : (
          <>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{left}_{left === 1 ? "RACE" : "RACES"}_LEFT</p>
            <p className="mt-3 font-serif text-2xl italic leading-snug text-white md:text-3xl">
              “{favourite.name} is the most likely champion at {pct(favourite.champion)}.”
            </p>
            <p className="mt-3 max-w-2xl text-zinc-300">
              The leader has {lead} points in hand. We play out the {left} remaining {left === 1 ? "race" : "races"} 20,000 times and count who ends up on top.
            </p>
          </>
        )}
      </div>

      <DataTable caption={`${tab} championship odds after round ${data.as_of_round}`}>
        <thead className={HEAD}>
          <tr>
            <th scope="col" className="px-4 py-3">RANK</th>
            <th scope="col" className={TH}>{tab === "drivers" ? "DRIVER" : "TEAM"}</th>
            <th scope="col" className={`${TH} text-right`}>POINTS</th>
            <th scope="col" className={`${TH} w-[30%]`}>TITLE_CHANCE</th>
            <th scope="col" className="hidden px-4 py-4 text-right sm:table-cell">EXPECTED_FINAL</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={r.id} className={ROW}>
              <td className="px-4 py-2"><Pos n={i + 1} /></td>
              <td className={TD}><DriverCell name={r.name} code={r.code} color={r.color} team={r.team} /></td>
              <td className={`${TD} text-right font-mono text-zinc-300`}>{r.points}</td>
              <td className={TD}><ProbBar value={r.champion} lead={i === 0} delay={i * 40} label={`${r.name} title chance`} /></td>
              <td className="hidden px-4 py-3 text-right font-mono text-zinc-400 sm:table-cell">{Math.round(r.expected)}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      </div>
      {rows.length > 6 && (
        <button type="button" aria-pressed={all} onClick={() => setAll((v) => !v)} className={chip(all)}>{all ? "SHOW_TOP_6" : `SHOW_ALL_${rows.length}`}</button>
      )}
      {tab === "drivers" && <WhatDoesHeNeed data={data} />}
      <p className="text-xs text-zinc-500">
        Sprint races are not simulated, so expected points are for Grand Prix weekends only. A title counts as decided only if it is out of reach even with a win in every sprint.
      </p>
    </div>
  );
}

/** Pick a driver, get the points maths in plain words. */
function WhatDoesHeNeed({ data }: { data: TitleForecast }) {
  const byPoints = [...data.drivers].sort((a, b) => b.points - a.points);
  const [pick, setPick] = useState(byPoints[Math.min(1, byPoints.length - 1)]?.code ?? "");
  const me = byPoints.find((d) => d.code === pick) ?? byPoints[0];
  if (!me || byPoints.length < 2) return null;
  const m = titleMaths(me.points, byPoints[0].points, byPoints[1].points, data.races_left);
  const left = data.races_left;
  const last = me.name.split(" ").at(-1);
  return (
    <div className="glass p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">WHAT_DOES_THIS_DRIVER_NEED?</p>
      <div role="group" aria-label="Choose a driver" className="mt-4 flex flex-wrap gap-2">
        {byPoints.slice(0, 8).map((d) => <button key={d.code} type="button" aria-pressed={d.code === me.code} onClick={() => setPick(d.code)} className={chip(d.code === me.code)}>{d.code}</button>)}
      </div>
      <p className="mt-5 max-w-3xl text-lg text-zinc-200" aria-live="polite">
        {m.status === "leader" && (m.safe
          ? `${last} cannot be caught: ${m.lead} points clear with ${left} ${left === 1 ? "race" : "races"} left.`
          : `${last} leads by ${m.lead} points. A rival can still close that with ${left} ${left === 1 ? "race" : "races"} left, so it is not over.`)}
        {m.status === "out" && `${last} is out of title contention: ${m.gap} points behind, and ${left} ${left === 1 ? "race" : "races"} offers at most ${m.max}, even with a Grand Prix and sprint win every weekend while the leader scores nothing.`}
        {m.status === "alive" && `${last} is ${m.gap} points behind and needs to finish ${m.needed} points ahead of the leader over the last ${left} ${left === 1 ? "race" : "races"}. If the leader takes second every time, that means averaging ${m.perRace.toFixed(1)} points a race${m.achievable ? "." : ", more than a win is worth: only possible with sprint points or a leader who drops out."}`}
      </p>
      <p className="mt-2 text-sm text-zinc-500">Model chance: {pct(me.champion)} · points: {me.points}</p>
    </div>
  );
}

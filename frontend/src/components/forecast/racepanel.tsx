import { useState } from "react";
import { DataTable, DriverCell, Pos } from "../ui/datatable";
import { chip } from "../ui/chipstyle";
import { HEAD, ROW, TD, TH } from "../ui/tablestyle";
import { pct, why } from "../../lib/forecast";
import { ProbBar } from "./probbar";
import type { NextForecasts } from "../../types/api";

const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, { day: "numeric", month: "long", timeZone: "UTC" });
};

/** The next race(s): a plain headline, then every driver's chances. */
export function RacePanel({ data }: { data: NextForecasts }) {
  const [pick, setPick] = useState(0);
  const [all, setAll] = useState(false);
  if (data.races.length === 0) return <p className="text-zinc-400">No race left this season. The next forecast appears after the new calendar is published.</p>;
  const race = data.races[Math.min(pick, data.races.length - 1)];
  const teams = new Set(race.drivers.map((d) => d.team)).size;
  const [first, second, third] = race.drivers;
  const shown = all ? race.drivers : race.drivers.slice(0, 10);
  const post = race.mode === "post_qualifying";

  return (
    <div className="space-y-4">
      {data.races.length > 1 && (
        <div role="group" aria-label="Choose a race" className="flex flex-wrap gap-2">
          {data.races.map((r, i) => (
            <button key={r.round} type="button" aria-pressed={i === pick} onClick={() => setPick(i)} className={chip(i === pick)}>
              {r.event_name.replace(" Grand Prix", "")} · {longDate(r.date)}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[22rem_1fr] xl:items-start">
      <div className="glass p-5 md:p-6 xl:sticky xl:top-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">
          {race.event_name.toUpperCase().replace(/\s+/g, "_")} // {longDate(race.date).toUpperCase().replace(/\s+/g, "_")}
          {post && <span className="ml-3 border border-red-500/60 px-2 py-0.5 text-red-400">GRID_SET</span>}
        </p>
        <p className="mt-3 font-serif text-2xl italic leading-snug text-white md:text-3xl">
          “{first.name} is the favourite at {pct(first.win)}.”
        </p>
        <p className="mt-3 max-w-2xl text-zinc-300">
          {second && third && (
            <>
              Then {second.name} ({pct(second.win)}) and {third.name} ({pct(third.win)}).{" "}
            </>
          )}
          {post ? "Qualifying is done, so the grid is in the model: this is sharper than the forecast before qualifying." : "This is the forecast before qualifying; it sharpens once the grid is set."} No driver is above {pct(first.win)}: even the favourite usually does not win.
        </p>
      </div>

      <DataTable caption={`Chances for the ${race.event_name}, most likely winner first`}>
        <thead className={HEAD}>
          <tr>
            <th scope="col" className="px-4 py-3">RANK</th>
            <th scope="col" className={TH}>DRIVER</th>
            {post && <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>GRID</th>}
            <th scope="col" className={`${TH} w-[30%]`}>WIN</th>
            <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>PODIUM</th>
            <th scope="col" className={`${TH} hidden text-right md:table-cell`}>POINTS_FINISH</th>
            <th scope="col" className={`${TH} hidden text-right md:table-cell`}>RETIRES</th>
            <th scope="col" className="hidden px-4 py-4 lg:table-cell">WHY</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((d, i) => (
            <tr key={d.code} className={ROW}>
              <td className="px-4 py-2"><Pos n={i + 1} /></td>
              <td className={TD}><DriverCell name={d.name} code={d.code} color={d.team_color} team={d.team} /></td>
              {post && <td className={`${TD} hidden text-right font-mono text-zinc-300 sm:table-cell`}>P{d.grid}</td>}
              <td className={TD}><ProbBar value={d.win} lead={i === 0} delay={i * 40} label={`${d.name} win chance`} /></td>
              <td className={`${TD} hidden text-right font-mono text-zinc-300 sm:table-cell`}>{pct(d.podium)}</td>
              <td className={`${TD} hidden text-right font-mono text-zinc-300 md:table-cell`}>{pct(d.top10)}</td>
              <td className={`${TD} hidden text-right font-mono text-zinc-400 md:table-cell`}>{pct(d.dnf)}</td>
              <td className="hidden max-w-xs px-4 py-3 text-xs leading-relaxed text-zinc-400 lg:table-cell">{why(d, teams).join(" · ")}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      </div>
      {race.drivers.length > 10 && (
        <button type="button" aria-pressed={all} onClick={() => setAll((v) => !v)} className={chip(all)}>
          {all ? "SHOW_TOP_10" : `SHOW_ALL_${race.drivers.length}`}
        </button>
      )}
      <p className="text-xs text-zinc-500">
        WIN is the chance of finishing first. PODIUM is a top-three finish. POINTS_FINISH is a top-ten finish. RETIRES is the chance of not finishing.
      </p>
    </div>
  );
}

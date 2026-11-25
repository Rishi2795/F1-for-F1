import { DataTable, DriverCell, Pos } from "../../ui/datatable";
import { HEAD, ROW, TD, TH } from "../../ui/tablestyle";
import { readableOnDark } from "../../../lib/color";
import { DASH, fmtGap, fmtGrid, fmtLap, fmtSigned } from "../../../lib/format";
import type { DriverRace } from "../../../types/api";

/** The classification: how each driver finished, and how far behind the winner. */
export function ResultSheet({ drivers }: { drivers: DriverRace[] }) {
  return (
    <DataTable caption="Race classification">
      <thead className={HEAD}>
        <tr>
          <th scope="col" className="px-4 py-4">POS</th>
          <th scope="col" className={TH}>DRIVER</th>
          <th scope="col" className={`${TH} hidden md:table-cell`}>TEAM</th>
          <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>GRID</th>
          <th scope="col" className={`${TH} hidden text-right sm:table-cell`}>PLACES</th>
          <th scope="col" className={`${TH} text-right`}>GAP</th>
          <th scope="col" className={`${TH} hidden text-right md:table-cell`}>FASTEST_LAP</th>
          <th scope="col" className="px-4 py-4 text-right">PTS</th>
        </tr>
      </thead>
      <tbody>
        {drivers.map((d) => {
          const gained = d.positions_gained ?? 0;
          return (
            <tr key={d.driver_code} className={ROW}>
              <td className="px-4 py-3" style={d.classified && d.finish !== null && d.finish <= 3 ? { boxShadow: `inset 3px 0 0 ${readableOnDark(`#${(d.team_color ?? "888888").replace("#", "")}`)}` } : undefined}><Pos n={d.classified ? d.finish : null} /></td>
              <td className={TD}><DriverCell name={d.driver_name} code={d.driver_code} color={d.team_color} team={d.team} /></td>
              <td className={`${TD} hidden text-zinc-400 md:table-cell`}>{d.team}</td>
              <td className={`${TD} hidden text-right font-mono text-zinc-400 sm:table-cell`}>{fmtGrid(d.grid, d.pit_lane_start)}</td>
              <td className={`${TD} hidden text-right font-mono sm:table-cell ${gained > 0 ? "text-white" : gained < 0 ? "text-red-500" : "text-zinc-500"}`}>{d.positions_gained === null ? DASH : gained === 0 ? "0" : fmtSigned(gained)}</td>
              <td className={`${TD} text-right font-mono text-zinc-300`}>{d.finish === 1 ? "Winner" : d.gap_to_winner_s != null ? fmtGap(d.gap_to_winner_s) : d.status}</td>
              <td className={`${TD} hidden text-right font-mono md:table-cell ${d.fastest_lap?.rank === 1 ? "font-bold text-red-500" : "text-zinc-400"}`}>{d.fastest_lap?.time_s != null ? fmtLap(d.fastest_lap.time_s) : DASH}</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-white">{d.points || DASH}</td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}

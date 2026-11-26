import { DataTable } from "../ui/datatable";
import { HEAD, ROW, TD, TH } from "../ui/tablestyle";
import type { LapDoc } from "../../types/api";

const KIND: Record<string, string> = { SC: "Safety car", VSC: "Virtual safety car", R: "Red flag" };

/** What interrupted the race, and which pit-stop gambles worked. */
export function Incidents({ doc }: { doc: LapDoc }) {
  const ok = doc.undercuts.filter((u) => u.success).length;
  return (
    <div className="grid gap-10 lg:grid-cols-5">
      <div className="min-w-0 lg:col-span-2">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">NEUTRALISED_LAPS</p>
        {doc.incidents.length === 0 ? <p className="text-zinc-400">A clean race: no safety car, virtual safety car or red flag.</p> : (
          <ul className="divide-y divide-white/10 glass">
            {doc.incidents.map((i) => (
              <li key={`${i.kind}-${i.from_lap}`} className="flex items-baseline justify-between px-4 py-3">
                <span className="text-white">{KIND[i.kind] ?? i.kind}</span>
                <span className="font-mono text-xs text-zinc-400">{i.from_lap === i.to_lap ? `LAP_${i.from_lap}` : `LAPS_${i.from_lap}–${i.to_lap}`}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="min-w-0 lg:col-span-3">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">UNDERCUT_TRACKER</p>
        {doc.undercuts.length === 0 ? <p className="text-zinc-400">No clean undercut attempts: no car stopped just before the car ahead under green-flag running.</p> : (
          <>
            <p className="mb-3 text-zinc-300"><b className="text-white">{ok} of {doc.undercuts.length}</b> undercut attempts worked: the car that stopped first was ahead once both had stopped.</p>
            <DataTable caption="Undercut attempts">
              <thead className={HEAD}><tr><th scope="col" className="px-4 py-4">ATTACKER</th><th scope="col" className={TH}>STOPPED</th><th scope="col" className={TH}>CAR_AHEAD</th><th scope="col" className={TH}>STOPPED</th><th scope="col" className="px-4 py-4 text-right">RESULT</th></tr></thead>
              <tbody>
                {doc.undercuts.map((u) => (
                  <tr key={`${u.attacker}-${u.attacker_lap}`} className={ROW}>
                    <td className="px-4 py-3 font-semibold text-white">{u.attacker}</td>
                    <td className={`${TD} font-mono text-zinc-300`}>L{u.attacker_lap}</td>
                    <td className={`${TD} text-zinc-300`}>{u.defender}</td>
                    <td className={`${TD} font-mono text-zinc-300`}>L{u.defender_lap}</td>
                    <td className="px-4 py-3 text-right"><span className={`inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${u.success ? "border-white bg-white text-black" : "border-red-500/70 text-red-400"}`}>{u.success ? "WORKED" : "FAILED"}</span></td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <p className="mt-2 text-xs text-zinc-500">Counted when a car stopped within four laps before the car directly ahead of it and neither stop was under a safety car or red flag. It does not measure pit-lane speed or tyre offset, only the outcome.</p>
          </>
        )}
      </div>
    </div>
  );
}

import React, { useState } from "react";

/* ================= TYPES & CONSTANTS ================= */

type Driver = {
  driver_code: string;
  driver_name?: string;
  team: string;
  grid: number;
  finish: number;
  positions_gained: number;
  stops: number;
  avg_speed?: number;
  best_lap_time?: number;
  longest_stint?: number;
  tyre_deg?: number;
  tyre_sequence?: string;
};

type Props = {
  drivers: Driver[];
  tyreSequences?: Record<string, string>;
};

const TEAM_COLORS: Record<string, string> = {
  "Red Bull Racing": "#3671C6",
  "Mercedes": "#27F4D2",
  "Ferrari": "#E80020",
  "McLaren": "#FF8000",
  "Aston Martin": "#229971",
  "Alpine": "#0093CC",
  "Williams": "#64C4FF",
  "RB": "#6692FF",
  "Sauber": "#52E252",
  "Haas": "#B6BABD",
};

/* ================= MAIN COMPONENT ================= */

export default function StandingsTable({ drivers, tyreSequences = {} }: Props) {
  const [openRow, setOpenRow] = useState<string | null>(null);

  if (!drivers || drivers.length === 0) return null;

  const enhanced = drivers.map((d) => {
    const paceIndex = ((100 - d.finish * 3) * 0.6) + ((d.avg_speed || 0) * 0.2);
    const rawTyreScore = ((d.longest_stint || 0) * 3) + ((d.avg_speed || 0) * 0.2) - ((d.stops || 0) * 8);
    const tyreScore = Math.max(0, Math.min(100, Math.round(rawTyreScore)));
    const impactScore = (d.positions_gained * 4) + (100 - d.finish * 3);

    return {
      ...d,
      paceIndex: Math.round(paceIndex),
      tyreScore: Math.round(tyreScore),
      impactScore: Math.round(impactScore),
    };
  });

  const getElite = (key: 'paceIndex' | 'impactScore', count: number) => 
    [...enhanced].sort((a, b) => (b[key] as number) - (a[key] as number)).slice(0, count).map(d => d.driver_code);

  const elitePace = getElite('paceIndex', 4);
  const raceMVP = getElite('impactScore', 1);

  return (
    /* OUTER WRAPPER: Matches your dark theme */
    <section className="bg-[#0a0a0a] min-h-screen py-12 px-4 sm:px-6">
      
      {/* INNER CARD: The white rounded container */}
      <div className="max-w-[1200px] mx-auto bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
        
        <div className="p-8 sm:p-12">
          
          {/* HEADER */}
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-1.5 h-10 bg-red-600 rounded-full" />
              <h2 className="text-4xl font-black uppercase tracking-tighter text-black">
                Driver Standings
              </h2>
            </div>
            <p className="text-xs text-black/40 font-bold uppercase tracking-widest ml-6">
              Final Classification & Performance Metrics
            </p>
          </div>

          <div className="overflow-hidden">
            
            {/* MOBILE VIEW */}
            <div className="sm:hidden space-y-4">
              {enhanced
                .sort((a, b) => a.finish - b.finish)
                .map((d, i) => {
                  const isOpen = openRow === d.driver_code;
                  const delta = d.positions_gained;
                  const teamColor = TEAM_COLORS[d.team] || "#000000";

                  return (
                    <div key={d.driver_code} className="bg-white rounded-2xl border border-black/5 overflow-hidden shadow-sm">
                      <div onClick={() => setOpenRow(isOpen ? null : d.driver_code)} className="p-4 active:bg-black/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-black/20 leading-none">POS</span>
                            <span className="text-xl font-black text-black/40">{String(i + 1).padStart(2, '0')}</span>
                          </div>
                          <div className="w-1 h-10 rounded-full" style={{ backgroundColor: teamColor }} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-black uppercase text-black">{d.driver_code}</h3>
                              {raceMVP.includes(d.driver_code) && <span className="bg-yellow-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">MVP</span>}
                            </div>
                            <p className="text-[10px] font-bold text-black/40 uppercase tracking-wider">{d.team}</p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <div className={`text-sm font-black font-mono ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-black/20'}`}>
                              {delta > 0 ? `▲ ${delta}` : delta < 0 ? `▼ ${Math.abs(delta)}` : "—"}
                            </div>
                            <div className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded">{d.paceIndex} PACE</div>
                          </div>
                        </div>
                      </div>
                      {isOpen && (
                        <div className="bg-black text-white p-6 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                          <MobileStat dark label="Best Lap" value={`${d.best_lap_time ?? "—"}s`} />
                          <MobileStat dark label="Avg Speed" value={d.avg_speed} unit="km/h" />
                          <MobileStat dark label="Max Stint" value={d.longest_stint} unit="Laps" />
                          <MobileStat dark label="Impact" value={d.impactScore} highlight />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* DESKTOP VIEW */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="text-[11px] font-black uppercase tracking-widest text-black/30 border-b border-black/5">
                    <th className="px-6 py-5 text-left w-24">Pos</th>
                    <th className="px-6 py-5 text-left">Driver</th>
                    <th className="px-6 py-5 text-center w-24">Δ</th>
                    <th className="px-6 py-5 text-left w-48">Classification</th>
                    <th className="px-6 py-5 text-left w-40">Strategy</th>
                    <th className="px-6 py-5 text-right w-24">Pace</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/[0.03]">
                  {enhanced
                    .sort((a, b) => a.finish - b.finish)
                    .map((d, i) => {
                      const isOpen = openRow === d.driver_code;
                      const delta = d.positions_gained;
                      const teamColor = TEAM_COLORS[d.team] || "#000000";

                      return (
                        <React.Fragment key={d.driver_code}>
                          <tr
                            onClick={() => setOpenRow(isOpen ? null : d.driver_code)}
                            className={`group transition-all cursor-pointer ${isOpen ? 'bg-black text-white' : 'text-black hover:bg-black/[0.02]'}`}
                          >
                            <td className={`px-6 py-6 text-2xl font-black ${isOpen ? 'text-white/90' : 'text-black/10'}`}>
                              {String(i + 1).padStart(2, '0')}
                            </td>

                            <td className="px-6 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: teamColor }} />
                                <div>
                                  <div className="text-xl font-black uppercase tracking-tighter leading-tight">{d.driver_code}</div>
                                  <div className={`text-[10px] font-bold uppercase tracking-widest ${isOpen ? 'text-white/40' : 'text-black/40'}`}>
                                    {d.team}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-6 text-center">
                              <span className={`text-lg font-black font-mono ${isOpen ? (delta > 0 ? 'text-emerald-400' : 'text-red-400') : (delta > 0 ? 'text-emerald-600' : 'text-red-600')}`}>
                                {delta > 0 ? `+${delta}` : delta === 0 ? "—" : delta}
                              </span>
                            </td>

                            <td className="px-6 py-6">
                              <div className="flex gap-2">
                                {raceMVP.includes(d.driver_code) && <Badge label="MVP" color="bg-yellow-400 text-black" />}
                                {elitePace.includes(d.driver_code) && <Badge label="Elite Pace" color="bg-red-600 text-white" />}
                                {!raceMVP.includes(d.driver_code) && !elitePace.includes(d.driver_code) && !isOpen && (
                                  <span className="text-[10px] font-bold uppercase text-black/20">Regular</span>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-6">
                              <span className={`px-3 py-1.5 rounded font-mono text-[10px] font-bold border ${isOpen ? 'bg-white/10 border-white/20' : 'bg-black/5 border-black/5 text-black/60'}`}>
                                {d.tyre_sequence || "N/A"}
                              </span>
                            </td>

                            <td className="px-6 py-6 text-right font-black text-xl text-red-600">
                              <span className={isOpen ? 'text-red-400' : ''}>{d.paceIndex}</span>
                            </td>
                          </tr>

                          {isOpen && (
                            <tr className="bg-black text-white">
                              <td colSpan={6} className="px-12 py-10">
                                <div className="grid grid-cols-6 gap-8">
                                  <DetailStat dark label="Best Lap" value={`${d.best_lap_time ?? "—"}s`} />
                                  <DetailStat dark label="Avg Speed" value={d.avg_speed} unit="km/h" />
                                  <DetailStat dark label="Max Stint" value={d.longest_stint} unit="laps" />
                                  <DetailStat dark label="Pace Index" value={d.paceIndex} highlight />
                                  <DetailStat dark label="Tyre Score" value={d.tyreScore} highlight />
                                  <DetailStat dark label="Impact" value={d.impactScore} highlight />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================= UI COMPONENTS ================= */

const Badge = ({ label, color }: { label: string; color: string }) => (
  <span className={`${color} text-[10px] font-black px-2.5 py-1 rounded-sm uppercase tracking-tight`}>
    {label}
  </span>
);

const DetailStat = ({ label, value, unit, highlight, dark }: any) => (
  <div className="space-y-1">
    <p className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-white/30' : 'text-black/30'}`}>{label}</p>
    <div className="flex items-baseline gap-1">
      <p className={`text-3xl font-black tracking-tighter ${highlight ? 'text-red-500' : (dark ? 'text-white' : 'text-black')}`}>
        {value}
      </p>
      {unit && <span className={`text-xs font-bold uppercase ${dark ? 'text-white/20' : 'text-black/20'}`}>{unit}</span>}
    </div>
  </div>
);

const MobileStat = ({ label, value, unit, highlight, dark }: any) => (
  <div className="space-y-0.5">
    <p className={`text-[9px] font-bold uppercase tracking-widest ${dark ? 'text-white/40' : 'text-black/40'}`}>
      {label}
    </p>
    <div className="flex items-baseline gap-1">
      <p className={`text-xl font-black ${highlight ? 'text-red-500' : (dark ? 'text-white' : 'text-black')}`}>
        {value || '—'}
      </p>
      {unit && <span className={`text-[8px] font-bold uppercase ${dark ? 'text-white/20' : 'text-black/20'}`}>{unit}</span>}
    </div>
  </div>
);
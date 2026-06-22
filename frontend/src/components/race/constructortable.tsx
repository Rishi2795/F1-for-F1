import React, { useMemo } from "react";

/* ================= TYPES ================= */

type Driver = {
  driver_code: string;
  team: string;
  finish: number;
  grid: number;
  positions_gained: number;
};

type Props = {
  drivers: Driver[];
};

/* ================= TEAM COLORS ================= */

const TEAM_COLORS: Record<string, string> = {
  "Red Bull Racing": "#1E41FF",
  "Mercedes": "#00D2BE",
  "Ferrari": "#DC0000",
  "McLaren": "#FF8700",
  "Aston Martin": "#006F62",
  "Alpine": "#0090FF",
  "Williams": "#005AFF",
  "AlphaTauri": "#2B4562",
  "RB": "#2B4562",
  "Alfa Romeo": "#900000",
  "Kick Sauber": "#52E252",
  "Haas F1 Team": "#B6BABD",
};


/* ================= MAIN ================= */

export default function ConstructorTable({ drivers }: Props) {

  /* ================= AGGREGATE ================= */

  const teamStats = useMemo(() => {

    const map: Record<string, any> = {};

    drivers.forEach((d) => {

      if (!map[d.team]) {
        map[d.team] = {
          team: d.team,
          finish: 0,
          count: 0,
          gained: 0,
        };
      }

      map[d.team].finish += d.finish;
      map[d.team].count += 1;
      map[d.team].gained += d.positions_gained;
    });

    return Object.values(map);

  }, [drivers]);


  if (!teamStats.length) return null;


  return (
    <section className="py-12 md:py-20 px-4 md:px-12 bg-[#050505] flex flex-col items-center overflow-hidden">

      <div className="w-full max-w-6xl space-y-10">


        {/* ================= HEADER ================= */}

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">

          <div className="space-y-1">

            <div className="flex items-center gap-3">

              <span className="text-red-600 font-mono text-[10px] font-bold border border-red-600/30 px-2 py-0.5 rounded-sm">
                CAL_02
              </span>

              <h2 className="text-white font-serif italic tracking-tight text-3xl md:text-4xl leading-none">

                Constructor{" "}

                <span className="font-sans not-italic font-black text-xl md:text-2xl uppercase tracking-tighter opacity-70">
                  Stability
                </span>

              </h2>

            </div>

            <p className="text-zinc-500 text-[9px] font-mono uppercase tracking-[0.4em] pl-1">
              Unit_Efficiency_Protocol_v4.2
            </p>

          </div>


          <div className="flex items-center gap-4">

            <div className="flex flex-col md:items-end">

              <span className="text-[7px] font-mono text-zinc-600 uppercase tracking-[0.2em]">
                System_Status
              </span>

              <span className="text-[10px] font-black text-green-500 italic flex items-center gap-2">

                <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />

                LIVE_DATA_SYNC

              </span>

            </div>

          </div>

        </div>


        {/* ================= GRID ================= */}

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3 md:gap-px bg-white/5 md:bg-white/10 md:border md:border-white/10 overflow-hidden shadow-2xl">


          {teamStats
            .sort(
              (a: any, b: any) =>
                (a.finish / a.count) - (b.finish / b.count)
            )
            .map((t: any) => {

              const teamColor =
                TEAM_COLORS[t.team] || "#444";

              const avgFinish =
                t.finish / t.count;

              const stabilityScore =
                Math.max(10, 100 - avgFinish * 4);


              return (

                <div
                  key={t.team}
                  className="group relative p-6 bg-white transition-all duration-500 md:hover:bg-[#060606] border-b border-zinc-100 md:border-none last:border-none"
                >

                  {/* HOVER ACCENT */}
                  <div
                    className="absolute inset-0 opacity-0 md:group-hover:opacity-[0.03] pointer-events-none transition-opacity duration-700"
                    style={{
                      background: `linear-gradient(180deg, ${teamColor} 0%, transparent 100%)`,
                    }}
                  />


                  <div className="relative z-10 flex flex-col h-full space-y-8">


                    {/* TOP */}
                    <div className="flex justify-between items-start">

                      <div className="space-y-1">

                        <p className="text-[10px] font-black text-black uppercase tracking-widest group-hover:md:text-white transition-colors">
                          {t.team}
                        </p>

                        <div
                          className="h-[2px] w-6"
                          style={{ backgroundColor: teamColor }}
                        />

                      </div>

                      <span className="text-[8px] font-mono text-zinc-400 uppercase italic">
                        {t.team.substring(0, 3)}_SPEC
                      </span>

                    </div>


                    {/* CENTER */}
                    <div className="flex items-end justify-between">

                      <div className="flex flex-col">

                        <span className="text-[7px] font-mono text-zinc-400 uppercase mb-1 italic">
                          Avg_Finish
                        </span>

                        <span className="text-5xl font-black italic text-black tracking-tighter leading-none group-hover:md:text-red-600 transition-colors duration-500">
                          {avgFinish.toFixed(1)}
                        </span>

                      </div>


                      <div
                        className={`px-2 py-1 rounded-sm text-[11px] font-black italic ${
                          t.gained >= 0
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-600"
                        }`}
                      >

                        {t.gained >= 0
                          ? `+${t.gained}`
                          : t.gained}

                      </div>

                    </div>


                    {/* STABILITY */}
                    <div className="space-y-3 pt-4 border-t border-zinc-100 group-hover:md:border-white/5 transition-colors">

                      <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em]">

                        <span className="text-zinc-400">
                          Stability
                        </span>

                        <span className="text-black font-mono group-hover:md:text-white">
                          {stabilityScore.toFixed(0)}%
                        </span>

                      </div>


                      {/* BAR */}
                      <div className="flex gap-1 h-1 w-full bg-zinc-50 md:group-hover:bg-zinc-900 transition-colors">

                        {[...Array(10)].map((_, i) => {

                          const active =
                            i + 1 <= stabilityScore / 10;

                          return (

                            <div
                              key={i}
                              className={`flex-1 transition-all duration-700 ${
                                active
                                  ? "bg-zinc-200 md:group-hover:bg-zinc-700"
                                  : "bg-transparent"
                              }`}
                            >

                              {active && (

                                <div
                                  className="w-full h-full opacity-0 md:group-hover:opacity-100 transition-all duration-500"
                                  style={{
                                    backgroundColor: teamColor,
                                  }}
                                />

                              )}

                            </div>

                          );
                        })}

                      </div>

                    </div>

                  </div>


                  {/* WATERMARK */}
                  <span className="absolute bottom-2 right-2 text-6xl font-black italic text-zinc-100/60 md:group-hover:text-white/[0.03] transition-all pointer-events-none uppercase leading-none select-none">
                    {t.team.split(" ")[0].substring(0, 3)}
                  </span>

                </div>

              );
            })}

        </div>

      </div>

    </section>
  );
}
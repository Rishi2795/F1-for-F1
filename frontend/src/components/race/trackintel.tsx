import React from "react";

type Props = {
  insights: any;
};

export default function TrackIntel({ insights }: Props) {
  if (!insights) return null;

  const track = insights?.track_profile;
  const telemetry = insights?.telemetry;
  const sectors = insights?.sectors;

  return (
    /* Outer Wrapper: 
       - overflow-hidden: Kills the side blue bar/horizontal leak.
       - w-full: Replaces w-screen to prevent scrollbar-related overflow.
    */
    <section className="bg-[#0a0a0a] h-screen w-full py-4 sm:py-8 px-3 sm:px-6 flex flex-col overflow-hidden relative">
      
      {/* Inner Card */}
      <div className="max-w-[1200px] w-full mx-auto bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col flex-1 overflow-hidden">
        
        <div className="p-4 sm:p-10 flex flex-col h-full overflow-hidden">
          
          {/* Header */}
          <div className="flex-none mb-3 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4 mb-1">
              <div className="w-1 h-6 sm:h-10 bg-red-600 rounded-full" />
              <h2 className="text-xl sm:text-4xl font-black uppercase tracking-tighter text-black">
                Track Intelligence
              </h2>
            </div>
            <p className="text-[9px] sm:text-xs text-black/40 font-bold uppercase tracking-widest ml-4 sm:ml-6">
              Analysis_v4.2 // Performance
            </p>
          </div>

          {/* MAIN CONTENT AREA 
              - sm:grid: Keeps desktop layout as is.
              - max-sm:flex-col: Forces mobile to stack and fit the viewport.
          */}
          <div className="flex-1 flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-6 overflow-hidden min-h-0">
            
            {/* LOG 01: PROFILE */}
            <div className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-[2rem] p-3 sm:p-8 flex flex-col justify-center min-h-0">
              <header className="border-b border-black pb-1 sm:pb-3 mb-2 sm:mb-6">
                <span className="text-[8px] sm:text-xs font-mono font-black uppercase tracking-[0.2em] text-black">
                  01 / Profile
                </span>
              </header>
              <div className="space-y-1 sm:space-y-6 overflow-hidden">
                <LogEntry label="Avg Gain" color="text-red-600" value={track?.avg_positions_gained !== undefined ? `+${track.avg_positions_gained.toFixed(1)}` : "—"} />
                <LogEntry label="Ease" value={track?.overtake_difficulty || "—"} />
                <LogEntry label="Degradation" value={track?.degradation_level || "—"} />
                <LogEntry label="Dirty Air" value={track?.dirty_air_penalty !== undefined ? track.dirty_air_penalty.toFixed(2) : "—"} />
              </div>
            </div>

            {/* LOG 02: TELEMETRY */}
            <div className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-[2rem] p-3 sm:p-8 flex flex-col justify-center min-h-0">
              <header className="border-b border-black pb-1 sm:pb-3 mb-2 sm:mb-6">
                <span className="text-[8px] sm:text-xs font-mono font-black uppercase tracking-[0.2em] text-black">
                  02 / Telemetry
                </span>
              </header>
              <div className="space-y-1 sm:space-y-6 overflow-hidden">
                <LogEntry label="V-Max" value={telemetry?.top_speed ? `${telemetry.top_speed}` : "—"} unit="km/h" />
                <LogEntry label="Throttle" value={telemetry?.avg_throttle !== undefined ? `${telemetry.avg_throttle.toFixed(1)}%` : "—"} />
                <LogEntry label="Brake" value={telemetry?.avg_brake !== undefined ? `${telemetry.avg_brake.toFixed(1)}%` : "—"} />
                <LogEntry label="DRS Utility" value={telemetry?.drs_usage_pct !== undefined ? `${telemetry.drs_usage_pct.toFixed(0)}%` : "—"} />
              </div>
            </div>

            {/* LOG 03: SECTOR ANALYSIS */}
            <div className="flex-1 bg-black rounded-xl sm:rounded-[2rem] p-3 sm:p-8 flex flex-col justify-center shadow-2xl relative overflow-hidden min-h-0">
              <div className="absolute top-0 right-0 p-2 opacity-10 text-white text-5xl sm:text-8xl font-black italic select-none">S3</div>
              <header className="border-b border-white/20 pb-1 sm:pb-3 mb-2 sm:mb-6 relative z-10">
                <span className="text-[8px] sm:text-xs font-mono font-black uppercase tracking-[0.2em] text-white">
                  03 / Sectors
                </span>
              </header>
              <div className="space-y-1 sm:space-y-6 relative z-10 overflow-hidden">
                <LogEntry invert label="Sector 1" value={sectors?.best_s1 ? `${sectors.best_s1}` : "—"} unit="s" />
                <LogEntry invert label="Sector 2" value={sectors?.best_s2 ? `${sectors.best_s2.toFixed(2)}` : "—"} unit="s" />
                <LogEntry invert label="Sector 3" value={sectors?.best_s3 ? `${sectors.best_s3.toFixed(2)}` : "—"} unit="s" />
                <LogEntry invert label="Consistency" value={sectors?.sector_consistency !== undefined ? sectors.sector_consistency.toFixed(2) : "—"} />
              </div>
            </div>

          </div>

          {/* Insights Bar: Ultra-compact for mobile */}
          <div className="flex-none grid grid-cols-4 gap-2 mt-4">
            <InsightBox label="Line" value="Tech" />
            <InsightBox label="Corners" value="17" />
            <InsightBox label="DRS" value="02" />
            <InsightBox label="Grade" value="G1" />
          </div>

          {/* Footer */}
          <footer className="flex-none flex justify-between items-center mt-4 pt-3 border-t border-zinc-100">
            <span className="text-[7px] font-mono font-bold uppercase tracking-[0.3em] text-zinc-300">Vault_ID_20254</span>
            <div className="flex gap-2 items-center">
                 <div className="w-1 h-1 bg-red-600 rounded-full animate-pulse" />
                 <span className="text-[7px] font-mono font-bold uppercase tracking-[0.3em] text-zinc-300">Live_Feed_Active</span>
            </div>
          </footer>

        </div>
      </div>
    </section>
  );
}

/* ================= COMPACT HELPERS ================= */

const LogEntry = ({ label, value, unit, color = "text-black", invert = false }: any) => (
  <div className={`flex justify-between items-baseline border-b pb-1 sm:pb-1.5 ${invert ? 'border-white/10' : 'border-zinc-200/50'}`}>
    <span className={`text-[8px] sm:text-[10px] font-mono font-bold uppercase tracking-wider ${invert ? 'text-white/40' : 'text-black/40'}`}>
      {label}
    </span>
    <div className="flex items-baseline gap-0.5 sm:gap-1">
        <span className={`text-sm sm:text-xl font-black italic tracking-tighter ${invert ? 'text-white' : color}`}>
        {value}
        </span>
        {unit && <span className={`text-[7px] sm:text-[8px] font-bold ${invert ? 'text-white/20' : 'text-black/20'}`}>{unit}</span>}
    </div>
  </div>
);

const InsightBox = ({ label, value }: any) => (
  <div className="bg-zinc-50 border border-zinc-100 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center sm:text-left">
    <span className="text-[7px] sm:text-[8px] font-mono font-black text-red-600 uppercase block mb-0 sm:mb-0.5 tracking-widest leading-none">
      {label}
    </span>
    <span className="text-[9px] sm:text-xs font-black uppercase text-black leading-none">
      {value}
    </span>
  </div>
);
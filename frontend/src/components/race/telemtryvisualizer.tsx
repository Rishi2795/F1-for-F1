import React from "react";

/* ================= TYPES ================= */

type Props = {
  telemetry: {
    avg_throttle?: number;
    avg_brake?: number;
    avg_rpm?: number;
    top_speed?: number;
    drs_usage_pct?: number;
    avg_speed?: number;
    avg_lat_g?: number;
    avg_lon_g?: number;
    max_rpm?: number;
    avg_gear?: number;
  };
};

/* ================= MAIN COMPONENT ================= */

export default function TelemetryLandscape({ telemetry }: Props) {
  if (!telemetry) return null;

  return (
    <section className="w-full max-w-[1300px] mx-auto mt-4 px-6 font-sans antialiased text-white overflow-hidden">
      
      {/* MINIMALIST STRIP HEADER */}
      <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
        <div className="flex items-baseline gap-4">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">
            V-MAX <span className="text-red-600">REPT.</span>
          </h2>
          <span className="hidden md:block text-[9px] font-mono font-bold text-zinc-600 tracking-[0.5em] uppercase">
            Data_Set // {new Date().getFullYear()}
          </span>
        </div>
        <div className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest">
          Node_Alpha_01
        </div>
      </div>

      {/* ONE-VIEWPORT EDITORIAL GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 md:items-stretch gap-y-10 md:gap-x-12">
        
        {/* LEFT COLUMN: HERO SPEED */}
        <div className="md:col-span-5 flex flex-col justify-center border-l-4 border-red-600 pl-6 py-2">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-2 italic">01 // Top Velocity</span>
          <div className="flex items-baseline gap-2">
            <span className="text-8xl md:text-[10rem] font-black italic tracking-[-0.05em] leading-none">
              {telemetry.top_speed ?? "—"}
            </span>
            <span className="text-xl font-light italic text-zinc-700">KM/H</span>
          </div>
        </div>

        {/* MIDDLE COLUMN: INPUTS */}
        <div className="md:col-span-4 flex flex-col justify-center gap-8 border-l border-white/5 pl-6">
          <CompactEditorialMetric 
            label="Throttle Input" 
            value={telemetry.avg_throttle?.toFixed(1) ?? "0.0"} 
            unit="%" 
            isRed 
          />
          <CompactEditorialMetric 
            label="Brake Force" 
            value={telemetry.avg_brake !== undefined ? (telemetry.avg_brake * 100).toFixed(1) : "0.0"} 
            unit="%" 
          />
        </div>

        {/* RIGHT COLUMN: TECHNICAL CLUSTER */}
        <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-1 gap-y-6 border-l border-white/5 pl-6">
          <SmallStat label="G-Force (Lat)" value={telemetry.avg_lat_g?.toFixed(2) ?? "0.00"} />
          <SmallStat label="G-Force (Lon)" value={telemetry.avg_lon_g?.toFixed(2) ?? "0.00"} />
          <SmallStat label="Max RPM" value={telemetry.max_rpm?.toLocaleString() ?? "—"} />
          <SmallStat label="Avg Gear" value={telemetry.avg_gear?.toFixed(1) ?? "—"} />
        </div>

      </div>

      {/* FOOTER DETAIL */}
      <div className="mt-12 flex items-center gap-4 text-zinc-800">
         <div className="h-px flex-1 bg-current opacity-20" />
         <span className="text-[8px] font-mono font-bold uppercase tracking-[0.8em]">Telemetry_Verified_End_To_End</span>
         <div className="h-px flex-1 bg-current opacity-20" />
      </div>
    </section>
  );
}

/* ================= SUB-COMPONENTS ================= */

function CompactEditorialMetric({ label, value, unit, isRed }: { label: string; value: string | number; unit: string; isRed?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-600 mb-1">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className={`text-5xl md:text-6xl font-black italic tracking-tighter leading-none ${isRed ? 'text-red-600' : 'text-white'}`}>
          {value}
        </span>
        <span className="text-sm font-light italic text-zinc-800 uppercase">{unit}</span>
      </div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[8px] font-mono font-bold text-zinc-700 uppercase tracking-widest leading-none mb-2">{label}</span>
      <span className="text-xl md:text-2xl font-black italic text-zinc-300 tracking-tighter leading-none">{value}</span>
    </div>
  );
}
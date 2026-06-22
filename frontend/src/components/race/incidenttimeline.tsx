import { useMemo } from "react";

type Props = {
  incidents: {
    safety_car_count: number;
    vsc_count: number;
    yellow_flags: number;
    red_flags: number;
  };
};

export default function IncidentTimeline({ incidents }: Props) {
  const items = useMemo(() => [
    { type: "RED", count: incidents?.red_flags || 0, color: "bg-red-600", border: "border-red-600/40", label: "Session Stoppage", severity: "Critical" },
    { type: "SC", count: incidents?.safety_car_count || 0, color: "bg-yellow-500", border: "border-yellow-500/40", label: "Full Safety Car", severity: "High" },
    { type: "VSC", count: incidents?.vsc_count || 0, color: "bg-orange-500", border: "border-orange-500/40", label: "Virtual Safety Car", severity: "Medium" },
    { type: "YEL", count: incidents?.yellow_flags || 0, color: "bg-yellow-300", border: "border-yellow-300/40", label: "Caution Period", severity: "Low" },
  ].filter(i => i.count > 0), [incidents]);

  const totalIncidents = items.reduce((acc, item) => acc + item.count, 0);
  const hasCritical = (incidents?.red_flags || 0) > 0;

  return (
    <section className="w-full bg-[#0a0a0a] font-sans antialiased text-white p-2 sm:p-4">
      <div className="max-w-[1400px] mx-auto bg-[#111] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/10 relative">
        <header className="flex items-center justify-between p-5 sm:p-8 border-b border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-4 h-1 bg-red-600 rounded-full" />
              <span className="text-[9px] font-mono font-bold tracking-[0.4em] text-zinc-500 uppercase">Race_Control_v2.1</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter leading-none">
              Incident <span className="text-red-600">Report</span>
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
             <div className={`w-2 h-2 rounded-full animate-pulse ${totalIncidents > 0 ? 'bg-yellow-500' : 'bg-emerald-500'}`} />
             <span className="text-[9px] font-mono font-black uppercase tracking-widest text-zinc-400">System_Active</span>
          </div>
        </header>

        <main className="p-4 sm:p-8">
          {items.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 flex flex-col gap-2">
                <p className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-[0.2em] mb-2 px-1">Active_Interventions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((item, i) => (
                    <div key={i} className={`relative p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 border-l-[4px] ${item.border} hover:bg-white/[0.07] transition-all flex items-center justify-between group overflow-hidden`}>
                      <div className="absolute -right-2 -bottom-1 text-4xl font-black italic opacity-[0.03] pointer-events-none uppercase">{item.type}</div>
                      <div className="relative z-10">
                        <p className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1">{item.severity}</p>
                        <h3 className="text-xs font-black uppercase tracking-wide text-white/80 leading-none">{item.label}</h3>
                      </div>
                      <div className="relative z-10 text-right">
                        <span className="text-2xl font-black italic text-white group-hover:text-red-500 transition-colors">×{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-[0.3em] mb-4">Impact_Distribution</p>
                    <div className="h-2 flex rounded-full overflow-hidden bg-white/10 mb-5">
                      {items.map((item, i) => (
                        <div key={i} className={`${item.color} transition-all`} style={{ width: `${(item.count / totalIncidents) * 100}%` }} />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                      {items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 ${item.color} rounded-full`} />
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">{item.type}</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">{((item.count/totalIncidents)*100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                </div>

                <div className={`rounded-2xl p-5 border flex flex-col justify-between h-full transition-all ${hasCritical ? 'bg-red-600/[0.03] border-red-600/20' : 'bg-emerald-600/[0.03] border-emerald-600/20'}`}>
                   <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-1 h-4 rounded-full ${hasCritical ? 'bg-red-600' : 'bg-emerald-500'}`} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Telemetry_Briefing</p>
                      </div>
                      <p className="text-xs font-medium text-zinc-400 leading-relaxed italic uppercase">
                        {hasCritical 
                          ? `Critical disruption detected. ${incidents?.red_flags} Stoppage(s) recorded.` 
                          : `Nominal race flow. ${totalIncidents} Total interventions managed.`}
                      </p>
                   </div>
                   <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-end">
                      <div>
                         <p className="text-[8px] font-mono font-bold text-zinc-600 uppercase mb-1">Total_Events</p>
                         <p className="text-3xl font-black italic leading-none">{totalIncidents}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[8px] font-mono font-bold text-zinc-600 uppercase mb-1">Risk_Level</p>
                         <p className={`text-sm font-black italic ${hasCritical ? 'text-red-500' : 'text-emerald-500'}`}>
                            {hasCritical ? 'ELEVATED' : 'STABLE'}
                         </p>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center opacity-30">
                <p className="font-mono text-[10px] tracking-[0.5em] font-bold uppercase text-zinc-500">No_Incidents_Logged</p>
            </div>
          )}
        </main>

        <footer className="flex justify-between items-center px-8 py-5 border-t border-white/5 bg-white/[0.01]">
            <div className="flex gap-6">
               <div className="flex flex-col">
                  <span className="text-[7px] font-mono font-bold text-zinc-600 uppercase">Status</span>
                  <span className="text-[9px] font-bold text-emerald-500 uppercase">Secure</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[7px] font-mono font-bold text-zinc-600 uppercase">Log_Node</span>
                  <span className="text-[9px] font-bold text-white uppercase tracking-tighter">RC_00X_INC</span>
               </div>
            </div>
            <div className="flex items-center gap-3 text-zinc-500 text-[9px] font-mono uppercase tracking-widest">
               <div className="h-0.5 w-12 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-600 w-2/3 animate-pulse" />
               </div>
               Vault_Stable
            </div>
        </footer>
      </div>
    </section>
  );
}
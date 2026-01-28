import { useEffect, useState, useMemo, memo } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const TEAM_COLORS: Record<string, string> = {
  "Red Bull Racing": "#0038FF", Ferrari: "#FF0000", Mercedes: "#00FFD1", 
  McLaren: "#FF8A00", "Aston Martin": "#00FF57", Alpine: "#FF00E5", 
  Williams: "#00A3FF", RB: "#2B45FF", "Haas F1 Team": "#FFF", Sauber: "#52FF00",
};

const TRACK_HISTORY: Record<string, string> = {
  "Bahrain Grand Prix": "Bahrain rewards tyre management and disciplined execution. Rear degradation exposes weak setups.",
  "Miami Grand Prix": "Miami mixes street sections with long straights — timing and track position are critical.",
  "Monaco Grand Prix": "Overtaking is nearly impossible. Strategy revolves entirely around track control.",
};

/* ================= TYPES ================= */

type Driver = {
  driver_code: string; team: string; grid: number; finish: number;
  positions_gained: number; stops: number; tyre_sequence: string[];
  longest_stint: number; strategy_risk: { risk_score: number; risk_label: string };
  strategy_simulation: { verdict: string }; tyre_degradation_index: number;
  pit_efficiency: string; consistency_index: number | null;
};

type RaceData = {
  season: number; round: number; event_name: string; location: string;
  drivers: Driver[]; derived: { winning_recipe: { typical_stops: number; common_tyre_sequence: string; avg_longest_stint: number; }; style_profile: string[]; };
};

/* ================= MAIN DASHBOARD ================= */

export default function RaceDashboard() {
  const { year = "2023", round } = useParams();
  const [race, setRace] = useState<RaceData | null>(null);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [driverA, setDriverA] = useState("");
  const [driverB, setDriverB] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/seasons/${year}/races/${round}`)
      .then((res) => {
        setRace(res.data);
        setTimeout(() => setIsLoaded(true), 150);
      })
      .catch(console.error);
  }, [year, round]);

  const teamStats = useMemo(() => {
    if (!race) return [];
    const stats = race.drivers.reduce((acc: any, d) => {
      acc[d.team] ??= { team: d.team, count: 0, finish: 0, gained: 0 };
      acc[d.team].count++;
      acc[d.team].finish += d.finish;
      acc[d.team].gained += d.positions_gained;
      return acc;
    }, {});
    return Object.values(stats);
  }, [race]);

  if (!race) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
      <div className="font-mono text-[8px] tracking-[0.8em] text-white italic uppercase">Initialising_Core_Uplink</div>
    </div>
  );

  const driverMap = Object.fromEntries(race.drivers.map((d) => [d.driver_code, d]));
  const A = driverA ? driverMap[driverA] : null;
  const B = driverB ? driverMap[driverB] : null;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-red-600 selection:text-white overflow-x-hidden antialiased">
      
      {/* SECTION 0: TOP GLOBAL NAV (ULTRA SMALL) */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/5 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-[9px] font-black tracking-widest text-white hover:text-red-600 transition-colors uppercase">VAULT_HOME</Link>
          <div className="w-px h-3 bg-white/10" />
          <span className="text-[9px] font-mono text-zinc-500 uppercase">SYS_ACTIVE // {race.season}.R{race.round}</span>
        </div>
        <div className="text-[9px] font-black text-red-600 animate-pulse tracking-tighter italic uppercase">Live_Telemetry_Feed</div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-6 pt-24 pb-32 space-y-24 md:space-y-32">
        
        {/* SECTION 1: HEADER & META */}
<header className="opacity-100 translate-y-0">
  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end border-b border-white/10 pb-6">
    <div className="md:col-span-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black uppercase rounded-sm">Season_{race.season}</span>
        <span className="text-[9px] font-mono text-zinc-500 uppercase">Track_Position: {race.location}</span>
      </div>
      <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none text-white">
        {race.event_name}
      </h1>
    </div>
    <div className="md:col-span-4 flex justify-end gap-12">
      <HeroMeta label="CIRCUIT" value={race.location} />
      <HeroMeta label="RACE_ID" value={`GP_R${race.round}`} />
      <HeroMeta label="STATUS" value="OFFICIAL" />
    </div>
  </div>
</header>

        {/* SECTION 2: TRACK INTEL & OPTIMA (BENTO GRID) */}
        <section className="space-y-4">
          <SectionLabel id="01" title="CIRCUIT_ARCHITECTURE" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-sm overflow-hidden">
            <div className="lg:col-span-2 bg-black p-8 md:p-12">
               <p className="font-serif text-xl md:text-2xl text-zinc-200 leading-relaxed italic max-w-2xl mb-12">
                 "{TRACK_HISTORY[race.event_name] ?? "High-speed aero stability and thermal management are the primary performance inhibitors here."}"
               </p>
               <div className="flex flex-wrap gap-2">
                 {race.derived.style_profile.map((tag: string) => (
                   <span key={tag} className="px-3 py-1 bg-white/5 border border-white/10 text-[8px] font-bold text-zinc-400 uppercase tracking-widest rounded-sm">{tag}</span>
                 ))}
               </div>
            </div>
            <div className="bg-white p-8 md:p-12">
               <Label color="text-zinc-400">STRATEGY_WINDOW</Label>
               <div className="space-y-6 mt-8">
                 <MetricWhite label="Pit Stops" value={race.derived.winning_recipe.typical_stops} />
                 <MetricWhite label="Compound" value={race.derived.winning_recipe.common_tyre_sequence} />
                 <MetricWhite label="Max Stint" value={`${race.derived.winning_recipe.avg_longest_stint} Laps`} />
               </div>
            </div>
          </div>
        </section>

       {/* ================= SECTION 3: CONSTRUCTOR INTELLIGENCE ================= */}
<section className="py-12 md:py-20 px-4 md:px-12 bg-[#050505] flex flex-col items-center overflow-hidden">
  <div className="w-full max-w-6xl space-y-10">
    
    {/* HEADER */}
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <span className="text-red-600 font-mono text-[10px] font-bold border border-red-600/30 px-2 py-0.5 rounded-sm">CAL_02</span>
          <h2 className="text-white font-serif italic tracking-tight text-3xl md:text-4xl leading-none">Constructor <span className="font-sans not-italic font-black text-xl md:text-2xl uppercase tracking-tighter opacity-70">Stability</span></h2>
        </div>
        <p className="text-zinc-500 text-[9px] font-mono uppercase tracking-[0.4em] pl-1">Unit_Efficiency_Protocol_v4.2</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col md:items-end">
          <span className="text-[7px] font-mono text-zinc-600 uppercase tracking-[0.2em]">System_Status</span>
          <span className="text-[10px] font-black text-green-500 italic flex items-center gap-2">
            <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
            LIVE_DATA_SYNC
          </span>
        </div>
      </div>
    </div>

    {/* THE GRID: White Cards on all devices */}
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3 md:gap-px bg-white/5 md:bg-white/10 md:border md:border-white/10 overflow-hidden shadow-2xl">
      {teamStats.sort((a: any, b: any) => (a.finish / a.count) - (b.finish / b.count)).map((t: any) => {
        const teamColor = TEAM_COLORS[t.team] || '#444';
        const score = Math.max(10, 100 - (t.finish / t.count) * 4);
        
        return (
          <div 
            key={t.team} 
            className="group relative p-6 bg-white transition-all duration-500 md:hover:bg-[#060606] border-b border-zinc-100 md:border-none last:border-none"
          >
            {/* HOVER/TAP ACCENT */}
            <div 
              className="absolute inset-0 opacity-0 md:group-hover:opacity-[0.03] pointer-events-none transition-opacity duration-700"
              style={{ background: `linear-gradient(180deg, ${teamColor} 0%, transparent 100%)` }} 
            />

            <div className="relative z-10 flex flex-col h-full space-y-8">
              
              {/* CARD TOP: TEAM IDENTITY */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-black uppercase tracking-widest group-hover:md:text-white transition-colors">
                    {t.team}
                  </p>
                  <div className="h-[2px] w-6" style={{ backgroundColor: teamColor }} />
                </div>
                <span className="text-[8px] font-mono text-zinc-400 uppercase italic">
                  {t.team.substring(0, 3)}_SPEC
                </span>
              </div>

              {/* CENTER: PRIMARY METRIC */}
              <div className="flex items-end justify-between">
                <div className="flex flex-col">
                  <span className="text-[7px] font-mono text-zinc-400 group-hover:md:text-zinc-600 uppercase mb-1 tracking-tighter italic transition-colors">Avg_Finish</span>
                  <span className="text-5xl font-black italic text-black tracking-tighter leading-none group-hover:md:text-red-600 transition-colors duration-500">
                    {(t.finish / t.count).toFixed(1)}
                  </span>
                </div>
                
                <div className={`px-2 py-1 rounded-sm text-[11px] font-black italic ${
                  t.gained >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-600'
                }`}>
                  {t.gained >= 0 ? `+${t.gained}` : t.gained}
                </div>
              </div>

              {/* BOTTOM: STABILITY COMPONENT */}
              <div className="space-y-3 pt-4 border-t border-zinc-50 md:border-zinc-100 group-hover:md:border-white/5 transition-colors">
                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em]">
                  <span className="text-zinc-400 group-hover:md:text-zinc-500">Stability</span>
                  <span className="text-black font-mono group-hover:md:text-white">{score.toFixed(0)}%</span>
                </div>
                
                {/* SEGMENTED BAR */}
                <div className="flex gap-1 h-1 w-full bg-zinc-50 md:group-hover:bg-zinc-900 transition-colors">
                  {[...Array(10)].map((_, i) => {
                    const isActive = (i + 1) <= (score / 10);
                    return (
                      <div 
                        key={i}
                        className={`flex-1 transition-all duration-700 ${
                          isActive ? 'bg-zinc-200 md:group-hover:bg-zinc-700' : 'bg-transparent'
                        }`}
                        style={{ 
                            backgroundColor: isActive ? (undefined) : '',
                            // This will be overridden by the inner div on hover
                        }}
                      >
                        {isActive && (
                          <div 
                            className="w-full h-full opacity-0 md:group-hover:opacity-100 transition-all duration-500" 
                            style={{ backgroundColor: teamColor }} 
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* WATERMARK DECAL */}
            <span className="absolute bottom-2 right-2 text-6xl font-black italic text-zinc-100/60 md:group-hover:text-white/[0.03] transition-all pointer-events-none uppercase leading-none select-none">
              {t.team.split(' ')[0].substring(0, 3)}
            </span>
          </div>
        );
      })}
    </div>
  </div>
</section>
        {/* ================= SECTION 4: PERSONNEL LOGS ================= */}
<section className="py-12 px-4 md:px-12 bg-black flex flex-col items-center">
  {/* Maintain the wide desktop presence with consistent 2-3 finger gap */}
  <div className="w-full max-w-7xl space-y-4">
    
    {/* COMPRESSED HEADER */}
    <div className="flex items-end justify-between px-2 mb-6">
      <div className="flex items-center gap-3">
        <span className="text-red-600 font-mono text-[10px] font-bold border border-red-600/30 px-1.5 py-0.5">03</span>
        <h2 className="text-white font-serif italic text-xl md:text-2xl tracking-tight">Driver <span className="font-sans not-italic font-black text-sm uppercase opacity-40">Standings</span></h2>
      </div>
      <div className="hidden md:flex items-center gap-4">
        <div className="h-[1px] w-24 bg-white/10" />
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Feed_Status: <span className="text-green-500 animate-pulse">Click to expand</span></span>
      </div>
    </div>

    {/* DATA FEED: Slimmer rows, denser information */}
    <div className="flex flex-col gap-px bg-white/5 border border-white/5 rounded-sm overflow-hidden">
      {race.drivers.map((d: any) => {
        const teamColor = TEAM_COLORS[d.team] || '#444';
        const isExpanded = expandedDriver === d.driver_code;

        return (
          <div 
            key={d.driver_code}
            onClick={() => setExpandedDriver(isExpanded ? null : d.driver_code)}
            className={`group relative flex flex-col transition-all duration-300 cursor-pointer ${
              isExpanded ? 'bg-white z-20' : 'bg-[#080808] hover:bg-[#0c0c0c]'
            }`}
          >
            {/* --- COMPRESSED STRIP VIEW --- */}
            <div className="flex items-center justify-between px-4 py-2 md:py-3 relative overflow-hidden">
              
              {/* MINI DECAL BACKGROUND */}
              <span className={`absolute left-20 text-4xl font-black italic transition-all pointer-events-none uppercase ${
                isExpanded ? 'text-zinc-100 opacity-100' : 'text-white/[0.02]'
              }`}>
                {d.driver_code}
              </span>

              <div className="relative z-10 flex items-center gap-6">
                <span className={`text-[10px] font-mono font-black italic w-6 text-center ${isExpanded ? 'text-red-600' : 'text-zinc-600'}`}>
                  {d.finish.toString().padStart(2, '0')}
                </span>
                
                <div className="w-[2px] h-6" style={{ backgroundColor: teamColor }} />
                
                <div className="flex items-baseline gap-3">
                  <h4 className={`text-sm md:text-base font-black uppercase tracking-tighter ${
                    isExpanded ? 'text-black' : 'text-white'
                  }`}>
                    {d.driver_code}
                  </h4>
                  <p className="text-[7px] uppercase tracking-widest font-bold text-zinc-500">
                    {d.team.split(' ')[0]}
                  </p>
                </div>
              </div>

              {/* SLIM TELEMETRY PREVIEW (Visible on Desktop) */}
              <div className="relative z-10 flex items-center gap-10">
                <div className="hidden lg:flex gap-8">
                  <div className="flex flex-col">
                    <span className="text-[6px] text-zinc-500 font-mono uppercase">Grid</span>
                    <span className={`text-[10px] font-bold ${isExpanded ? 'text-black' : 'text-white'}`}>P{d.grid}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[6px] text-zinc-500 font-mono uppercase">T_Life</span>
                    <span className={`text-[10px] font-bold ${isExpanded ? 'text-black' : 'text-white'}`}>{d.tyre_degradation_index}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end w-12">
                  <span className={`text-sm md:text-lg font-black italic ${
                    d.positions_gained >= 0 ? 'text-green-500' : 'text-red-600'
                  }`}>
                    {d.positions_gained > 0 ? `+${d.positions_gained}` : d.positions_gained}
                  </span>
                </div>

                <div className={`w-1 h-6 transition-colors ${
                  isExpanded ? 'bg-red-600' : 'bg-zinc-800 group-hover:bg-zinc-700'
                }`} />
              </div>
            </div>

            {/* --- DENSE TECH EXPANSION --- */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isExpanded ? 'max-h-[300px]' : 'max-h-0'
            }`}>
              <div className="px-10 py-6 border-t border-zinc-100 bg-zinc-50 grid grid-cols-1 md:grid-cols-12 gap-8">
                
                {/* 01: PERFORMANCE GRID (Takes 7 cols) */}
                <div className="md:col-span-7 grid grid-cols-3 gap-4">
                   <div className="space-y-1">
                      <span className="block text-[7px] text-zinc-400 font-mono uppercase border-b border-zinc-200 pb-1">Aggression</span>
                      <span className="text-sm font-black text-black">{d.strategy_risk.risk_score}%</span>
                   </div>
                   <div className="space-y-1">
                      <span className="block text-[7px] text-zinc-400 font-mono uppercase border-b border-zinc-200 pb-1">Consistency</span>
                      <span className="text-sm font-black text-black">{d.consistency_index}%</span>
                   </div>
                   <div className="space-y-1">
                      <span className="block text-[7px] text-zinc-400 font-mono uppercase border-b border-zinc-200 pb-1">Telemetry</span>
                      <span className="text-[9px] font-bold text-red-600 italic">ACTIVE_LINK</span>
                   </div>
                   <div className="col-span-3 pt-2">
                      <div className="h-0.5 bg-zinc-200 w-full relative">
                        <div className="absolute top-0 left-0 h-full bg-black" style={{ width: `${d.consistency_index}%` }} />
                      </div>
                   </div>
                </div>

                {/* 02: VERDICT (Takes 5 cols) */}
                <div className="md:col-span-5 border-l border-zinc-200 pl-8">
                  <span className="block text-[7px] text-zinc-400 font-mono uppercase mb-2">Sim_Verdict</span>
                  <p className="font-serif italic text-[11px] text-black leading-snug">
                    "{d.strategy_simulation.verdict}"
                  </p>
                </div>
              </div>

              <div className="bg-black text-[6px] font-mono text-zinc-600 px-10 py-1 uppercase tracking-[0.5em] text-right">
                ID: {d.driver_code}_XMT_LOG_03
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
</section>

        {/* ================= SECTION 5: VS COMPARISON ENGINE ================= */}
<section className="py-10 border-t border-white/5 bg-black">
  <div className="max-w-[1200px] mx-auto px-6">
    
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      
      {/* LEFT BOX: DRIVER SELECTION (The Control Panel) */}
      <div className="w-full lg:w-[300px] shrink-0 space-y-1">
        <div className="px-3 py-2 bg-red-600 rounded-t-sm">
           <h2 className="text-[10px] font-black tracking-[0.3em] uppercase text-white">Selection_Sync</h2>
        </div>
        <div className="bg-[#050505] border border-white/5 p-4 rounded-b-sm space-y-4">
          <VSelector label="Alpha_Pilot" value={driverA} onChange={setDriverA} drivers={race.drivers} />
          <div className="h-px bg-white/5 w-full" />
          <VSelector label="Beta_Pilot" value={driverB} onChange={setDriverB} drivers={race.drivers} />
          
          <div className="pt-4 mt-4 border-t border-white/5">
             <p className="text-[8px] font-mono text-zinc-600 leading-tight uppercase tracking-widest">
               Status: {A && B ? "Simulation_Ready" : "Awaiting_Input"}
             </p>
          </div>
        </div>
      </div>

      {/* RIGHT BOX: ACTUAL COMPARISON (The Data Output) */}
      <div className="flex-grow w-full">
        {A && B ? (
          <div className="bg-[#050505] border border-white/10 rounded-sm animate-in fade-in slide-in-from-right-4 duration-500">
            
            {/* COMPACT HUD HEADER */}
            <div className="grid grid-cols-3 items-center px-6 py-8 border-b border-white/[0.03] bg-white/[0.01]">
              <div className="scale-[0.8] origin-left"><VComparePilot d={A} /></div>
              <div className="text-center font-serif italic text-white/20 text-xs tracking-widest">VERSUS</div>
              <div className="scale-[0.8] origin-right"><VComparePilot d={B} /></div>
            </div>

            {/* DATA STRIPS */}
            <div className="p-2 space-y-0.5">
              <VMetricRow label="F_POS" a={A.finish} b={B.finish} />
              <VMetricRow label="G_POS" a={A.grid} b={B.grid} />
              <VMetricRow label="RISK" a={`${A.strategy_risk.risk_score}%`} b={`${B.strategy_risk.risk_score}%`} />
              <VMetricRow label="DEGR" a={A.tyre_degradation_index} b={B.tyre_degradation_index} />
            </div>

            {/* MICRO VERDICTS */}
            <div className="grid grid-cols-2 border-t border-white/5 divide-x divide-white/5">
              <div className="p-5 bg-black/40 group hover:bg-black/60 transition-colors">
                <span className="text-[7px] font-black text-red-600 uppercase tracking-widest block mb-2">Alpha_Logic</span>
                <p className="font-serif italic text-[11px] text-zinc-400 leading-relaxed line-clamp-2 italic">
                  "{A.strategy_simulation.verdict}"
                </p>
              </div>
              <div className="p-5 bg-black/40 group hover:bg-black/60 transition-colors">
                <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest block mb-2 text-right">Beta_Logic</span>
                <p className="font-serif italic text-[11px] text-zinc-400 leading-relaxed line-clamp-2 text-right italic">
                  "{B.strategy_simulation.verdict}"
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[340px] border border-dashed border-white/5 rounded-sm flex flex-col items-center justify-center space-y-4 bg-[#030303]">
             <div className="w-4 h-4 border border-white/10 border-t-red-600 animate-spin rounded-full" />
             <span className="text-[9px] font-mono text-zinc-800 uppercase tracking-[0.6em]">Initialize_Simulation_Sequence</span>
          </div>
        )}
      </div>

    </div>
  </div>
</section>
      </main>
      
      {/* GLOBAL FOOTER */}
      <footer className="border-t border-white/5 py-12 px-10 text-center">
         <p className="text-[8px] text-zinc-700 font-mono tracking-widest uppercase">© 2026 Circuit_Vault_Technologies // Data_Proprietary</p>
      </footer>
    </div>
  );
}

/* ================= ATOMIC COMPONENTS ================= */

const SectionLabel = memo(({ id, title }: any) => (
  <div className="flex items-center gap-3">
    <span className="text-[9px] font-black text-red-600 font-mono">[{id}]</span>
    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white italic">{title}</h3>
    <div className="flex-1 h-px bg-white/5" />
  </div>
));

const HeroMeta = memo(({ label, value }: any) => (
  <div className="flex flex-col items-end">
    <span className="text-[8px] font-black text-zinc-600 mb-1 tracking-widest uppercase">{label}</span>
    <span className="text-xs font-black italic uppercase tracking-tighter text-white">{value}</span>
  </div>
));

const Label = memo(({ children, color = "text-red-600" }: any) => (
  <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${color} mb-4`}>{children}</p>
));

const MetricWhite = memo(({ label, value }: any) => (
  <div className="flex justify-between items-end border-b border-zinc-100 pb-2 hover:border-black transition-colors">
    <span className="text-[8px] uppercase font-black text-zinc-400 tracking-widest">{label}</span>
    <span className="text-xl font-black italic tracking-tighter uppercase leading-none text-black">{value}</span>
  </div>
));

const DriverStrip = memo(({ driver, isExpanded, onToggle }: any) => (
  <div 
    onClick={onToggle}
    className={`
      group relative cursor-pointer transition-all duration-300
      ${isExpanded ? 'bg-white text-black p-8' : 'bg-red-600 text-white hover:bg-black hover:text-white p-4 md:px-10'}
    `}
  >
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="flex items-center gap-8">
        <span className={`text-[9px] font-mono font-bold italic opacity-50 ${isExpanded ? 'text-zinc-400' : 'text-white'}`}>#{driver.finish}</span>
        <div>
          <p className="text-xl md:text-2xl font-black italic tracking-tighter uppercase leading-none">{driver.driver_code}</p>
          <p className={`text-[7px] font-bold tracking-widest uppercase mt-1 ${isExpanded ? 'text-zinc-500' : 'text-red-200 group-hover:text-red-600'}`}>
            {driver.team}
          </p>
        </div>
      </div>
      
      <div className="flex gap-8 text-right items-center">
        <CompactStat label="GRID" val={driver.grid} inv={isExpanded} />
        <CompactStat label="GAIN" val={driver.positions_gained > 0 ? `+${driver.positions_gained}` : driver.positions_gained} inv={isExpanded} />
        <CompactStat label="CONS" val={`${driver.consistency_index}%`} inv={isExpanded} />
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[9px] font-black transition-all
          ${isExpanded ? 'border-red-600 text-red-600 scale-110' : 'border-white/20 group-hover:border-red-600 group-hover:text-red-600'}`}>
          {driver.driver_code.slice(0, 1)}
        </div>
      </div>
    </div>

    {isExpanded && (
      <div className="mt-8 pt-8 border-t border-black/5 animate-in slide-in-from-top-2 duration-300">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-8">
            <h4 className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-4">// SIMULATION_VERDICT</h4>
            <p className="font-serif text-lg md:text-xl italic text-zinc-900 leading-snug">"{driver.strategy_simulation.verdict}"</p>
          </div>
          <div className="md:col-span-4 space-y-4">
            <DetailRow label="Pit Efficiency" value={driver.pit_efficiency} />
            <DetailRow label="Degradation Index" value={driver.tyre_degradation_index} />
            <div className="flex gap-2 pt-2">
               <span className="px-2 py-0.5 bg-red-600 text-white text-[7px] font-black uppercase rounded-sm">High_Deg_Alert</span>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
));

const CompactStat = ({ label, val, inv }: any) => (
  <div className="flex flex-col min-w-[40px]">
    <span className={`text-[7px] font-black uppercase mb-0.5 tracking-tighter ${inv ? 'text-zinc-400' : 'text-red-100/60'}`}>{label}</span>
    <span className={`text-sm font-black italic leading-none ${inv ? 'text-black' : 'text-white'}`}>{val}</span>
  </div>
);

const DetailRow = ({ label, value }: any) => (
  <div className="flex justify-between items-center py-2 border-b border-black/5">
    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{label}</span>
    <span className="text-xs font-black italic text-red-600">{value}</span>
  </div>
);

const VSelector = ({ label, value, onChange, drivers }: any) => (
  <div className="text-left">
    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-2 ml-2 uppercase">{label}</p>
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className="w-full bg-[#111] border border-white/10 rounded-sm p-3 px-4 font-black italic uppercase text-[10px] text-white outline-none focus:border-red-600 transition-all cursor-pointer hover:bg-zinc-900"
    >
      <option value="">Pilot_Select_NULL</option>
      {drivers.map((d: any) => <option key={d.driver_code} value={d.driver_code}>{d.driver_code} // {d.team}</option>)}
    </select>
  </div>
);

const VComparePilot = ({ d }: any) => (
  <div className="text-center">
    <p className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase mb-2 text-white">{d.driver_code}</p>
    <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">{d.team}</p>
  </div>
);

const VMetricRow = ({ label, a, b }: any) => (
  <div className="grid grid-cols-3 py-4 items-center border-b border-white/5 hover:bg-white/[0.02] transition-all px-4 group">
    <div className="text-xl md:text-2xl font-black italic tracking-tighter text-center text-white">{a}</div>
    <div className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-700 text-center italic">{label}</div>
    <div className="text-xl md:text-2xl font-black italic tracking-tighter text-center text-white">{b}</div>
  </div>
);

const VerdictBox = ({ label, text, highlight }: any) => (
  <div className={`p-6 rounded-sm border transition-all duration-500 ${highlight ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-[#111] text-zinc-300 border-white/5'}`}>
    <p className={`text-[8px] font-black uppercase mb-4 tracking-[0.2em] ${highlight ? 'text-white/60' : 'text-zinc-500'}`}>{label}</p>
    <p className="font-serif text-sm leading-relaxed italic">"{text}"</p>
  </div>
);
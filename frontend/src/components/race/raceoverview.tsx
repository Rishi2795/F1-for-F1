import React from "react";

type Props = {
  race: any;
  insights: any;
};

const safe = (v: any, d: any = "0") =>
  v === undefined || v === null || v === "" ? d : v;

const formatDuration = (raw: any) => {
  if (!raw) return "—";
  const match = raw.match(/(\d+):(\d+):(\d+)/);
  if (!match) return raw;
  const [, h, m, s] = match;
  return `${parseInt(h)}h ${parseInt(m)}m ${parseInt(s)}s`;
};

const getManualTrackLog = (eventName: string) => {
  const manualList: Record<string, string> ={

    // Core Calendar

    "Australian Grand Prix":
      "A fast-flowing semi-street layout where rear stability and tire degradation shape race strategy.",

    "Chinese Grand Prix":
      "Long-radius corners and a massive back straight punish front tires and reward slipstreaming.",

    "Japanese Grand Prix":
      "Suzuka’s iconic figure-eight layout demands precision, high downforce, and driver bravery.",

    "Bahrain Grand Prix":
      "A traction-heavy desert circuit where thermal degradation and heavy braking dominate strategy.",

    "Saudi Arabian Grand Prix":
      "The fastest street circuit on the calendar, combining blind high-speed corners with unforgiving walls.",

    "Miami Grand Prix":
      "A modern hybrid circuit requiring traction precision and strong straight-line efficiency.",

    "Emilia Romagna Grand Prix":
      "A narrow historic layout where track position outweighs raw pace.",

    "Monaco Grand Prix":
      "The narrowest and most technical circuit in Formula 1, where qualifying is everything.",

    "Spanish Grand Prix":
      "A benchmark circuit exposing aerodynamic weaknesses and tire management issues.",

    "Canadian Grand Prix":
      "A stop-start track rewarding braking stability and straight-line speed.",

    "Austrian Grand Prix":
      "A short, power-sensitive circuit featuring heavy braking zones and repeated overtaking opportunities.",

    "British Grand Prix":
      "A high-speed classic with sweeping corners pushing aerodynamic grip to its limits.",

    "Belgian Grand Prix":
      "An iconic high-speed circuit blending elevation change with long straights and technical sectors.",

    "Hungarian Grand Prix":
      "A tight, twisty layout demanding maximum downforce and relentless concentration.",

    "Dutch Grand Prix":
      "A banked, narrow circuit rewarding aggressive driving lines and high downforce setups.",

    "Italian Grand Prix":
      "The temple of speed, prioritizing low drag and braking performance.",

    "Azerbaijan Grand Prix":
      "A dramatic street circuit mixing ultra-tight corners with one of the longest straights in F1.",

    "Singapore Grand Prix":
      "A physically demanding night race where cooling, traction, and precision are critical.",

    "United States Grand Prix":
      "A technical multi-sector circuit blending elevation change with strong overtaking zones.",

    "Mexico City Grand Prix":
      "High altitude reduces downforce, challenging cooling systems and power units.",

    "São Paulo Grand Prix":
      "An anti-clockwise circuit encouraging overtakes through elevation shifts and unpredictable weather.",

    "Las Vegas Grand Prix":
      "A night spectacle centered on extreme straight-line speed and heavy braking zones.",

    "Qatar Grand Prix":
      "A high-speed flowing layout stressing tire durability and lateral grip.",

    "Abu Dhabi Grand Prix":
      "A twilight finale balancing long straights with tight technical sectors.",


    // Temporary / Special Events

    "Tuscan Grand Prix":
      "A high-speed flowing Mugello layout with minimal runoff punishing mistakes.",

    "Eifel Grand Prix":
      "Cold and technical Nürburgring conditions emphasizing adaptability.",

    "Styrian Grand Prix":
      "A short Red Bull Ring layout emphasizing power deployment.",

    "70th Anniversary Grand Prix":
      "A tire-limited Silverstone race demanding strategic creativity.",

    "Sakhir Grand Prix":
      "The outer loop variant emphasizing flat-out speed and slipstream battles.",

    "Portuguese Grand Prix":
      "A rollercoaster Portimão layout with dramatic elevation changes.",

    "Turkish Grand Prix":
      "Low-grip asphalt making tire warming and balance critical.",

    "French Grand Prix":
      "A smooth circuit where aerodynamic efficiency dominates.",

    "Russian Grand Prix":
      "A flat street-style layout prioritizing consistency and race pace."
  };


  return manualList[eventName] || "A technically demanding circuit where setup precision, tire management, and race strategy play a decisive role.";
};

export default function UniversalRaceVault({ race, insights }: Props) {
  if (!race || !insights) return null;

  const meta = {
    event: race?.event || race?.event_name,
    track: race?.track_name || race?.circuit_name || "International Circuit",
    location: race?.location,
    season: race?.season,
    round: race?.round,
    date: race?.date,
  };

  const winner = insights?.winner || {};
  const weather = insights?.weather || race?.track || {};
  const incidents = insights?.incidents || {};
  const event = insights?.event_info || {};
  const positionsGained = parseInt(safe(winner.grid, "0")) - 1;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600 selection:text-white antialiased">
      
      {/* HEADER */}
      <header className="border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-1">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-1.5 h-1 sm:w-2 sm:h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.6)]" />
              <span className="text-[9px] sm:text-[10px] font-black tracking-[0.25em] sm:tracking-[0.3em] uppercase text-white/80">RACE VAULT</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-[8px] sm:text-[15px] font-mono uppercase tracking-wider text-red-600">
              <span className="hidden sm:inline">ROUND {meta.round}</span>
              <span>{meta.season}</span>
            </div>
          </div>
          
          <div className="space-y-1 sm:space-y-1">
            <h1 className="text-4xl font-serif sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[0.85] sm:leading-[0.8] text-white">
              {meta.event}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[10px] sm:text-xs font-medium tracking-wide text-white/50">
              <span className="text-red-500 font-bold">{meta.location}</span>
              <span className="hidden sm:inline opacity-50">•</span>
              <span className="italic text-white/60">{meta.track}</span>
              <span className="hidden sm:inline opacity-50">•</span>
              <span>{meta.date ? new Date(meta.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBC'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        
        {/* WINNER HERO SECTION */}
        <article className="mb-6 sm:mb-8 lg:mb-12">
          <div className="bg-white text-black rounded-lg sm:rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(255,255,255,0.1)]">
            <div className="p-5 sm:p-8 lg:p-12">
              
              {/* Winner Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-6 sm:mb-10">
                <div className="space-y-2 sm:space-y-3">
                  <span className="inline-block px-3 py-1 bg-red-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] rounded">
                    Race Winner
                  </span>
                  <h2 className="text-7xl sm:text-xl md:text-7xl lg:text-[6rem] font-black uppercase tracking-tighter leading-[0.75]">
                    {safe(winner.driver_code, "PIA")}
                  </h2>
                  <p className="text-xs sm:text-sm text-black/50 font-bold uppercase tracking-[0.15em]">
                    {safe(winner.team, "MCLAREN")}
                  </p>
                </div>
                
                {/* Tire Strategy */}
                <div className="flex sm:flex-col gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-black/5 rounded border border-black/10">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-yellow-500 flex items-center justify-center">
                      <span className="text-[9px] sm:text-[10px] font-black text-yellow-600">M</span>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-black/50">Medium</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-black/5 rounded border border-black/10">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-black/30 flex items-center justify-center">
                      <span className="text-[9px] sm:text-[10px] font-black text-black/40">H</span>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-black/50">Hard</span>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
                <StatCard label="Starting Grid" value={winner.grid || "1"} />
                <StatCard label="Positions Gained" value={positionsGained > 0 ? `+${positionsGained}` : "0"} highlight />
                <StatCard label="Top Speed" value={winner.top_speed || "331"} unit="km/h" />
                <StatCard label="Race Time" value={formatDuration(event.race_duration)} small />
              </div>
            </div>
          </div>
        </article>

        {/* TWO-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          
          {/* LEFT COLUMN - TRACK INFO & CONDITIONS */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            
            {/* Track Description */}
            <section className="border border-white/10 rounded-lg p-5 sm:p-8 bg-white/5">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-[0.15em] mb-4 sm:mb-6 text-white/40">
                Circuit Analysis
              </h3>
              <p className="text-lg sm:text-xl md:text-2xl font-serif leading-relaxed text-white/90 italic">
                "{getManualTrackLog(meta.event)}"
              </p>
            </section>

            {/* Weather & Track Conditions */}
            <section className="border border-white/10 rounded-lg overflow-hidden bg-white/5">
              <div className="bg-white/5 px-5 sm:px-8 py-3 sm:py-4 border-b border-white/10">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-[0.15em] text-white/40">
                  Track Conditions
                </h3>
              </div>
              <div className="p-5 sm:p-8">
                <div className="grid grid-cols-3 gap-4 sm:gap-8">
                  <DataPoint 
                    label="Track Temp" 
                    value={`${safe(weather.track_temp ?? weather.avg_temp_track)}°C`} 
                  />
                  <DataPoint 
                    label="Air Temp" 
                    value={`${safe(weather.air_temp ?? weather.avg_temp_air)}°C`} 
                  />
                  <DataPoint 
                    label="Humidity" 
                    value={`${safe(weather.humidity)}%`} 
                  />
                </div>
              </div>
            </section>

            {/* Race Incidents */}
            <section className="border border-white/10 rounded-lg overflow-hidden bg-white/5">
              <div className="bg-white/5 px-5 sm:px-8 py-3 sm:py-4 border-b border-white/10">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-[0.15em] text-white/40">
                  Race Incidents
                </h3>
              </div>
              <div className="p-5 sm:p-8">
                <div className="grid grid-cols-3 gap-4 sm:gap-8">
                  <DataPoint 
                    label="Safety Car" 
                    value={safe(incidents.safety_car_count, "0")} 
                  />
                  <DataPoint 
                    label="Red Flags" 
                    value={safe(incidents.red_flags, "0")} 
                    highlight 
                  />
                  <DataPoint 
                    label="VSC" 
                    value={safe(incidents.vsc_count, "0")} 
                  />
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN - KEY STATS */}
          <div className="space-y-4 sm:space-y-6">
            
            {/* Total Laps - Featured */}
            <div className="bg-red-600 text-white rounded-lg p-6 sm:p-8 shadow-[0_20px_60px_rgba(220,38,38,0.3)]">
              <span className="block text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-3 sm:mb-4 text-white/60">
                Total Laps
              </span>
              <span className="block text-6xl sm:text-7xl font-black tracking-tighter leading-none">
                {safe(event.total_laps, "57")}
              </span>
            </div>

            {/* Additional Stats */}
            <div className="border border-white/10 rounded-lg p-5 sm:p-8 space-y-5 sm:space-y-6 bg-white/5">
              <div className="pb-5 sm:pb-6 border-b border-white/10">
                <span className="block text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-white/40 mb-2">
                  Round
                </span>
                <span className="block text-3xl sm:text-4xl font-black text-white">
                  {meta.round}
                </span>
              </div>
              <div>
                <span className="block text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-white/40 mb-2">
                  Season
                </span>
                <span className="block text-3xl sm:text-4xl font-black text-white">
                  {meta.season}
                </span>
              </div>
            </div>

            {/* Status Badge */}
            <div className="border border-white/10 rounded-lg p-5 sm:p-8 text-center bg-white/5">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Race Complete
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 mt-12 sm:mt-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-[8px] sm:text-[9px] font-mono uppercase tracking-[0.2em] text-white/30">
            <div className="flex gap-4">
              <span>Data Verified</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Updated Live</span>
            </div>
            <span>Race Vault System</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ================= COMPONENTS ================= */

const StatCard = ({ 
  label, 
  value, 
  unit, 
  highlight, 
  small 
}: { 
  label: string; 
  value: any; 
  unit?: string; 
  highlight?: boolean; 
  small?: boolean;
}) => (
  <div className="space-y-1 sm:space-y-2">
    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-black/40">
      {label}
    </p>
    <div className="flex items-baseline gap-1">
      <p className={`font-black tracking-tight leading-none ${
        small ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl lg:text-5xl'
      } ${highlight ? 'text-red-600' : 'text-black'}`}>
        {value}
      </p>
      {unit && (
        <span className="text-xs sm:text-sm font-medium text-black/40">
          {unit}
        </span>
      )}
    </div>
  </div>
);

const DataPoint = ({ 
  label, 
  value, 
  highlight 
}: { 
  label: string; 
  value: any; 
  highlight?: boolean;
}) => (
  <div className="space-y-2">
    <p className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-white/40">
      {label}
    </p>
    <p className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-none ${
      highlight ? 'text-red-500' : 'text-white'
    }`}>
      {value}
    </p>
  </div>
);
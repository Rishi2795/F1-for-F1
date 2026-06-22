import { useState, useRef, useEffect } from "react";

/* ================= TYPES ================= */

interface Driver {
  driver_code: string;
  finish: number;
  grid: number;
  positions_gained: number;
  avg_speed?: number;
  best_lap_time?: number;
  tyres?: string[];
}

interface AIInsight { 
  rating?: number; 
  dnf_probability?: number; 
}

interface Props { 
  drivers: Driver[]; 
  // This [key: string] fix stops the "implicit any" error on the ai object
  ai?: Record<string, AIInsight>; 
}

/* ================= MAIN COMPONENT ================= */

export default function RaceComparison({ drivers = [], ai = {} }: Props) {
  const [driverA, setDriverA] = useState<string>("");
  const [driverB, setDriverB] = useState<string>("");

  if (!drivers || drivers.length === 0) return null;

  const A = drivers.find((d) => d.driver_code === driverA);
  const B = drivers.find((d) => d.driver_code === driverB);
  
  // Guard the logic: only generate verdict if both drivers exist
  const verdict = A && B ? generateVerdict(A, B) : null;

  return (
    <section className="bg-[#0a0a0a] h-[100dvh] w-full flex flex-col items-center overflow-hidden p-2 sm:p-4 font-sans antialiased text-black">
      <div className="max-w-[1400px] w-full bg-[#f4f4f4] rounded-[1.5rem] sm:rounded-[3rem] shadow-2xl flex flex-col h-full overflow-hidden border border-white/20 relative">
        
        <header className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-10 pb-2 sm:pb-6 flex-none">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-1 bg-red-600" />
              <span className="text-[10px] font-mono font-bold tracking-[0.3em] text-zinc-400 uppercase">Analysis_V4.2 // Performance</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-none">
              Differential <span className="text-red-600">Analysis</span>
            </h1>
          </div>

          <div className="flex gap-2 mt-4 sm:mt-0">
            <CustomSelect value={driverA} onChange={setDriverA} drivers={drivers} label="ALPHA" />
            <div className="flex items-center justify-center font-black italic text-zinc-300 px-1">VS</div>
            <CustomSelect value={driverB} onChange={setDriverB} drivers={drivers} label="BRAVO" />
          </div>
        </header>

        <main className="flex-1 min-h-0 px-4 sm:px-10 flex flex-col gap-4 py-2">
          {A && B ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full max-h-[65%]">
                <DriverModule driver={A} ai={ai[driverA]} side="left" />
                <DriverModule driver={B} ai={ai[driverB]} side="right" />
              </div>

              {verdict && (
                <div className="flex-none bg-black rounded-[1.2rem] sm:rounded-[2rem] p-4 sm:p-8 relative overflow-hidden shadow-2xl border-b-4 border-red-600">
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-12 text-white">
                    <div className="flex-none">
                       <p className="text-[9px] font-mono text-red-600 font-bold tracking-widest mb-1 uppercase">Verdict_Establishment</p>
                       <p className="text-xl sm:text-3xl font-black italic leading-none uppercase">{verdict.winner.driver_code} Dominant</p>
                    </div>
                    <div className="h-px sm:h-12 w-full sm:w-px bg-white/10" />
                    <div className="flex flex-1 gap-8">
                       <VerdictDetail label="Advantage" text={verdict.winReasons[0]} color="text-emerald-400" />
                       <VerdictDetail label="Deficit" text={verdict.loseReasons[0]} color="text-red-500" />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-10">
               <p className="font-mono text-xs tracking-[0.5em] font-bold">SELECT_TARGETS_FOR_SYNC</p>
            </div>
          )}
        </main>

        <footer className="flex-none flex justify-between items-center px-6 sm:px-12 py-4 sm:py-8 border-t border-zinc-200">
           <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase">Vault_Sync_Stable</span>
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
              <span className="text-[8px] font-mono font-bold uppercase tracking-widest">Live_Feed</span>
           </div>
        </footer>
      </div>
    </section>
  );
}

/* ================= SUB-COMPONENTS ================= */

function DriverModule({ driver, ai, side }: { driver: Driver; ai?: AIInsight; side: 'left' | 'right' }) {
  return (
    <div className={`relative p-5 sm:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden flex flex-col justify-between ${side === 'left' ? 'bg-white shadow-xl' : 'bg-zinc-100 border border-zinc-200'}`}>
      <div className="absolute -bottom-4 -right-4 text-[12rem] sm:text-[18rem] font-black italic text-black/5 leading-none select-none uppercase">
        {driver.driver_code}
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col">
            <span className={`text-[10px] font-mono font-bold uppercase ${side === 'left' ? 'text-red-600' : 'text-zinc-500'}`}>Pilot_Telemetry</span>
            <h3 className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase leading-none">{driver.driver_code}</h3>
          </div>
          {ai?.rating && (
            <div className="bg-black text-white p-2 px-4 rounded-xl text-center shadow-lg">
              <p className="text-[7px] font-mono font-bold uppercase opacity-50">Rating</p>
              <p className="text-xl sm:text-2xl font-black italic">{ai.rating}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-2 sm:gap-y-4 max-w-[80%]">
          <DataRow label="Finish" value={`P${driver.finish}`} />
          <DataRow label="Grid" value={`P${driver.grid}`} />
          <DataRow label="Gain/Loss" value={driver.positions_gained} highlight />
          <DataRow label="Avg V-Max" value={driver.avg_speed?.toFixed(0)} unit="KM/H" />
        </div>
      </div>
    </div>
  );
}

function DataRow({ label, value, unit, highlight }: { label: string; value: string | number | undefined; unit?: string; highlight?: boolean }) {
  const isPositive = typeof value === 'number' && value > 0;
  const isNegative = typeof value === 'number' && value < 0;

  return (
    <div className="flex flex-col border-b border-black/5 pb-1">
      <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl sm:text-2xl font-black italic ${highlight && isPositive ? 'text-emerald-500' : highlight && isNegative ? 'text-red-600' : 'text-black'}`}>
          {highlight && isPositive ? `+${value}` : value}
        </span>
        {unit && <span className="text-[8px] font-bold text-zinc-300">{unit}</span>}
      </div>
    </div>
  );
}

function VerdictDetail({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <div>
      <p className={`text-[9px] font-mono font-bold tracking-widest mb-1 uppercase ${color}`}>{label}</p>
      <p className="text-xs sm:text-sm font-bold text-zinc-400 leading-tight">{text}</p>
    </div>
  );
}

function CustomSelect({ value, onChange, drivers, label }: { value: string; onChange: (v: string) => void; drivers: Driver[]; label: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative w-32 sm:w-48" ref={ref}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 sm:h-14 px-4 rounded-xl sm:rounded-2xl font-black italic flex items-center justify-between border-2 transition-all 
        ${isOpen ? 'bg-black border-black text-white' : 'bg-white border-zinc-100 text-black'}`}
      >
        <span className="text-xs sm:text-base uppercase">{value || label}</span>
        <span className={`text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-[110%] left-0 right-0 bg-white border-2 border-black rounded-2xl overflow-hidden z-[100] shadow-2xl">
          <div className="max-h-48 overflow-y-auto p-1">
            {drivers.map(d => (
              <button 
                key={d.driver_code} 
                onClick={() => { onChange(d.driver_code); setIsOpen(false); }} 
                className={`w-full text-left px-4 py-3 text-xs font-black uppercase rounded-xl hover:bg-zinc-100 ${value === d.driver_code ? 'bg-red-600 text-white' : 'text-zinc-600'}`}
              >
                {d.driver_code}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= LOGIC ================= */

function generateVerdict(A: Driver, B: Driver) {
  const winner = A.finish < B.finish ? A : B;
  const loser = winner === A ? B : A;
  return {
    winner,
    winReasons: ["Superior track positioning and pace management."],
    loseReasons: ["Sub-optimal stint lengths or pace deficit."]
  };
}
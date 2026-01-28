import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const TRACKS = {
  MONACO: { name: "Monaco", deg: 0.4, basePace: 72.0, pitLoss: 19.0, optimalStop: 16, country: "MC" },
  SPA: { name: "Spa-Francorchamps", deg: 1.4, basePace: 104.0, pitLoss: 25.0, optimalStop: 10, country: "BE" },
  SILVERSTONE: { name: "Silverstone", deg: 1.7, basePace: 87.0, pitLoss: 23.0, optimalStop: 12, country: "GB" }
};

const TIRE_DATA = {
  SOFT: { color: "#ef4444", wear: 14, speed: 0.0, desc: "Maximum Grip / High Wear" },
  MEDIUM: { color: "#facc15", wear: 7, speed: 0.7, desc: "Balanced Performance" },
  HARD: { color: "#f8fafc", wear: 3, speed: 1.4, desc: "High Durability / Low Pace" },
};

export default function StrategySim() {
  const navigate = useNavigate();
  const [track, setTrack] = useState<keyof typeof TRACKS>("SILVERSTONE");
  const [currentLap, setCurrentLap] = useState(1);
  const [grip, setGrip] = useState(100);
  const [tire, setTire] = useState<keyof typeof TIRE_DATA>("MEDIUM");
  const [isRacing, setIsRacing] = useState(false);
  const [isInPits, setIsInPits] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [pastRuns, setPastRuns] = useState<any[]>([]);
  const [showResult, setShowResult] = useState(false);

  // AI Optimal Simulation
  const aiState = useMemo(() => {
    let total = 0; let aiGrip = 100; const log = [];
    const stopLap = TRACKS[track].optimalStop;
    for (let l = 1; l <= 25; l++) {
      const pace = TRACKS[track].basePace + TIRE_DATA.MEDIUM.speed + (100 - aiGrip) * 0.12;
      total += pace; log.push({ lap: l, pace: total });
      if (l === stopLap) { total += TRACKS[track].pitLoss; aiGrip = 100; } 
      else { aiGrip -= (TIRE_DATA.MEDIUM.wear * TRACKS[track].deg / 4); }
    }
    return { total, log };
  }, [track]);

  const playerTotalTime = useMemo(() => 
    history.reduce((acc, curr) => acc + curr.pace + (curr.isPit ? TRACKS[track].pitLoss : 0), 0)
  , [history, track]);

  const timeDelta = playerTotalTime - (aiState.log[currentLap - 2]?.pace || 0);

  useEffect(() => {
    let interval: any;
    if (isRacing && !isInPits && currentLap <= 25) {
      interval = setInterval(() => {
        const lapPace = TRACKS[track].basePace + TIRE_DATA[tire].speed + (100 - grip) * 0.12;
        setHistory(prev => [...prev, { lap: currentLap, pace: lapPace, tire, isPit: false }]);
        setGrip(prev => Math.max(0, prev - (TIRE_DATA[tire].wear * TRACKS[track].deg / 4)));
        setCurrentLap(l => l + 1);
      }, 600);
    } else if (currentLap > 25 && isRacing) {
      setIsRacing(false);
      const finalDelta = playerTotalTime - aiState.total;
      const rank = finalDelta < 1.5 ? "ELITE" : finalDelta < 6.0 ? "PRO" : "ROOKIE";
      setPastRuns(prev => [{ id: Date.now(), track, delta: finalDelta.toFixed(3), rank }, ...prev].slice(0, 5));
      setShowResult(true);
    }
    return () => clearInterval(interval);
  }, [isRacing, isInPits, currentLap, grip, tire, track, playerTotalTime, aiState.total]);

  const confirmPitStop = (newTire: keyof typeof TIRE_DATA) => {
    setHistory(prev => [...prev, { lap: currentLap, pace: 0, isPit: true, tire: newTire }]);
    setTire(newTire); setGrip(100); setIsInPits(false);
  };

  const reset = () => {
    setHistory([]); setCurrentLap(1); setGrip(100);
    setIsRacing(false); setShowResult(false); setIsInPits(false);
  };

  return (
    <div className="h-screen bg-[#050505] text-white p-6 font-sans overflow-hidden flex flex-col uppercase select-none">
      
      {/* HEADER */}
      <div className="flex justify-between items-end border-b border-white/10 pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter leading-none">PIT_WALL <span className="text-red-600">STRATEGY</span></h1>
          <p className="text-[9px] text-zinc-500 font-bold tracking-[0.4em] mt-1">REAL-TIME DATA ACQUISITION</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-[8px] font-black text-zinc-500 uppercase">System Status</p>
            <p className="text-[10px] font-bold text-green-500">ONLINE</p>
          </div>
          <button onClick={() => navigate("/")} className="bg-zinc-800 hover:bg-white hover:text-black px-4 py-2 font-black text-[10px] transition-all">TERMINATE</button>
        </div>
      </div>

      {/* UPDATED RESPONSIVE GRID CONTAINER */}
<div className="flex flex-col md:grid md:grid-cols-12 gap-6 flex-1 min-h-0 overflow-y-auto md:overflow-hidden no-scrollbar">
  
  {/* LEFT: TELEMETRY (Hidden on very small mobile if necessary, or stacked) */}
  <div className="flex flex-col gap-6 md:col-span-8 min-h-[400px] md:min-h-0">
    <div className="grid grid-cols-3 gap-2 md:gap-4">
      <div className={`p-3 md:p-4 border-l-4 transition-all duration-500 ${timeDelta < 0 ? 'bg-green-600/10 border-green-500 shadow-[inset_0_0_20px_rgba(34,197,94,0.1)]' : 'bg-zinc-900/50 border-red-600'}`}>
        <span className="text-[8px] md:text-[9px] text-zinc-500 font-black tracking-widest">LIVE_DELTA</span>
        <h2 className={`text-xl md:text-4xl font-black italic ${timeDelta < 0 ? 'text-green-500' : 'text-white'}`}>
          {currentLap > 1 ? (timeDelta > 0 ? `+${timeDelta.toFixed(3)}` : timeDelta.toFixed(3)) : "0.000"}s
        </h2>
      </div>
      <div className="bg-zinc-900/50 p-3 md:p-4 border-l-4 border-white">
        <span className="text-[8px] md:text-[9px] text-zinc-500 font-black tracking-widest">TIRE_LIFE</span>
        <h2 className="text-xl md:text-4xl font-black italic">{grip.toFixed(0)}%</h2>
      </div>
      <div className="bg-zinc-900/50 p-3 md:p-4 border-l-4 border-zinc-700">
        <span className="text-[8px] md:text-[9px] text-zinc-500 font-black tracking-widest">STINT_LAP</span>
        <h2 className="text-xl md:text-4xl font-black italic">{currentLap > 25 ? 25 : currentLap} <span className="text-xs text-zinc-600">/ 25</span></h2>
      </div>
    </div>

    <div className="flex-1 bg-zinc-900/20 border border-white/5 relative p-4 md:p-8 flex items-end gap-1 overflow-hidden min-h-[200px]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] md:bg-[size:40px_40px]" />
      {history.map((h, i) => (
        <motion.div key={i} initial={{ height: 0 }} animate={{ height: h.isPit ? '100%' : `${(h.pace / 130) * 100}%` }}
          className="flex-1 rounded-t-[1px] relative" style={{ backgroundColor: h.isPit ? '#fff' : TIRE_DATA[h.tire as keyof typeof TIRE_DATA].color }}
        />
      ))}
    </div>

    <div className="bg-zinc-900 p-2 flex flex-col sm:flex-row justify-between items-center border border-white/10 gap-2">
      <div className="flex items-center gap-4 px-2 md:px-4">
        <div className="w-8 h-8 md:w-10 md:h-10 border border-white/10 flex items-center justify-center font-black text-[10px] md:text-xs italic">{tire[0]}</div>
        <p className="font-mono font-bold text-[8px] md:text-[10px] tracking-tighter max-w-[200px] md:max-w-xs uppercase">
          &gt; ENGINEER: {grip < 40 ? "TIRES FALLING OFF. BOX." : "MATCHING PACE."}
        </p>
      </div>
      <button onClick={() => setIsInPits(true)} disabled={!isRacing || isInPits}
        className="w-full sm:w-auto bg-red-600 text-white px-6 md:px-12 py-3 md:py-4 font-black italic text-[10px] md:text-xs hover:bg-white hover:text-black transition-all disabled:opacity-20 shadow-lg shadow-red-600/10">
        BOX_NOW
      </button>
    </div>
  </div>

  {/* RIGHT: CONFIGURATION */}
  <div className="md:col-span-4 flex flex-col gap-6 pb-20 md:pb-0">
    <div className="bg-white text-black p-4 md:p-6 flex flex-col gap-6 flex-1 shadow-2xl relative">
      <div className="absolute top-0 right-0 w-12 h-12 md:w-16 md:h-16 bg-zinc-100 flex items-center justify-center font-black text-xl md:text-2xl italic">01</div>
      <h3 className="text-lg md:text-xl font-black italic border-b-4 border-black pb-2">PRE-FLIGHT</h3>
            
            <div className="space-y-6">
              {/* BETTER CIRCUIT SELECTOR */}
              <div>
                <p className="text-[10px] font-black mb-3 text-zinc-400 italic tracking-widest">LOCATION_SELECT</p>
                <div className="grid gap-2">
                  {(Object.keys(TRACKS) as Array<keyof typeof TRACKS>).map((t) => (
                    <button key={t} disabled={isRacing} onClick={() => {setTrack(t); reset();}}
                      className={`p-3 text-left border-2 transition-all flex justify-between items-center ${track === t ? 'border-black bg-black text-white' : 'border-zinc-100 text-zinc-400 hover:border-black'}`}>
                      <span className="font-black text-[11px] italic">{TRACKS[t].name}</span>
                      <span className="text-[9px] font-bold opacity-40">{TRACKS[t].country}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* STARTING TIRE SELECTOR */}
              {!isRacing && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <p className="text-[10px] font-black mb-3 text-zinc-400 italic tracking-widest">START_COMPOUND</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(TIRE_DATA) as Array<keyof typeof TIRE_DATA>).map(t => (
                      <button key={t} onClick={() => setTire(t)}
                        className={`py-3 flex flex-col items-center border-2 gap-2 transition-all ${tire === t ? 'border-black bg-zinc-50' : 'border-zinc-100 text-zinc-300'}`}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TIRE_DATA[t].color }} />
                        <span className="font-black text-[9px]">{t[0]}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <div className="pt-4 border-t border-zinc-100">
                <p className="text-[10px] font-black mb-3 text-zinc-400 italic tracking-widest">STINT_HISTORY</p>
                <div className="space-y-2">
                  {pastRuns.map(run => (
                    <div key={run.id} className="flex justify-between items-center text-[10px] font-bold bg-zinc-50 p-3 border-r-4 border-red-600">
                      <span>{run.track.substring(0, 10)}</span>
                      <span className={run.delta < 0 ? 'text-green-600' : 'text-red-600'}>{run.delta}s</span>
                      <span className="text-[8px] bg-black text-white px-2 py-0.5">{run.rank}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={() => isRacing ? setIsRacing(false) : (currentLap > 25 ? reset() : setIsRacing(true))}
              className={`w-full py-5 font-black italic text-xs tracking-[0.3em] transition-all mt-auto ${isRacing ? 'bg-zinc-200 text-black border-2 border-black' : 'bg-red-600 text-white shadow-xl hover:bg-black'}`}>
              {isRacing ? "ABORT_SESSION" : (currentLap > 25 ? "CLASSIFIED" : "ENGAGE_DRIVE")}
            </button>
          </div>
        </div>
      </div>

      {/* PIT STOP / START OVERLAY */}
      <AnimatePresence>
        {isInPits && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-white text-black p-10 max-w-sm w-full border-t-[16px] border-red-600">
              <h2 className="text-4xl font-black italic tracking-tighter mb-1">BOX_BOX</h2>
              <p className="text-[10px] font-black text-zinc-400 mb-8 italic tracking-widest">FITTED COMPOUND SELECTION</p>
              <div className="grid gap-3">
                {(Object.keys(TIRE_DATA) as Array<keyof typeof TIRE_DATA>).map(t => (
                  <button key={t} onClick={() => confirmPitStop(t)} className="p-5 flex justify-between items-center border-2 border-zinc-100 hover:border-black transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: TIRE_DATA[t].color }} />
                      <div className="text-left">
                        <p className="font-black text-xs italic leading-none">{t}</p>
                        <p className="text-[8px] font-bold text-zinc-400 mt-1">{TIRE_DATA[t].desc}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity">GO &gt;</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RESULT MODAL */}
      <AnimatePresence>
        {showResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white text-black p-12 max-w-md w-full border-b-[16px] border-red-600 shadow-2xl text-center">
              <h2 className="text-6xl font-black italic tracking-tighter mb-10">CLASSIFIED</h2>
              <div className="grid grid-cols-2 gap-1 mb-10">
                <div className="bg-zinc-100 p-6"><p className="text-[9px] font-black text-zinc-400 mb-2 uppercase tracking-widest">Delta</p><p className="text-4xl font-black italic">{(playerTotalTime - aiState.total).toFixed(3)}s</p></div>
                <div className="bg-zinc-100 p-6"><p className="text-[9px] font-black text-zinc-400 mb-2 uppercase tracking-widest">Rating</p><p className="text-4xl font-black italic text-red-600">{pastRuns[0]?.rank}</p></div>
              </div>
              <button onClick={reset} className="w-full bg-black text-white font-black py-5 tracking-[0.3em] hover:bg-red-600 transition-colors">RETURN_TO_GARAGE</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
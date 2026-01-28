import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Make sure to add these to your index.html or CSS:
// @import url('https://fonts.googleapis.com/css2?family=PT+Serif:italic,wght@400;700&display=swap');

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const SEASONS: number[] = [2025, 2024, 2023, 2022, 2021, 2020];

type RaceIndexItem = {
  round: number;
  event_name: string;
  location: string;
};

export default function Home() {
  const navigate = useNavigate();
  const [season, setSeason] = useState(2025);
  const [races, setRaces] = useState<RaceIndexItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchRaces = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/seasons/${season}/races`);
        const data = res.data?.races ?? res.data ?? [];
        setRaces(data);
      } catch (error) { setRaces([]); } finally { setLoading(false); }
    };
    fetchRaces();
  }, [season]);

  const filteredRaces = useMemo(() => {
    return races.filter(race => 
      race.event_name.toLowerCase().includes(search.toLowerCase()) ||
      race.location.toLowerCase().includes(search.toLowerCase())
    );
  }, [races, search]);

  return (
    <div className="min-h-screen bg-[#020202] text-white antialiased selection:bg-red-600/30">
      
      {/* GLOBAL HEADER */}
      <header className="w-full border-b border-white/[0.08] bg-black/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center gap-10">
          
          {/* STYLISH LOGO */}
          <div onClick={() => navigate("/")} className="cursor-pointer shrink-0">
            <h1 className="font-serif italic text-3xl tracking-tight leading-none">
              F1<span className="text-red-600 font-sans not-italic font-black text-xs tracking-[0.3em] ml-2">FOR FORMULA 1</span>
            </h1>
          </div>

          {/* STARK WHITE SEARCH BAR */}
          <div className="flex-grow max-w-lg relative group">
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search circuits..."
              className="w-full bg-white text-black rounded-full py-2.5 px-6 text-[11px] font-bold tracking-widest uppercase outline-none ring-4 ring-white/5 focus:ring-red-600/20 transition-all placeholder:text-black/40 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-black/20 tracking-tighter hidden md:block">
              {filteredRaces.length} FOUND
            </div>
          </div>
          
          {/* SEASON PICKER */}
          <button 
            onClick={() => setOpen(!open)} 
            className="hidden sm:flex items-center gap-4 px-2 py-1 border-b-2 border-white/10 hover:border-red-600 transition-all group"
          >
            <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-40 group-hover:opacity-100 transition-opacity">Season</span>
            <span className="text-sm ">{season}</span>
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-16">
        
        {/* EDITORIAL HEADING */}
        <div className="mb-14 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-[1px] w-12 bg-red-600" />
            <span className="text-[10px] font-black tracking-[0.5em] uppercase text-red-600">The Calendar</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-serif italic tracking-tighter opacity-90 leading-none">
            Race <span className="font-sans not-italic font-black text-4xl md:text-5xl tracking-tighter">LISTING</span>
          </h2>
        </div>

        {/* DATA GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-5">
          {loading ? (
            [...Array(10)].map((_, i) => <div key={i} className="h-36 bg-white/[0.02] rounded-2xl animate-pulse" />)
          ) : (
            filteredRaces.map((race) => (
              <button
                key={race.round}
                onClick={() => navigate(`/race/${season}/${race.round}`)}
                className="group relative flex flex-col bg-[#0A0A0A] border border-white/[0.05] rounded-2xl p-6 text-left transition-all duration-500 hover:bg-white hover:text-black active:scale-[0.96] shadow-xl"
              >
                <span className="text-[10px] font-mono font-bold opacity-30 group-hover:text-red-600 group-hover:opacity-100 transition-all mb-8">
                  R_{race.round.toString().padStart(2, '0')}
                </span>

                <div className="mt-auto">
                  <h3 className="text-xs font-black uppercase tracking-tight leading-[1.1] mb-1 group-hover:translate-x-1 transition-transform">
                    {race.event_name.replace("Grand Prix", "").trim()}
                  </h3>
                  <p className="text-[9px] font-medium opacity-30 uppercase tracking-[0.2em] truncate group-hover:opacity-60 transition-opacity">
                    {race.location.split(',')[0]}
                  </p>
                </div>

                {/* INVERTED ICON ON HOVER */}
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs">→</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* DROPDOWN MENU FOR SEASON (Absolute positioned) */}
        {open && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm animate-in fade-in">
            <div className="max-w-xs w-full grid grid-cols-2 gap-2">
              {SEASONS.map(y => (
                <button key={y} onClick={() => {setSeason(y); setOpen(false); setSearch("");}} className={`px-6 py-4 rounded-xl text-xs font-black tracking-widest transition-all ${season === y ? 'bg-red-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
                  {y}
                </button>
              ))}
              <button onClick={() => setOpen(false)} className="col-span-2 mt-4 text-[10px] font-bold uppercase tracking-widest opacity-40">Close</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
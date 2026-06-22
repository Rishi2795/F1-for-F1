import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";


/* ================= TYPES ================= */

type DriverStats = {
  code: string;

  // Meta
  name?: string;
  team?: string;
  country?: string;
  image?: string;

  // Stats
  races: number;
  best_finish: number;
  avg_finish: number;
  avg_grid: number;
  positions_gained: number;
  consistency: number;
  avg_risk: number;
  avg_degradation: number;
  recent_form: number;
};


type DriverDNA = {
  pace: number;
  racecraft: number;
  tyres: number;
  consistency: number;
  wet: number;
  risk_management: number;
};

type AIInsight = {
  rating: number;
  tier: string;
  strength: string;
  weakness: string;
  trend: string;
  risk: string;
  summary: string;
};


/* ================= MAIN ================= */

export default function DriverProfile() {

  const { code } = useParams();

  const [stats, setStats] = useState<DriverStats | null>(null);
  const [dna, setDNA] = useState<DriverDNA | null>(null);
  const [ai, setAI] = useState<AIInsight | null>(null);

  const [loading, setLoading] = useState(true);


  /* ================= LOAD ================= */

  useEffect(() => {
  if (!code) return;

  setLoading(true);

  async function load() {
    try {
      const s = await axios.get(`${API_URL}/drivers/${code}`);
      setStats(s.data);
    } catch (e) {
      console.error("Stats failed", e);
    }

    try {
      const d = await axios.get(`${API_URL}/drivers/${code}/dna`);
      setDNA(d.data);
    } catch (e) {
      console.error("DNA failed", e);
    }

    try {
      const a = await axios.get(`${API_URL}/ai/driver/${code}`);
      setAI(a.data);
    } catch (e) {
      console.error("AI failed", e);
    }

    setLoading(false);
  }

  load();

}, [code]);



  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="font-mono text-zinc-500 text-xs animate-pulse">
          LOADING_DRIVER_DOSSIER
        </span>
      </div>
    );
  }


  if (!stats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Driver Not Found
      </div>
    );
  }


  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 px-4 md:px-8 py-14">


      {/* TOP */}
      <div className="max-w-7xl mx-auto mb-10 flex justify-between">

        <Link
          to="/drivers"
          className="text-xs font-mono text-zinc-500 hover:text-white"
        >
          ← BACK
        </Link>

        <span className="text-xs font-mono text-red-600">
          DRIVER_DOSSIER
        </span>

      </div>


      {/* ================= GRID ================= */}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">


        {/* ================= LEFT ================= */}
        <div className="lg:col-span-4">

          <div className="
            bg-[#080808]
            border border-white/10
            rounded-xl
            overflow-hidden
          ">


                {/* IMAGE */}
                {/* IMAGE */}
    <div className="relative h-[420px] overflow-hidden bg-black/40">

    <img
        src={stats.image || "/placeholder.png"}
        alt={stats.name || stats.code}
        className="
        w-full h-full object-cover
        transition-transform duration-500
        hover:scale-105
        "
        onError={(e) => {
        e.currentTarget.src = "/placeholder.png";
        }}
    />

    {/* Gradient Overlay */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

    </div>


            {/* META */}
            <div className="p-6 space-y-4">


              <h1 className="text-4xl font-black italic text-white">
                {stats.code}
              </h1>


              {/* RATING */}
              {ai && (
                <div className="flex items-center gap-3">

                  <span className="text-4xl font-black text-red-600">
                    {ai.rating}
                  </span>

                  <span className="text-xs font-mono uppercase text-zinc-500">
                    {ai.tier}
                  </span>

                </div>
              )}


              {/* TAGS */}
              {ai && (
                <div className="flex flex-wrap gap-2 text-[10px]">

                  <Tag text={ai.strength} />

                  <Tag text={ai.trend} />

                  <Tag text={`${ai.risk} Risk`} />

                </div>
              )}

            </div>

          </div>

        </div>



        {/* ================= RIGHT ================= */}
        <div className="lg:col-span-8 space-y-8">


          {/* QUICK STATS */}
          <Panel>

            <Grid4>

              <Mini label="Races" value={stats.races} />

              <Mini label="Best" value={`P${stats.best_finish}`} />

              <Mini label="Avg Finish" value={stats.avg_finish} />

              <Mini label="Avg Grid" value={stats.avg_grid} />

              <Mini
                label="Gain"
                value={stats.positions_gained}
                signed
              />

              <Mini
                label="Consistency"
                value={`${stats.consistency}%`}
              />

              <Mini
                label="Tyre Deg"
                value={`${stats.avg_degradation}%`}
              />

              <Mini
                label="Recent"
                value={stats.recent_form}
              />

            </Grid4>

          </Panel>


          {/* DNA */}
          {dna && (
            <Panel title="PERFORMANCE_DNA">

              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">

                <Bar label="Pace" value={dna.pace} />

                <Bar label="Racecraft" value={dna.racecraft} />

                <Bar label="Tyres" value={dna.tyres} />

                <Bar label="Consistency" value={dna.consistency} />

                <Bar label="Wet" value={dna.wet} />

                <Bar label="Risk Ctrl" value={dna.risk_management} />

              </div>

            </Panel>
          )}


          {/* AI */}
          {ai && (
            <Panel title="AI_INTELLIGENCE">

              <p className="
                italic
                text-lg
                text-zinc-300
                leading-relaxed
              ">
                "{ai.summary}"
              </p>

            </Panel>
          )}

        </div>

      </div>

    </div>
  );
}



/* ================= UI ================= */


function Panel({
  children,
  title
}: any) {

  return (
    <div className="
      bg-[#080808]
      border border-white/10
      rounded-xl
      p-6
    ">

      {title && (
        <h3 className="
          text-xs
          font-mono
          text-red-600
          mb-5
        ">
          {title}
        </h3>
      )}

      {children}

    </div>
  );
}


function Grid4({ children }: any) {
  return (
    <div className="
      grid grid-cols-2 md:grid-cols-4 gap-4
    ">
      {children}
    </div>
  );
}


function Mini({ label, value, signed = false }: any) {

  const num = typeof value === "number" ? value : null;

  const color =
    signed && num !== null
      ? num >= 0
        ? "text-green-500"
        : "text-red-500"
      : "text-white";

  return (
    <div className="bg-white/5 border border-white/10 p-4 rounded">

      <p className="text-[10px] uppercase text-zinc-500 mb-1">
        {label}
      </p>

      <p className={`text-xl font-black italic ${color}`}>
        {value}
      </p>

    </div>
  );
}


function Bar({ label, value }: any) {

  const v = Math.max(0, Math.min(100, value));

  const color =
    v > 80
      ? "bg-green-500"
      : v > 65
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="space-y-1">

      <div className="
        flex justify-between
        text-[10px]
        font-mono
        text-zinc-400
      ">

        <span>{label}</span>

        <span>{v}</span>

      </div>

      <div className="h-2 bg-white/10 rounded">

        <div
          className={`${color} h-full rounded transition-all`}
          style={{ width: `${v}%` }}
        />

      </div>

    </div>
  );
}


function Tag({ text }: { text: string }) {
  return (
    <span className="
      px-2 py-1
      bg-red-600/10
      border border-red-600/30
      rounded
      text-red-500
      uppercase
      font-mono
    ">
      {text}
    </span>
  );
}

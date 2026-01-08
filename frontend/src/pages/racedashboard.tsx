import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

/* ================= TEAM COLORS ================= */

const TEAM_COLORS: Record<string, string> = {
  "Red Bull Racing": "#1e40af",
  Ferrari: "#b91c1c",
  Mercedes: "#06b6d4",
  McLaren: "#f97316",
  "Aston Martin": "#15803d",
  Alpine: "#db2777",
  Williams: "#38bdf8",
  RB: "#6366f1",
  "Haas F1 Team": "#9ca3af",
  Sauber: "#22c55e",
};

/* ================= TRACK HISTORY ================= */

const TRACK_HISTORY: Record<string, string> = {
  "Bahrain Grand Prix":
    "Bahrain rewards tyre management and disciplined execution. Rear degradation exposes weak setups.",
  "Miami Grand Prix":
    "Miami mixes street sections with long straights — timing and track position are critical.",
  "Monaco Grand Prix":
    "Overtaking is nearly impossible. Strategy revolves entirely around track control.",
};

/* ================= TYPES ================= */

type Driver = {
  driver_code: string;
  team: string;
  grid: number;
  finish: number;
  positions_gained: number;
  stops: number;
  tyre_sequence: string[];
  longest_stint: number;

  strategy_risk: { risk_score: number; risk_label: string };
  strategy_simulation: { verdict: string };
  tyre_degradation_index: number;
  pit_efficiency: string;
  consistency_index: number | null;
};

type RaceData = {
  season: number;
  round: number;
  event_name: string;
  location: string;
  drivers: Driver[];
  derived: {
    winning_recipe: {
      typical_stops: number;
      common_tyre_sequence: string;
      avg_longest_stint: number;
    };
    style_profile: string[];
  };
};

/* ================= DRIVER STYLE TAGS ================= */

function getDriverStyles(d: Driver): string[] {
  const tags: string[] = [];

  if (d.positions_gained >= 5) tags.push("Aggressive");
  if (d.longest_stint >= 25) tags.push("Tyre Saver");
  if (d.positions_gained <= 0 && d.stops <= 1) tags.push("Defensive");
  if (d.consistency_index !== null && d.consistency_index >= 80)
    tags.push("Consistent");
  if (d.strategy_risk.risk_score >= 70) tags.push("High Risk");

  return tags.length ? tags : ["Balanced"];
}

/* ================= PAGE ================= */

export default function RaceDashboard() {
  const { year = "2023", round } = useParams();
  const [race, setRace] = useState<RaceData | null>(null);

  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [driverA, setDriverA] = useState("");
  const [driverB, setDriverB] = useState("");

  useEffect(() => {
    axios
      .get(`${API_URL}/seasons/${year}/races/${round}`)
      .then((res) => setRace(res.data))
      .catch(console.error);
  }, [year, round]);

  if (!race) {
    return (
      <div className="min-h-screen bg-black text-slate-400 p-6">
        Loading race analysis…
      </div>
    );
  }

  const driverMap = Object.fromEntries(
    race.drivers.map((d) => [d.driver_code, d])
  );

  const A = driverA ? driverMap[driverA] : null;
  const B = driverB ? driverMap[driverB] : null;

  /* ================= TEAM STATS ================= */

  const teamStats = Object.values(
    race.drivers.reduce((acc: any, d) => {
      acc[d.team] ??= {
        team: d.team,
        count: 0,
        finish: 0,
        gained: 0,
      };
      acc[d.team].count++;
      acc[d.team].finish += d.finish;
      acc[d.team].gained += d.positions_gained;
      return acc;
    }, {})
  );

  return (
    <div className="min-h-screen bg-black text-slate-100 p-5 md:p-8 space-y-10">

      {/* ================= HEADER ================= */}
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-500">
          F1 Strategy Analysis
        </p>
        <h1 className="text-3xl md:text-4xl font-bold">
          {race.event_name}
        </h1>
        <p className="text-sm text-slate-400">
          {race.location} · {race.season}
        </p>
        <Link to="/" className="text-xs text-red-400 hover:underline">
          ← Back to Circuits
        </Link>
      </div>

      {/* ================= TRACK INTELLIGENCE ================= */}
      <Card title="Track Intelligence">
        <div className="flex flex-wrap gap-2">
          {race.derived.style_profile.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      </Card>

      {/* ================= TRACK HISTORY ================= */}
      <Card title="Track History">
        <p className="text-sm text-slate-300 leading-relaxed">
          {TRACK_HISTORY[race.event_name] ??
            "This circuit rewards execution and strategic discipline over raw pace."}
        </p>
      </Card>

      {/* ================= WINNING RECIPE ================= */}
      <Card title="Winning Recipe">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Metric label="Typical Stops" value={race.derived.winning_recipe.typical_stops} />
          <Metric label="Tyre Pattern" value={race.derived.winning_recipe.common_tyre_sequence} />
          <Metric
            label="Avg Longest Stint"
            value={`${race.derived.winning_recipe.avg_longest_stint} laps`}
          />
        </div>
      </Card>

      {/* ================= TEAM PERFORMANCE ================= */}
      <Card title="Team Performance">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {teamStats.map((t: any) => (
            <div
              key={t.team}
              className="p-4 rounded-lg border border-slate-800 hover:scale-[1.03] transition"
              style={{
                borderLeft: `4px solid ${
                  TEAM_COLORS[t.team] || "#64748b"
                }`,
              }}
            >
              <p className="font-semibold">{t.team}</p>
              <p className="text-xs text-slate-400">
                Avg Finish: {(t.finish / t.count).toFixed(1)}
              </p>
              <p className="text-xs text-slate-400">
                Net Δ: {t.gained}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* ================= DRIVER TABLE ================= */}
      <Card title="Driver Performance">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-y-2 min-w-[640px]">
            <thead className="text-slate-500">
              <tr>
                <th className="text-left">Driver</th>
                <th>Grid</th>
                <th>Finish</th>
                <th>Δ</th>
                <th>Stops</th>
                <th>Risk</th>
              </tr>
            </thead>

            <tbody>
              {race.drivers.map((d) => {
                const styles = getDriverStyles(d);

                return (
                  <>
                    <tr
                      key={d.driver_code}
                      onClick={() =>
                        setExpandedDriver(
                          expandedDriver === d.driver_code
                            ? null
                            : d.driver_code
                        )
                      }
                      className="cursor-pointer border border-slate-800 hover:bg-slate-900/40 transition"
                    >
                      <td
                        className="px-3 py-2 font-bold text-black"
                        style={{
                          backgroundColor:
                            TEAM_COLORS[d.team] || "#64748b",
                        }}
                      >
                        {d.driver_code}
                      </td>
                      <td className="text-center">{d.grid}</td>
                      <td className="text-center">{d.finish}</td>
                      <td
                        className={`text-center font-medium ${
                          d.positions_gained > 0
                            ? "text-green-400"
                            : d.positions_gained < 0
                            ? "text-red-400"
                            : "text-slate-400"
                        }`}
                      >
                        {d.positions_gained}
                      </td>
                      <td className="text-center">{d.stops}</td>
                      <td className="text-center">
                        {d.strategy_risk.risk_label}
                      </td>
                    </tr>

                    {expandedDriver === d.driver_code && (
                      <tr>
                        <td colSpan={6} className="px-4 pb-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                            <Info label="Driver Style">
                              <div className="flex flex-wrap gap-2">
                                {styles.map((s) => (
                                  <Badge key={s}>{s}</Badge>
                                ))}
                              </div>
                            </Info>
                            <Metric label="Tyre Deg Index" value={d.tyre_degradation_index} />
                            <Metric label="Pit Efficiency" value={d.pit_efficiency} />
                            <Metric label="Consistency" value={d.consistency_index ?? "—"} />
                            <Metric label="Verdict" value={d.strategy_simulation.verdict} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ================= DRIVER COMPARISON ================= */}
<Card title="Driver Comparison">
  {/* Driver selectors */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
    <Select
      label="Driver A"
      value={driverA}
      onChange={setDriverA}
      drivers={race.drivers}
    />
    <Select
      label="Driver B"
      value={driverB}
      onChange={setDriverB}
      drivers={race.drivers}
    />
  </div>

  {/* Comparison */}
  {A && B && (
    <div className="space-y-4">
      {/* Header (desktop only) */}
      <div className="hidden sm:grid grid-cols-3 text-xs text-slate-500 uppercase tracking-widest pb-2 border-b border-white/10">
        <div>Metric</div>
        <div className="text-center">Driver A</div>
        <div className="text-center">Driver B</div>
      </div>

      {/* Rows */}
      <div className="space-y-3">
        <CompareRow label="Finish" a={A.finish} b={B.finish} />
        <CompareRow label="Δ Positions" a={A.positions_gained} b={B.positions_gained} />
        <CompareRow label="Risk Score" a={A.strategy_risk.risk_score} b={B.strategy_risk.risk_score} />
        <CompareRow label="Tyre Degradation" a={A.tyre_degradation_index} b={B.tyre_degradation_index} />
        <CompareRow label="Strategic Verdict" a={A.strategy_simulation.verdict} b={B.strategy_simulation.verdict} />
      </div>
    </div>
  )}
</Card>

    </div>
  );
}

/* ================= UI HELPERS ================= */

function Card({ title, children }: any) {
  return (
    <div className="border border-slate-800 rounded-xl p-5 bg-black">
      <h2 className="text-sm font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Badge({ children }: any) {
  return (
    <span className="px-3 py-1 text-xs rounded-full border border-slate-700">
      {children}
    </span>
  );
}

function Metric({ label, value }: any) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function Info({ label, children }: any) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div>{children}</div>
    </div>
  );
}

function Select({ label, value, onChange, drivers }: any) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black border border-slate-700 rounded-lg px-3 py-2 text-sm"
      >
        <option value="">Select</option>
        {drivers.map((d: any) => (
          <option key={d.driver_code} value={d.driver_code}>
            {d.driver_code} · {d.team}
          </option>
        ))}
      </select>
    </div>
  );
}

function CompareRow({
  label,
  a,
  b,
}: {
  label: string;
  a: any;
  b: any;
}) {
  return (
    <div
      className="
        grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4
        rounded-xl border border-white/10 bg-[#020202]
        px-4 py-3
      "
    >
      {/* Label */}
      <div className="text-xs uppercase tracking-widest text-slate-500">
        {label}
      </div>

      {/* Driver A */}
      <div className="text-sm text-slate-200 sm:text-center font-medium">
        {a}
      </div>

      {/* Driver B */}
      <div className="text-sm text-slate-200 sm:text-center font-medium">
        {b}
      </div>
    </div>
  );
}


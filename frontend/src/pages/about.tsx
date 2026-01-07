import { useNavigate } from "react-router-dom";

export default function About() {
  const navigate = useNavigate();

  /* ================= RULES ================= */
  const rules = [
    {
      title: "Mandatory Tyre Compounds",
      short: "Two dry compounds per race",
      detail:
        "In dry races, drivers must use at least two different tyre compounds. This rule forces strategic variation and prevents dominant single-strategy races."
    },
    {
      title: "DRS Activation",
      short: "Within one-second window",
      detail:
        "DRS can only be activated in designated zones when a car is within one second at the detection point, balancing overtaking without artificial performance boosts."
    },
    {
      title: "Parc Fermé",
      short: "Setup locked after qualifying",
      detail:
        "Once qualifying begins, teams are restricted from changing major setup parameters, making simulation accuracy and pre-event decisions critical."
    },
    {
      title: "Power Unit Allocation",
      short: "Limited components per season",
      detail:
        "Drivers are allocated a fixed number of engines, turbochargers, batteries, and electronics. Exceeding limits results in grid penalties."
    },
    {
      title: "Track Limits",
      short: "Repeated violations penalised",
      detail:
        "Drivers must remain within defined track boundaries. Repeated violations lead to lap deletions or time penalties."
    },
    {
      title: "Fuel Flow Limit",
      short: "Maximum fuel flow enforced",
      detail:
        "Fuel flow is electronically capped to prioritise efficiency and energy management over raw power."
    },
    {
      title: "Minimum Weight",
      short: "Car + driver weight floor",
      detail:
        "Cars must meet a minimum weight including the driver, preventing extreme lightweight designs and ensuring safety parity."
    },
    {
      title: "Unsafe Release",
      short: "Pit lane safety enforced",
      detail:
        "Releasing a car unsafely into the path of another competitor results in time penalties or stop-go penalties."
    },
    {
      title: "Virtual Safety Car",
      short: "Delta time enforcement",
      detail:
        "During VSC periods, drivers must stay above a prescribed delta time to prevent gaining unfair advantages."
    },
  ];

  /* ================= CHAMPIONS ================= */
  const champions = [
    { year: 2015, driver: "Lewis Hamilton", team: "Mercedes", bg: "bg-teal-500/20 text-teal-300" },
    { year: 2016, driver: "Nico Rosberg", team: "Mercedes", bg: "bg-teal-500/20 text-teal-300" },
    { year: 2017, driver: "Lewis Hamilton", team: "Mercedes", bg: "bg-teal-500/20 text-teal-300" },
    { year: 2018, driver: "Lewis Hamilton", team: "Mercedes", bg: "bg-teal-500/20 text-teal-300" },
    { year: 2019, driver: "Lewis Hamilton", team: "Mercedes", bg: "bg-teal-500/20 text-teal-300" },
    { year: 2020, driver: "Lewis Hamilton", team: "Mercedes", bg: "bg-teal-500/20 text-teal-300" },
    { year: 2021, driver: "Max Verstappen", team: "Red Bull", bg: "bg-blue-500/20 text-blue-300" },
    { year: 2022, driver: "Max Verstappen", team: "Red Bull", bg: "bg-blue-500/20 text-blue-300" },
    { year: 2023, driver: "Max Verstappen", team: "Red Bull", bg: "bg-blue-500/20 text-blue-300" },
    { year: 2024, driver: "Max Verstappen", team: "Red Bull", bg: "bg-blue-500/20 text-blue-300" },
  ];

  /* ================= DRIVERS ================= */
  const drivers = [
    {
      name: "Michael Schumacher",
      era: "2000–2004",
      titles: "7× World Champion",
      img: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Michael_Schumacher_2004.jpg",
      impact:
        "Redefined professionalism in Formula 1. Ferrari’s dominance was built on relentless testing, operational discipline, and race execution."
    },
    {
      name: "Sebastian Vettel",
      era: "2010–2013",
      titles: "4× World Champion",
      img: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Sebastian_Vettel_2015_Malaysia.jpg",
      impact:
        "Mastered peak-downforce aerodynamic cars. His success highlighted the importance of regulation exploitation and car-driver harmony."
    },
    {
      name: "Lewis Hamilton",
      era: "2014–2020",
      titles: "7× World Champion",
      img: "https://upload.wikimedia.org/wikipedia/commons/4/44/Lewis_Hamilton_2016_Malaysia.jpg",
      impact:
        "The reference driver of the hybrid era — adaptable, intelligent, and consistently elite across regulation refinements."
    },
    {
      name: "Max Verstappen",
      era: "2021–Present",
      titles: "4× World Champion",
      img: "https://upload.wikimedia.org/wikipedia/commons/7/75/Max_Verstappen_2022.jpg",
      impact:
        "Combines aggressive precision with strategic maturity, defining the ground-effect era through tyre control and consistency."
    },
  ];

  return (
    <div className="min-h-screen bg-black text-slate-100 overflow-x-hidden">

        {/* ================= HERO ================= */}
      <section className="relative px-6 pt-32 pb-32 text-center">
        <img
          src="https://images.unsplash.com/photo-1526726538690-5cbf956ae2fd"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          alt=""
        />

        <div className="relative max-w-6xl mx-auto">
          {/* F1⁴ Logo */}
          <div className="mb-6 text-slate-400 text-sm tracking-widest">
            F1<sup className="text-red-600 font-semibold">4</sup> · help for Formula 1
          </div>

          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight">
            F1 <span className="italic text-red-600">for</span> F1
          </h1>

          <p className="mt-8 text-xl md:text-2xl text-slate-300 max-w-4xl mx-auto">
            Understanding Formula 1 using
            <span className="text-white font-semibold"> Formula 1 thinking</span>.
          </p>

          <p className="mt-6 text-slate-400 leading-relaxed max-w-5xl mx-auto">
            This platform decodes races the way teams do — tyre degradation,
            pit window optimisation, regulation trade-offs, and execution under constraints.
            No simplification. No noise. Just Formula 1, explained on its own terms.
          </p>

          <div className="mt-14 flex flex-col sm:flex-row justify-center gap-5">
            <button
              onClick={() => navigate("/explore")}
              className="px-9 py-3 rounded-xl bg-red-600 hover:bg-red-500 transition font-semibold"
            >
              Explore Circuits
            </button>
            <button
              onClick={() => navigate("/race/2023/1")}
              className="px-9 py-3 rounded-xl border border-slate-700 hover:border-slate-500"
            >
              Open Race Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* ================= HISTORY ================= */}
      <section className="px-6 pt-10 pb-32 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-10">The Evolution of Formula 1</h2>
        <div className="space-y-8 text-slate-400 leading-relaxed max-w-5xl">
          <p>
            Formula 1 began in 1950 as the ultimate test of mechanical endurance and driver courage.
            Early success depended on reliability and raw engineering rather than aerodynamic refinement.
          </p>
          <p>
            As aerodynamics, materials science, and computational tools advanced, Formula 1 transformed
            into a discipline of marginal gains, where hundredths of a second defined competitiveness.
          </p>
          <p>
            The hybrid era shifted the sport toward energy efficiency, system integration, and reliability,
            turning teams into data-driven organisations focused on long-term optimisation.
          </p>
          <p>
            The ground-effect regulations reintroduced closer racing, increasing the importance of tyre
            management, traffic handling, and strategic execution.
          </p>
        </div>
      </section>
      {/* ================= NEW TO F1 ================= */}
<section className="px-6 pb-32 max-w-6xl mx-auto">
  <h2 className="text-3xl font-bold mb-10">New to Formula 1?</h2>

  <div className="space-y-8 text-slate-400 leading-relaxed max-w-5xl">
    <p>
      Formula 1 is the highest level of single-seater motorsport, officially
      established in 1950. It is a global championship where teams design,
      build, and race the fastest circuit cars in the world under a strict
      technical and sporting rulebook. What sets Formula 1 apart is that
      performance is not defined by the driver alone—engineering, aerodynamics,
      and data-driven decision-making are equally decisive.
    </p>

    <p>
      Each season features <span className="text-slate-200 font-medium">10 teams</span>,
      with <span className="text-slate-200 font-medium">2 cars per team</span>,
      forming a grid of 20 drivers. Race weekends are structured around practice
      sessions, qualifying to determine the starting order, and the race itself,
      typically covering around 305 kilometres. Points are awarded based on
      finishing position, contributing to both the Drivers’ Championship and the
      Constructors’ Championship. Tyre choices, pit stop timing, and adapting to
      on-track events often decide races more than raw speed.
    </p>

    <p>
      Formula 1 is funded through a combination of manufacturer investment,
      sponsorships, prize money, and global media rights. Modern cost-cap rules
      limit how much teams can spend, improving competitiveness while keeping
      development sustainable. Beyond racing, Formula 1 functions as a
      high-performance engineering laboratory—advances in hybrid power units,
      materials, and data analysis frequently influence road-car technology and
      wider engineering disciplines.
    </p>
  </div>
</section>


      {/* ================= TIMELINE ================= */}
      <section className="px-6 pb-32 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold mb-12">Regulation Timeline</h2>

        <div className="relative border-l border-slate-800 pl-8 space-y-12">
          {[
            ["1950", "Origins of Formula 1"],
            ["1980s", "Turbo power explosion"],
            ["2014", "Hybrid efficiency era"],
            ["2022", "Ground-effect return"],
            ["2026", "Active aero & electric focus"],
          ].map(([year, label]) => (
            <div key={year} className="grid grid-cols-[24px_1fr] gap-6 items-start">
              <span className="mt-1 w-4 h-4 rounded-full bg-red-600 border-4 border-black" />
              <div>
                <h3 className="font-semibold">{year}</h3>
                <p className="text-slate-400 text-sm mt-2">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= RULES ================= */}
      <section className="px-6 pb-32 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-12">Core Rules of Formula 1</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rules.map((r) => (
            <div
              key={r.title}
              className="group border border-slate-800 rounded-xl p-6
                         hover:border-red-600 hover:shadow-[0_0_30px_rgba(255,0,0,0.15)]
                         transition-all duration-300"
            >
              <h3 className="font-semibold">{r.title}</h3>
              <p className="text-slate-400 mt-2">{r.short}</p>
              <p className="mt-4 text-sm text-slate-500 opacity-0 group-hover:opacity-100 transition">
                {r.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= CHAMPIONS ================= */}
      <section className="px-6 pb-32 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-10">World Champions (Last 10 Years)</h2>
        <div className="overflow-x-auto">
          <table className="w-full border border-slate-800 rounded-xl text-sm">
            <thead className="bg-neutral-900 text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Season</th>
                <th className="px-4 py-3 text-left">Champion</th>
                <th className="px-4 py-3 text-left">Team</th>
              </tr>
            </thead>
            <tbody>
              {champions.map((c) => (
                <tr key={c.year} className="border-t border-slate-800">
                  <td className="px-4 py-3">{c.year}</td>
                  <td className={`px-4 py-3 font-semibold ${c.bg}`}>
                    {c.driver}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{c.team}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================= DRIVERS ================= */}
      <section className="px-6 pb-32 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-12">Legendary Drivers & Their Impact</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {drivers.map((d) => (
            <div key={d.name} className="border border-slate-800 rounded-xl overflow-hidden">
              <img src={d.img} alt={d.name} className="h-56 w-full object-cover" />
              <div className="p-5">
                <h3 className="font-semibold">{d.name}</h3>
                <p className="text-xs text-slate-400">{d.titles} · {d.era}</p>
                <p className="text-sm text-slate-400 mt-3">{d.impact}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        Educational & analytical project · Built with historical Formula 1 race data · Not affiliated with Formula 1
      </footer>
    </div>
  ); */}

  {/* ================= FOOTER ================= */}
        <footer className="border-t border-slate-800 py-10 text-center text-xs text-slate-500">
          <div className="mb-2">
            F1<sup className="text-red-600 font-semibold">4</sup> · F1 for F1
          </div>
          <div>
            Strategy-first · Data-driven · Regulation-aware
          </div>
          <div className="mt-2">
            Educational & analytical project · Built with historical Formula 1 race data · Not affiliated with Formula 1
          </div>
        </footer>
      </div>
    );
  }

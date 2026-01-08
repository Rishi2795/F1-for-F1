import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";


export default function About() {
  const navigate = useNavigate();

  const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

  /* ================= RULES ================= */
  const rules = [
  {
    title: "Mandatory Tyre Compounds",
    short: "Two dry compounds per race",
    detail:
      "In dry races, drivers must use at least two different tyre compounds during the race. This regulation prevents single-compound dominance and forces teams to consider degradation curves, pit window timing, and undercut/overcut strategies when planning race execution.",
    category: "SPORTING",
  },
  {
    title: "DRS Activation",
    short: "Within one-second window",
    detail:
      "The Drag Reduction System (DRS) may only be activated in designated zones when a car is within one second of the car ahead at the detection point. This balances overtaking assistance while preserving driver skill, racecraft, and strategic positioning.",
    category: "SPORTING",
  },
  {
    title: "Parc Fermé",
    short: "Setup locked after qualifying",
    detail:
      "Once qualifying begins, cars enter parc fermé conditions, restricting teams from altering major setup parameters such as suspension geometry and aerodynamic configuration. This places heavy emphasis on simulation accuracy, pre-event preparation, and compromise-based setup decisions.",
    category: "TECHNICAL",
  },
  {
    title: "Power Unit Allocation",
    short: "Limited components per season",
    detail:
      "Each driver is allocated a fixed number of power unit components, including internal combustion engines, turbochargers, energy stores, and control electronics. Exceeding these limits results in grid penalties, directly linking reliability engineering with championship outcomes.",
    category: "POWER UNIT",
  },
  {
    title: "Track Limits",
    short: "Repeated violations penalised",
    detail:
      "Drivers must keep the car within defined track boundaries, typically marked by white lines. Repeated violations can lead to lap deletions, time penalties, or warnings, reinforcing precision driving and consistent car placement under pressure.",
    category: "SPORTING",
  },
  {
    title: "Fuel Flow Limit",
    short: "Maximum fuel flow enforced",
    detail:
      "Fuel flow is electronically restricted to limit instantaneous fuel consumption, prioritising efficiency over raw power output. This rule shapes engine design philosophy, combustion efficiency, and energy deployment strategies throughout a race.",
    category: "POWER UNIT",
  },
  {
    title: "Minimum Weight",
    short: "Car + driver weight floor",
    detail:
      "Cars must meet a minimum combined weight requirement including the driver. This regulation prevents extreme lightweight designs, promotes safety parity, and shifts performance gains toward balance optimisation and mass distribution rather than weight reduction alone.",
    category: "TECHNICAL",
  },
  {
    title: "Unsafe Release",
    short: "Pit lane safety enforced",
    detail:
      "Teams must not release a car from the pit box in a manner that endangers other drivers or pit crew. Unsafe releases typically result in time penalties or stop-go penalties, making pit stop execution a critical operational discipline.",
    category: "SAFETY",
  },
  {
    title: "Virtual Safety Car",
    short: "Delta time enforcement",
    detail:
      "During Virtual Safety Car (VSC) periods, drivers must adhere to a prescribed lap time delta, preventing unfair gains while maintaining reduced speed. This rule tests driver discipline and real-time delta management under neutralised race conditions.",
    category: "SAFETY",
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
    { year: 2025, driver: "Lando Norris", team: "Mclaren", bg: "bg-orange-500/20 text-orange-300" },
  ];

  /* ================= DRIVERS ================= */
  const drivers = [
    {
      name: "Michael Schumacher",
      era: "2000–2004",
      titles: "7× World Champion",
      img: "drivers/schumacher.jpeg",
      impact:
        "Redefined professionalism in Formula 1. Ferrari’s dominance was built on relentless testing, operational discipline, and race execution."
    },
    {
      name: "Sebastian Vettel",
      era: "2010–2013",
      titles: "4× World Champion",
      img: "drivers/vettel.jpg",
      impact:
        "Mastered peak-downforce aerodynamic cars. His success highlighted the importance of regulation exploitation and car-driver harmony."
    },
    {
      name: "Lewis Hamilton",
      era: "2014–2020",
      titles: "7× World Champion",
      img: "drivers/hamilton.jpeg",
      impact:
        "The reference driver of the hybrid era ,he was adaptable, intelligent, and consistently elite across regulation refinements."
    },
    {
      name: "Max Verstappen",
      era: "2021–Present",
      titles: "4× World Champion",
      img: "drivers/verstappen.jpeg",
      impact:
        "Combines aggressive precision with strategic maturity, defining the ground-effect era through tyre control and consistency."
    },
  ];

  return (
    <div className="min-h-screen bg-black text-slate-100 overflow-x-hidden">

        {/* ================= HERO ================= */}
      <section className="relative px-6 pt-32 pb-32 text-center">
        <img
          src="https://images.twinkl.co.uk/tw1n/image/private/t_630/u/ux/jeff-cooper-tumxquem5pe-unsplash_ver_1.png"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          alt=""
        />

        <div className="relative max-w-6xl mx-auto">
          {/* F1⁴ Logo */}
          <div className="mb-6 text-slate-400 text-sm tracking-widest">
            F1<sup className="text-red-600 font-semibold">4</sup> · help for Formula 1
          </div>

          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight">
            F1 for <span className="italic text-red-600">F1</span> 
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
<section className="px-6 pt-14 pb-24 max-w-7xl mx-auto">
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    viewport={{ once: true }}
  >
    <h2 className="text-3xl md:text-4xl font-serif tracking-tight mb-10">
      The Evolution of Formula 1
    </h2>

    <div className="space-y-6 md:space-y-7 text-slate-400 leading-relaxed text-sm md:text-base max-w-5xl">
      <p>
        Formula 1 began in 1950 as the ultimate test of mechanical endurance and
        driver courage. Early success depended on reliability and raw
        engineering rather than aerodynamic refinement.
      </p>

      <p>
        As aerodynamics, materials science, and computational tools advanced,
        Formula 1 transformed into a discipline of marginal gains, where
        hundredths of a second defined competitiveness.
      </p>

      <p>
        The hybrid era shifted the sport toward energy efficiency, system
        integration, and reliability, turning teams into data-driven
        organisations focused on long-term optimisation.
      </p>

      <p>
        The ground-effect regulations reintroduced closer racing, increasing the
        importance of tyre management, traffic handling, and strategic
        execution.
      </p>
    </div>
  </motion.div>
</section>

      {/* ================= NEW TO F1 ================= */}
<section className="px-6 pb-32 max-w-7xl mx-auto">
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
    viewport={{ once: true }}
  >
    <h2 className="text-3xl md:text-4xl font-serif tracking-tight mb-10">
      New to Formula 1?
    </h2>

    <div className="space-y-7 md:space-y-8 text-slate-400 leading-relaxed text-sm md:text-base max-w-5xl">
      <p>
        Formula 1 is the highest level of single-seater motorsport, officially
        established in 1950. It is a global championship where teams design,
        build, and race the fastest circuit cars in the world under a strict
        technical and sporting rulebook. What sets Formula 1 apart is that
        performance is not defined by the driver alone—engineering,
        aerodynamics, and data-driven decision-making are equally decisive.
      </p>

      <p>
        Each season features{" "}
        <span className="text-slate-200 font-medium">10 teams</span>, with{" "}
        <span className="text-slate-200 font-medium">2 cars per team</span>,
        forming a grid of 20 drivers. Race weekends are structured around
        practice sessions, qualifying, and the race itself, typically covering
        around 305 kilometres. Strategy often matters more than raw speed.
      </p>

      <p>
        Formula 1 is funded through manufacturer investment, sponsorships,
        prize money, and global media rights. Modern cost-cap rules improve
        competitiveness while keeping development sustainable. Beyond racing,
        Formula 1 functions as a high-performance engineering laboratory whose
        innovations influence road cars and wider technology.
      </p>
    </div>
  </motion.div>
</section>



      {/* ================= TIMELINE ================= */}
<section className="px-6 pb-28 max-w-6xl mx-auto">
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.7, ease: "easeOut" }}
    viewport={{ once: true }}
  >
    <h2 className="text-3xl md:text-[2.2rem] font-serif tracking-tight mb-16">
      Regulation Timeline
    </h2>

    <div className="relative pl-8 md:pl-9">
      {/* Road-like spine */}
      <motion.div
  initial={{ scaleY: 0 }}
  whileInView={{ scaleY: 1 }}
  transition={{ duration: 1.8, ease: "easeOut" }}
  viewport={{ once: true }}
  className="
    absolute left-[8px] top-0 bottom-0
    w-[3px]
    bg-white
    bg-[repeating-linear-gradient(to_bottom,#ffffff_0_10px,transparent_10px_20px)]
    opacity-90
    origin-top
  "
/>

      <div className="space-y-12 md:space-y-14">
        {[
          {
            year: "1950",
            title: "Origins of Formula 1",
            detail:
              "Standardised world championship introduced, prioritising mechanical reliability and driver endurance.",
          },
          {
            year: "1980s",
            title: "Turbo power explosion",
            detail:
              "Turbocharged engines reached extreme outputs, forcing regulatory controls on safety and costs.",
          },
          {
            year: "2014",
            title: "Hybrid efficiency era",
            detail:
              "Energy recovery systems and software became decisive performance differentiators.",
          },
          {
            year: "2022",
            title: "Ground-effect return",
            detail:
              "Aerodynamics redesigned to reduce dirty air and promote closer racing.",
          },
          {
            year: "2026",
            title: "Active aero & electric focus",
            detail:
              "Future regulations emphasise electrical power and adaptive aerodynamics.",
          },
        ].map((item, i) => (
          <motion.div
            key={item.year}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.06 }}
            viewport={{ once: true }}
            className="group grid grid-cols-[18px_1fr] gap-5 items-start"
          >
            {/* Dot marker */}
            <span className="mt-1.5 w-3 h-3 rounded-full bg-red-600 ring-2 ring-black" />

            {/* Content */}
            <div>
              <h3 className="text-lg md:text-xl font-semibold tracking-wide">
                {item.year}
              </h3>

              <p className="text-slate-400 text-sm mt-1.5">
                {item.title}
              </p>

              <p
                className="
                  mt-2.5 text-sm text-slate-500 leading-relaxed
                  opacity-100 md:opacity-0
                  md:group-hover:opacity-100
                  transition-opacity duration-300
                "
              >
                {item.detail}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </motion.div>
</section>




      {/* ================= RULES ================= */}
{/* ================= RULES ================= */}
<section className="px-6 pb-32 max-w-7xl mx-auto">
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    viewport={{ once: true }}
  >
    <h2 className="text-3xl md:text-4xl font-serif tracking-tight mb-16">
      Core Rules of Formula 1
    </h2>

    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: 0.08 },
        },
      }}
      className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7"
    >
      {rules.map((r) => (
        <RuleCard key={r.title} rule={r} />
      ))}
    </motion.div>
  </motion.div>
</section>





      {/* ================= CHAMPIONS ================= */}
<section className="px-6 pb-32 max-w-6xl mx-auto">
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    viewport={{ once: true }}
  >
    <h2 className="text-3xl md:text-4xl font-serif tracking-tight mb-12">
      World Champions (Last 10 Years)
    </h2>

    <div className="overflow-x-auto">
      <table className="w-full border border-white/10 rounded-xl text-sm overflow-hidden">
        <thead className="bg-neutral-900 text-slate-400">
          <tr>
            <th className="px-5 py-4 text-left font-medium">Season</th>
            <th className="px-5 py-4 text-left font-medium">Champion</th>
            <th className="px-5 py-4 text-left font-medium">Team</th>
          </tr>
        </thead>

        <motion.tbody
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.06,
              },
            },
          }}
        >
          {champions.map((c) => (
            <motion.tr
              key={c.year}
              variants={{
                hidden: { opacity: 0, y: 13 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="
                group border-t border-slate-800
                hover:bg-neutral-900/50 transition-colors
              "
            >
              {/* Season */}
              <td className="px-5 py-4 font-medium">
                {c.year}
              </td>

              {/* Champion */}
              <td className={`px-5 py-4 font-semibold ${c.bg}`}>
                {c.driver}
              </td>

              {/* Team with accent */}
              <td className="px-5 py-4 text-slate-400 relative">
                <span
                  className={`
                    absolute left-0 top-0 bottom-0 w-1
                    ${c.team === "Mercedes" ? "bg-teal-400/60" : ""}
                    ${c.team === "Red Bull" ? "bg-blue-500/60" : ""}
                    ${c.team === "Mclaren" ? "bg-orange-300/60 text-orange-300" : ""}
                  `}
                />
                <span className="pl-3">
                  {c.team}
                </span>
              </td>
            </motion.tr>
          ))}
        </motion.tbody>
      </table>
    </div>
  </motion.div>
</section>



      {/* ================= DRIVERS ================= */}
<section className="px-6 pb-32 max-w-7xl mx-auto">
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    viewport={{ once: true }}
  >
    <h2 className="text-3xl md:text-4xl font-serif tracking-tight mb-16">
      Legendary Drivers & Their Impact
    </h2>

    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {drivers.map((d, i) => (
        <motion.div
          key={d.name}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: i * 0.05 }}
          viewport={{ once: true }}
          className="
            group relative rounded-2xl overflow-hidden
            border border-white/10 bg-[#020202]
            transition-transform duration-300
            md:hover:-translate-y-1
          "
        >
          {/* Image */}
          <div className="relative w-full aspect-[3/4] overflow-hidden">
            <img
              src={d.img}
              alt={d.name}
              className="
                absolute inset-0 w-full h-full object-cover object-top
                transition-transform duration-500
                md:group-hover:scale-105
              "
            />

            {/* Image fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative p-5">
            <h3 className="text-lg font-semibold tracking-tight">
              {d.name}
            </h3>

            <p className="text-xs text-slate-400 mt-1">
              {d.titles} · {d.era}
            </p>

            <p className="text-sm text-slate-400 mt-4 leading-relaxed">
              {d.impact}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
</section>



      {/* <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        Educational & analytical project · Built with historical Formula 1 race data · Not affiliated with Formula 1
      </footer>
    </div>
  ); */}

  {/* ================= FOOTER ================= */}
<footer className="relative border-t border-white/10 py-14 text-center text-xs text-slate-500">
  {/* Subtle top fade */}
  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />

  <div className="space-y-2">
    {/* Brand */}
    <div className="text-slate-400 tracking-wide">
      F1<sup className="text-red-600 font-semibold">4</sup> ·{" "}
      <span className="text-slate-300">F1 for F1</span>
    </div>

    {/* Tagline */}
    <div className="text-[11px] uppercase tracking-widest">
      Strategy-first · Data-driven · Regulation-aware
    </div>

    {/* Disclaimer */}
    <div className="mt-3 text-[11px] text-slate-600 leading-relaxed max-w-3xl mx-auto">
      Educational & analytical project · Built using historical Formula 1 race
      data · Not affiliated with Formula 1, FIA, or any official constructor
    </div>
  </div>
</footer>

      </div>
    );
  }

  function RuleCard({ rule }: { rule: any }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      layout
      transition={{ layout: { duration: 0.35, ease: "easeOut" } }}
      className={`
        relative rounded-2xl p-6 md:p-7
        border border-white/10 bg-[#020202]
        transition-all duration-300
        ${open ? "border-red-600/70 shadow-[0_12px_40px_rgba(255,0,0,0.12)]" : ""}
      `}
    >
      {/* Category */}
      <div className="text-xs tracking-widest text-slate-500 mb-3">
        {rule.category}
      </div>

      {/* Huge title */}
      <h3 className="text-xl md:text-2xl font-semibold tracking-tight leading-snug">
        {rule.title}
      </h3>

      {/* Short summary */}
      <motion.p
        layout
        className="text-slate-400 text-sm mt-3 leading-relaxed"
      >
        {rule.short}
      </motion.p>

      {/* Expandable content */}
      {open && (
        <motion.p
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mt-3 text-sm text-slate-500 leading-relaxed"
        >
          {rule.detail}
        </motion.p>
      )}

      {/* Action */}
      <button
        onClick={() => setOpen(!open)}
        className="mt-5 text-sm text-red-500 hover:text-red-400 transition"
      >
        {open ? "Hide details" : "View details"}
      </button>

      {/* Bottom accent */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red-600/50 to-transparent opacity-60" />
    </motion.div>
  );
}


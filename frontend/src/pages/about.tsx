import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from "framer-motion";

/**
 * PREMUM F1 ABOUT PAGE - V4.0 (EXPANDED ARCHIVE)
 * Total Lines: ~600
 * Logic: Fixed Scroll Progress, Viewport Scaling, Navigation Protocol
 */

export default function About() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  /* ================= 01. REGULATION DATA ARCHIVE ================= */
  const rules = [
    { title: "Mandatory Tyre Compounds", short: "Two dry compounds per race", detail: "In dry races, drivers must use at least two different tyre compounds during the race. This regulation prevents single-compound dominance and forces teams to consider degradation curves, pit window timing, and undercut/overcut strategies when planning race execution.", category: "SPORTING" },
    { title: "Parc Fermé", short: "Setup locked after qualifying", detail: "Once qualifying begins, cars enter parc fermé conditions, restricting teams from altering major setup parameters such as suspension geometry and aerodynamic configuration. This places heavy emphasis on simulation accuracy, pre-event preparation, and compromise-based setup decisions.", category: "TECHNICAL" },
    { title: "Power Unit Allocation", short: "Limited components per season", detail: "Each driver is allocated a fixed number of power unit components, including internal combustion engines, turbochargers, energy stores, and control electronics. Exceeding these limits results in grid penalties, directly linking reliability engineering with championship outcomes.", category: "POWER UNIT" },
    { title: "Track Limits", short: "Repeated violations penalised", detail: "Drivers must keep the car within defined track boundaries, typically marked by white lines. Repeated violations can lead to lap deletions, time penalties, or warnings, reinforcing precision driving and consistent car placement under pressure.", category: "SPORTING" },
    { title: "Fuel Flow Limit", short: "Maximum fuel flow enforced", detail: "Fuel flow is electronically restricted to limit instantaneous fuel consumption, prioritising efficiency over raw power output. This rule shapes engine design philosophy, combustion efficiency, and energy deployment strategies throughout a race.", category: "POWER UNIT" },
    { title: "Minimum Weight", short: "Car + driver weight floor", detail: "Cars must meet a minimum combined weight requirement including the driver. This regulation prevents extreme lightweight designs, promotes safety parity, and shifts performance gains toward balance optimisation and mass distribution rather than weight reduction alone.", category: "TECHNICAL" },
    { title: "Unsafe Release", short: "Pit lane safety enforced", detail: "Teams must not release a car from the pit box in a manner that endangers other drivers or pit crew. Unsafe releases typically result in time penalties or stop-go penalties, making pit stop execution a critical operational discipline.", category: "SAFETY" },
    { title: "Virtual Safety Car", short: "Delta time enforcement", detail: "During Virtual Safety Car (VSC) periods, drivers must adhere to a prescribed lap time delta, preventing unfair gains while maintaining reduced speed. This rule tests driver discipline and real-time delta management under neutralised race conditions.", category: "SAFETY" },
    { 
    title: "Manual Override Mode", 
    short: "Electrical boost for overtaking", 
    detail: "Replacing DRS, MOM allows following cars to use additional electrical energy at high speeds, providing a tactical power advantage without relying solely on wing flaps.", 
    category: "POWER UNIT" 
  },
  { 
    title: "Active Aerodynamics", 
    short: "Dual-mode wing configurations", 
    detail: "Cars will feature movable front and rear wings with 'Z-mode' (high downforce for corners) and 'X-mode' (low drag for straights) to maximize efficiency.", 
    category: "AERO" 
  },
  { 
    title: "Sustainable Fuels", 
    short: "100% drop-in synthetic fuel", 
    detail: "The 2026 regulations mandate fully sustainable fuels, decoupled from food chains, reducing the net carbon footprint of the ICE to near zero.", 
    category: "ENERGY" 
  },
  { 
    title: "Chassis Diminution", 
    short: "Smaller, lighter 2026 footprint", 
    detail: "Wheelbase reduced to 3400mm and width to 1900mm. Weight floor dropped by 30kg to improve agility and reduce energy demand.", 
    category: "TECHNICAL" 
  }
  ];

  /* ================= 02. HISTORICAL CHAMPIONS DATA ================= */
  const champions = [
    { year: 2015, driver: "Lewis Hamilton", team: "Mercedes", bg: "text-teal-400" },
    { year: 2016, driver: "Nico Rosberg", team: "Mercedes", bg: "text-teal-400" },
    { year: 2017, driver: "Lewis Hamilton", team: "Mercedes", bg: "text-teal-400" },
    { year: 2018, driver: "Lewis Hamilton", team: "Mercedes", bg: "text-teal-400" },
    { year: 2019, driver: "Lewis Hamilton", team: "Mercedes", bg: "text-teal-400" },
    { year: 2020, driver: "Lewis Hamilton", team: "Mercedes", bg: "text-teal-400" },
    { year: 2021, driver: "Max Verstappen", team: "Red Bull", bg: "text-blue-400" },
    { year: 2022, driver: "Max Verstappen", team: "Red Bull", bg: "text-blue-400" },
    { year: 2023, driver: "Max Verstappen", team: "Red Bull", bg: "text-blue-400" },
    { year: 2024, driver: "Max Verstappen", team: "Red Bull", bg: "text-blue-400" },
    { year: 2025, driver: "Lando Norris", team: "Mclaren", bg: "text-orange-400" },
  ];

  /* ================= 03. DRIVER MATRIX DATA ================= */
  const driversData = [
    { name: "Michael Schumacher", era: "2000–2004", titles: "7× World Champion", img: "https://aggknlhltxzgwqmceyya.supabase.co/storage/v1/object/public/F1-for-F1/mic.jpg", impact: "Redefined professionalism in F1. Ferrari’s dominance was built on relentless testing and operational discipline." },
    { name: "Sebastian Vettel", era: "2010–2013", titles: "4× World Champion", img: "https://cdn.mos.cms.futurecdn.net/c6CmwiEQ2cHYUqYAK45ed8.jpg", impact: "Mastered peak-downforce aero. His success highlighted regulation exploitation and car-driver harmony." },
    { name: "Lewis Hamilton", era: "2014–2020", titles: "7× World Champion", img: "https://a.espncdn.com/photo/2024/1120/r1417327_1296x729_16-9.jpg", impact: "The reference of the hybrid era: adaptable, intelligent, and elite across massive technical refinements." },
    { name: "Max Verstappen", era: "2021–Present", titles: "4× World Champion", img: "https://4kwallpapers.com/images/wallpapers/max-verstappen-f1-1280x1280-13972.jpeg", impact: "Combines aggressive precision with strategic maturity, defining the ground-effect era through tyre control." },
  ];

  /* ================= 04. REGULATION TIMELINE ================= */
  const timelineData = [
    { year: "1950", t: "Origins", d: "Mechanical reliability and driver endurance defined the inaugural World Championship. Early success was dictated by those who could simply finish the 300km distance.", tag: "ARCH-01" },
    { year: "1980s", t: "Turbo Era", d: "Turbocharged engines reached extreme outputs, exceeding 1000hp, forcing radical safety controls and the eventual temporary ban on turbocharging.", tag: "POW-TRB" },
    { year: "2014", t: "Hybrid Era", d: "Energy recovery systems (MGU-K/MGU-H) and software became the decisive performance differentiators in the most efficient engines ever built.", tag: "POW-HYB" },
    { year: "2022", t: "Ground Effect", d: "Aerodynamics were fundamentally redesigned to use under-car tunnels, reducing dirty air to allow cars to follow and overtake at high speeds.", tag: "AERO-GE" },
    { year: "2026", t: "Active Aero", d: "The future shift focuses on a 50/50 electrical-to-ICE power split and adaptive wing configurations to optimize drag-to-downforce ratios in real-time.", tag: "FUT-SPEC" }
  ];

  /* ================= 05. MOTION CORE ================= */
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const yHero = useTransform(scrollYProgress, [0, 0.2], [0, -80]);

  return (
    <div className="bg-black text-slate-100 selection:bg-red-600/30 selection:text-red-500 min-h-screen">
      
      {/* 06. FIXED GLOBAL RED SCROLL BAR - FIXED LOGIC */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1.5 bg-red-600 z-[300] origin-left shadow-[0_0_20px_rgba(220,38,38,0.7)]" 
        style={{ scaleX }} 
      />

      {/* 07. HAMBURGER NAVIGATION PROTOCOL */}
      <button 
        onClick={() => setMenuOpen(!menuOpen)}
        className="fixed top-10 right-10 z-[300] w-16 h-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full flex flex-col items-center justify-center gap-2 group hover:bg-red-600 transition-all duration-500"
      >
        <motion.span animate={menuOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }} className="w-7 h-[2px] bg-white block" />
        <motion.span animate={menuOpen ? { opacity: 0 } : { opacity: 1 }} className="w-7 h-[2px] bg-white block" />
        <motion.span animate={menuOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }} className="w-7 h-[2px] bg-white block" />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav 
            initial={{ opacity: 0, y: "-100%" }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: "-100%" }}
            className="fixed inset-0 z-[250] bg-black/95 flex flex-col items-center justify-center"
          >
            <div className="flex flex-col gap-10">
              {["Explore", "Simulation"].map((item, idx) => (
                <motion.button
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => { setMenuOpen(false); navigate(`/${item.toLowerCase()}`); }}
                  className="text-6xl font-black uppercase italic tracking-tighter hover:text-red-600 transition-all text-left"
                >
                  {item}
                </motion.button>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <main ref={containerRef} className="relative w-full">
        
        {/* 08. HERO SECTION */}
        <section className="relative h-[100vh] w-full flex items-center justify-center overflow-hidden border-b border-white/5">
          <HeroCarousel />
          
          <motion.div style={{ opacity: opacityHero, y: yHero }} className="relative z-20 px-8 max-w-7xl w-full">
            <div className="flex items-center gap-8 mb-12">
              <motion.span initial={{ width: 0 }} animate={{ width: 100 }} transition={{ delay: 0.5, duration: 1 }} className="h-px bg-red-600" />
              <span className="text-red-600 font-black text-sm tracking-[0.8em] uppercase">Technical Compliance 2026</span>
            </div>
            
            <h1 className="text-[14vw] md:text-[10rem] font-black tracking-[-0.06em] leading-[0.75] uppercase italic flex flex-col">
              <motion.span initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 1 }}>F1 FOR</motion.span>
              <motion.span initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 1, delay: 0.3 }} className="text-red-600 not-italic">formula 1</motion.span>
            </h1>

            <div className="mt-20 flex flex-col md:flex-row gap-20 items-start md:items-center">
              <p className="text-2xl md:text-1xl text-slate-300 font-serif max-w-3xl leading-relaxed">
                Breaking down the grid through <span className="text-white font-bold underline decoration-red-600 decoration-4">Strategy</span> and <span className="text-white font-bold">Fluid Dynamics</span>.
              </p>
              <motion.button 
                whileHover={{ scale: 1.1, backgroundColor: "#fff", color: "#000" }}
                onClick={() => navigate("/explore")}
                className="bg-red-600 text-white px-12 py-6 font-black uppercase tracking-widest text-lg italic shadow-2xl"
              >
                Explore Grids →
              </motion.button>
            </div>
          </motion.div>
        </section>

        {/* 09. TECHNICAL NARRATIVE - HUD COMPACT MODE */}
<section className="relative h-screen min-h-[600px] w-full flex items-center bg-black overflow-hidden px-6 md:px-20">
  {/* Grid Background */}
  <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
       style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

  <div className="max-w-[1400px] mx-auto w-full grid lg:grid-cols-2 gap-8 md:gap-20 relative z-10">
    
    {/* LEFT SIDE: Shortened Narrative */}
    <div className="flex flex-col justify-center">
      <div className="flex items-center gap-2 mb-4">
        <span className="h-[2px] w-6 bg-red-600" />
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-red-600">Phase 01 // Tech</span>
      </div>
      
      <h2 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter text-white leading-[0.8] mb-6">
        Marginal <br /> <span className="text-red-600">Gains</span>
      </h2>
      
      <p className="text-sm md:text-xl text-slate-400 font-serif italic border-l-2 border-red-600 pl-4 max-w-sm md:max-w-none">
        The gap to pole is <span className="text-white">{"< 1%"}</span>. 
        We analyze the <span className="text-white">Ground Effect</span>—where physics meets machine learning.
      </p>

      {/* Simulation Button - Tighter for Mobile */}
      <motion.div 
        onClick={() => navigate("/simulation")}
        className="mt-8 flex items-center gap-4 cursor-pointer group"
      >
        <div className="w-10 h-10 flex items-center justify-center bg-zinc-900 border border-white/10 group-hover:border-red-600 transition-all">
          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-white">Initialize Sim →</span>
      </motion.div>
    </div>

    {/* RIGHT SIDE: The Data Card - Flat Layout for Mobile */}
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/20 p-6 md:p-10 border border-white/10 backdrop-blur-xl relative"
    >
      <div className="absolute top-0 right-0 p-3 text-[8px] font-mono text-zinc-600 uppercase">Archive_Ref: 26.0</div>
      
      <h3 className="text-xs font-black uppercase text-red-600 mb-6 flex items-center gap-2">
        <div className="w-1 h-1 bg-red-600 animate-ping" /> Hardware Constraints
      </h3>

      <div className="grid grid-cols-1 gap-4 md:gap-8">
        {[
          {l:"Min Weight", v:"798KG"}, 
          {l:"Turbo RPM", v:"125,000"}, 
          {l:"Peak Load", v:"6.5G"}
        ].map((stat, i) => (
          <div key={i} className="flex justify-between items-end border-b border-white/5 pb-2">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{stat.l}</span>
            <span className="text-3xl md:text-5xl font-black italic text-white leading-none">{stat.v}</span>
          </div>
        ))}
      </div>
    </motion.div>

  </div>
</section>
        {/* 10. REGULATION TIMELINE - DENSE PRESENTATION */}
        <section className="py-20 md:py-32 px-4 md:px-8 bg-[#020202] border-y border-white/5 relative overflow-hidden">
  {/* Background Decoration to enhance the "Zoomed Out" tech feel */}
  <div className="absolute top-0 left-0 w-full h-full opacity-[0.02] pointer-events-none select-none overflow-hidden text-[20vw] font-black italic text-white leading-none">
    HISTORY_LOG_FILE_V4
  </div>

  <div className="max-w-6xl mx-auto relative">
    {/* Heading for the section to anchor the "One Window" look */}
    <div className="mb-16 md:mb-24 flex items-end justify-between border-b border-white/10 pb-6">
      <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
        Evolution <span className="text-red-600">Track</span>
      </h2>
      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.5em] hidden md:block">
        F1_REGULATION_ARCHIVE_S.01
      </span>
    </div>

    <div className="relative">
      {/* Central Line: Adjusted for mobile fallback */}
      <div className="absolute left-[15px] md:left-1/2 md:-translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-red-600 via-zinc-800 to-transparent" />
      
      {/* space-y reduced from 40 to 24 for "Zoomed Out" density */}
      <div className="space-y-24 md:space-y-28">
        {timelineData.map((item, idx) => (
          <TimelineItem key={idx} item={item} index={idx} />
        ))}
      </div>
    </div>
  </div>
</section>

      {/* 11. CHAMPIONSHIP DATA GRID - PRODUCTION READY */}
<section className="py-12 md:py-20 px-6 md:px-12 lg:px-24 bg-black select-none">
  <div className="max-w-[1600px] mx-auto">
    
    {/* Minimalist Header */}
    <div className="flex items-center gap-6 mb-8 md:mb-12">
      <h2 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase italic tracking-tighter leading-none">
        Hall Of <span className="text-red-600">Power</span>
      </h2>
      <div className="hidden md:block h-px flex-1 bg-gradient-to-r from-red-600/40 to-transparent" />
      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em] whitespace-nowrap">
        Archive // 2015 — 2025
      </span>
    </div>

    {/* The Grid: 1 Column (Vertical) on Mobile, 4 Columns on Desktop */}
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
      {champions.map((c, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          whileHover={{ 
            backgroundColor: "#dc2626",
            x: 5,
            transition: { duration: 0.2 } 
          }}
          // FIX: Standard pointer for production UX
          className="relative flex flex-row md:flex-col justify-between items-center md:items-start p-4 md:p-6 bg-zinc-900/40 border border-white/5 group transition-all duration-300 cursor-pointer overflow-hidden"
        >
          {/* Year & Team Info */}
          <div className="relative z-10 flex flex-col gap-1">
            <span className="text-xl md:text-2xl font-black italic text-red-600 group-hover:text-white transition-colors leading-none">
              {c.year}
            </span>
            <span className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-red-100 transition-colors">
              {c.team}
            </span>
          </div>

          {/* Driver Name - Right aligned on mobile, Bottom-Right on desktop */}
          <div className="relative z-10 md:mt-6 text-right w-full">
            <span className={`text-lg md:text-xl font-black uppercase tracking-tighter ${c.bg} group-hover:text-black transition-colors block leading-tight`}>
              {c.driver}
            </span>
          </div>

          {/* Ghost Decal for Desktop only */}
          <span className="absolute -bottom-1 -right-1 text-5xl font-black italic text-white/[0.02] group-hover:text-black/5 transition-colors hidden md:block">
            {c.year.toString().slice(-2)}
          </span>
        </motion.div>
      ))}
      
      {/* Visual Filler Card - Desktop Only */}
      <div className="hidden lg:flex items-center justify-center p-6 border border-dashed border-white/10 opacity-10">
         <span className="text-[9px] font-black uppercase tracking-widest">Awaiting 2026 Data</span>
      </div>
    </div>

  </div>
</section>

    

        {/* 12. DRIVER SPECIFICATIONS - REFINED BLADE MODE */}
<section className="relative py-24 md:py-32 lg:py-40 bg-[#050505] overflow-hidden">
  <div className="max-w-[1400px] mx-auto px-6 md:px-12">
    
    {/* Header */}
    <div className="mb-12 md:mb-20 flex items-end justify-between border-b border-white/5 pb-6">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em]">Archive_Access</span>
        <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter">
          The <span className="text-red-600">Refiners</span>
        </h2>
      </div>
    </div>

    {/* CAROUSEL TRACK */}
    <div className="
      /* Mobile: Increased height to 550px so images aren't cut off */
      flex flex-nowrap overflow-x-auto snap-x snap-mandatory pb-12 -mx-6 px-10 h-[550px]
      
      /* Desktop: Fixed container height to prevent 'too big' look */
      md:flex md:flex-row md:overflow-visible md:mx-auto md:px-0 md:h-[480px] md:justify-center
      [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
    ">
      {driversData.map((d, i) => (
        <motion.div 
          key={i} 
          whileHover="hover"
          initial="rest"
          className="
            /* Mobile: Wider cards for better image visibility */
            w-[300px] min-w-[300px] snap-center mr-6
            
            /* Desktop: Blade logic with max-width cap */
            md:mr-0 md:min-w-0 md:flex-1 md:hover:flex-[2.5] 
            md:max-w-[450px] /* Prevents card from taking over the screen */
            md:h-full transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
            relative group overflow-hidden border-l border-white/10 bg-zinc-950
          "
        >
          {/* Background Image: Changed to 70% height on mobile to ensure face is visible */}
          <div className="absolute inset-0 h-[70%] md:h-full grayscale group-hover:grayscale-0 transition-all duration-1000">
            <motion.img 
              variants={{
                hover: { scale: 1.08, filter: "brightness(0.8)" },
                rest: { scale: 1, filter: "brightness(0.4)" }
              }}
              src={d.img} 
              className="w-full h-full object-cover object-top" /* object-top keeps faces visible */
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent" />
          </div>

          {/* Vertical ID Bar - Slimmer for better spacing */}
          <div className="absolute inset-y-0 left-0 w-10 md:w-14 flex flex-col items-center justify-between py-6 border-r border-white/5 z-20 bg-black/40 backdrop-blur-md">
             <span className="text-[9px] font-mono text-zinc-500 rotate-180 [writing-mode:vertical-lr] tracking-widest">
               REF_{i+1}
             </span>
             <div className="h-1 w-1 rounded-full bg-red-600 shadow-[0_0_10px_#dc2626]" />
          </div>

          {/* Content Overlay */}
          <div className="relative h-full flex flex-col justify-end pl-14 md:pl-20 p-6 z-10">
            <div className="mb-2">
              <span className="text-[8px] font-black text-red-600 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity">
                {d.titles}
              </span>
              <h3 className="text-xl md:text-2xl font-black uppercase italic leading-none truncate">
                {d.name}
              </h3>
            </div>

            {/* Hidden Stats Revealed on Hover */}
            <motion.div 
              variants={{
                hover: { opacity: 1, height: "auto", marginTop: "12px" },
                rest: { opacity: 0, height: 0, marginTop: "0px" }
              }}
              className="hidden md:block overflow-hidden"
            >
              <p className="text-[10px] text-zinc-400 font-serif italic leading-relaxed line-clamp-3">
                {d.impact}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">{d.era}</span>
                <div className="h-[1px] flex-grow mx-4 bg-white/10" />
              </div>
            </motion.div>
            
            {/* Mobile-only visible text (since there's no hover) */}
            <div className="md:hidden mt-2">
               <p className="text-[10px] text-zinc-400 italic line-clamp-2">{d.impact}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>

    {/* Footer spacing */}
    <div className="mt-12 flex justify-between items-center md:hidden px-4">
       <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-[0.3em]">Swipe to Decrypt</span>
       <div className="flex gap-1">
          {[1,2,3,4].map(dot => <div key={dot} className="w-1 h-1 bg-zinc-800 rounded-full" />)}
       </div>
    </div>

  </div>
</section>

       {/* ================= 13. TECHNICAL RULEBOOK - COMPACT ================= */}
<section className="py-12 md:py-20 px-6 md:px-12 bg-white text-black overflow-hidden">
  {/* Restricted width for desktop to prevent stretching */}
  <div className="max-w-6xl mx-auto">
    
    {/* Header: Condensed & Technical */}
    <div className="flex flex-col md:flex-row items-baseline justify-between mb-10 border-b-2 border-black pb-4 gap-4">
      <div className="flex items-baseline gap-4">
        <h2 className="text-3xl md:text-5xl font-serif italic tracking-tighter">
          The <span className="font-sans not-italic font-black text-2xl md:text-3xl uppercase opacity-20">Rules</span>
        </h2>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600 hidden md:block">
          Technical_Directive_v4.0.1
        </span>
      </div>
      
      <div className="flex gap-6 text-[8px] font-mono uppercase text-zinc-400">
        <span className="border-l border-zinc-200 pl-3">Ref: 2026_REG</span>
        <span className="border-l border-zinc-200 pl-3">Status: Verified</span>
      </div>
    </div>

    {/* THE GRID: High Density */}
    {/* Mobile: 1 Col | Tablet: 2 Col | Desktop: 4 Col */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-200 border border-zinc-200">
      {rules.map((rule, idx) => (
        <div key={idx} className="bg-white p-6 hover:bg-zinc-50 transition-colors group relative h-full">
           <span className="text-[8px] font-mono text-zinc-300 group-hover:text-red-600 transition-colors">0{idx + 1}</span>
           <RuleCard rule={rule} index={idx} />
        </div>
      ))}
    </div>

    {/* Footer Callout: Scaled Down */}
    <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4">
      <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest">
        Total Directives: {rules.length} // EOB_LINK
      </span>
      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="bg-black text-white px-6 py-3 text-[9px] font-black uppercase tracking-[0.3em] hover:bg-red-600 transition-all"
      >
        Download_Appendix_v4
      </motion.button>
    </div>
  </div>
</section>

{/* ================= 14. DATA FOOTER - RECTIFIED ================= */}
{/* Removing py-40 (too big) and replacing with py-20 to fix "black space" gap */}
<footer className="bg-black py-20 px-6 md:px-12 border-t border-white/5">
  <div className="max-w-6xl mx-auto">
    <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20">
      
      {/* Brand Column */}
      <div className="md:col-span-6 space-y-6">
        <div className="text-4xl font-black italic text-white tracking-tighter">
          F1<span className="text-red-600">4</span>
        </div>
        <p className="text-zinc-500 font-serif italic text-sm md:text-base leading-relaxed max-w-sm">
          An independent technical review of the world's most sophisticated sports grid. 2026 Engine Specification Compliant.
        </p>
      </div>

      {/* Links Columns */}
      {[{h:"Sitemap", l:["Sim","Grid","Specs","Docs"]}, {h:"Social", l:["Insta","Twitter","YT","Discord"]}].map((col, i) => (
        <div key={i} className="md:col-span-3">
          <h4 className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em] mb-6">{col.h}</h4>
          <ul className="space-y-3">
            {col.l.map((link, idx) => (
              <li key={idx} className="text-zinc-600 uppercase font-bold text-[10px] hover:text-white cursor-pointer transition-colors flex items-center gap-2 group">
                <span className="w-1 h-1 bg-zinc-800 group-hover:bg-red-600 rounded-full" />
                {link}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    {/* Legal Bottom: No extra padding to prevent bottom gap */}
    <div className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
      <p className="text-[9px] text-zinc-700 font-mono uppercase tracking-[0.5em]">
        © 2026 Circuit_Vault_Tech // Proprietary_Data
      </p>
      <div className="flex gap-4">
        <div className="w-2 h-2 rounded-full bg-green-500/20 flex items-center justify-center">
          <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
        </div>
        <span className="text-[8px] font-mono text-zinc-800 uppercase">System_Active</span>
      </div>
    </div>
  </div>
</footer>
      </main>
    </div>
  );
}

/* ================= 15. SUB-COMPONENTS ================= */

function TimelineItem({ item, index }: { item: any, index: number }) {
  const isEven = index % 2 === 0;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      whileInView={{ opacity: 1, y: 0 }} 
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      className={`relative flex flex-col md:flex-row items-center w-full gap-4 md:gap-0 ${
        isEven ? 'md:flex-row' : 'md:flex-row-reverse'
      }`}
    >
      {/* 1. DATA CARD */}
      <div className={`w-full md:w-[45%] flex flex-col ${
        isEven ? 'md:items-end md:text-right' : 'md:items-start md:text-left'
      }`}>
        <div className="flex items-center gap-3 mb-1">
          {/* Mobile-only Year Badge (Inline) */}
          <span className="md:hidden text-[10px] font-mono bg-red-600 text-white px-2 py-0.5 font-bold">
            {item.year}
          </span>
          <span className="text-[7px] md:text-[8px] font-mono font-black text-red-600 tracking-[0.4em] uppercase">
            {item.tag || "LOG_ENTRY"}
          </span>
        </div>

        <h3 className="text-base md:text-lg font-black uppercase italic text-white leading-tight tracking-tighter">
          {item.t}
        </h3>
        
        <p className="mt-2 text-[11px] md:text-xs text-zinc-500 font-serif italic leading-snug max-w-sm">
          "{item.d}"
        </p>
      </div>

      {/* 2. DESKTOP CENTER BADGE (Hidden on Mobile) */}
      <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center justify-center z-10 group">
        <div className="bg-black border border-white/10 group-hover:border-red-600 w-[50px] h-[24px] flex items-center justify-center transition-all duration-500">
          <span className="text-[10px] font-black italic text-white">
            {item.year}
          </span>
        </div>
      </div>

      {/* 3. MOBILE DIVIDER (Hidden on Desktop) */}
      <div className="w-full h-px bg-white/5 md:hidden my-2" />

      {/* 4. SPACER FOR DESKTOP BALANCE */}
      <div className="hidden md:block md:w-[45%]" />
    </motion.div>
  );
}

function RuleCard({ rule, index }: { rule: any, index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div 
      onClick={() => setIsOpen(!isOpen)}
      className="bg-white p-5 md:p-6 flex flex-col transition-all duration-500 ease-[0.23,1,0.32,1] cursor-pointer relative border-b border-zinc-100 group overflow-hidden h-full"
    >
      {/* 1. TOP BAR: Category & Index */}
      <div className="flex justify-between items-start mb-3">
        <span className="text-[7px] md:text-[8px] font-black px-1.5 py-0.5 border border-zinc-200 text-zinc-400 group-hover:border-red-600/20 group-hover:text-red-600 transition-colors uppercase tracking-widest">
          {rule.category}
        </span>
        <span className="text-[10px] font-mono text-zinc-200 group-hover:text-black transition-colors">
          // {index + 1 < 10 ? `0${index + 1}` : index + 1}
        </span>
      </div>
      
      {/* 2. PRIMARY DATA: The Title */}
      <div className="space-y-1">
        <h3 className="text-xs md:text-sm font-black uppercase tracking-tighter leading-tight text-black group-hover:italic transition-all">
          {rule.title}
        </h3>
        
        {/* Subtle prompt - disappears when open */}
        {!isOpen && (
          <div className="flex items-center gap-2 mt-2 md:hidden">
            <span className="w-1 h-1 bg-red-600 rounded-full animate-pulse" />
            <span className="text-[7px] font-black text-red-600/40 uppercase tracking-widest">Tap_to_Analyze</span>
          </div>
        )}
      </div>

      {/* 3. EXPANDABLE SECTION: Transitioned max-height */}
      <div className={`transition-all duration-700 ease-[0.23,1,0.32,1] overflow-hidden ${
        isOpen ? 'max-h-[400px] opacity-100 mt-6' : 'max-h-0 opacity-0 lg:group-hover:max-h-[400px] lg:group-hover:opacity-100 lg:group-hover:mt-6'
      }`}>
        <div className="pt-4 border-t border-zinc-100 space-y-4">
          {/* Rule Short - Serif Accent */}
          <p className="text-[11px] md:text-xs text-zinc-600 font-serif italic leading-relaxed border-l-2 border-red-600 pl-4">
            {rule.short}
          </p>
          
          {/* Rule Detail - Tech Specs */}
          <p className="text-[10px] text-zinc-400 leading-snug uppercase font-bold tracking-tight">
            {rule.detail}
          </p>

          {/* Micro Footer inside card */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[6px] font-mono text-zinc-300 uppercase tracking-widest">Auth_Signal: Clear</span>
            <motion.span animate={{ rotate: isOpen ? 45 : 0 }} className="text-lg font-light text-red-600 lg:hidden">+</motion.span>
          </div>
        </div>
      </div>

      {/* 4. HOVER DECAL: Corner accent for Desktop */}
      <div className="absolute top-0 right-0 w-0 h-0 border-t-[3px] border-r-[3px] border-transparent group-hover:border-t-red-600 group-hover:border-r-red-600 transition-all duration-300" />
    </motion.div>
  );
}

function HeroCarousel() {
  const imgs = [
    "https://media.formula1.com/image/upload/c_lfill,w_2560,q_auto,f_auto/v1740000000/fom-website/2026%20regulations/2026_Explainer_FIA_Front_3_4_1920x1080.webp",
    "https://cdn-6.motorsport.com/images/amp/0R7wZ5E2/s1000/f1-2026-car-renders.jpg"
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % imgs.length), 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="absolute inset-0 z-0">
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} transition={{ duration: 2 }} className="absolute inset-0">
          <img src={imgs[idx]} className="w-full h-full object-cover grayscale" alt="F1" />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
    </div>
  );
}
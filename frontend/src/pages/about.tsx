import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import Hero from "../components/hero";
import React from "react";



export default function About() {
  const navigate = useNavigate();
  const containerRef = useRef(null);

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
     {name: "Ayrton Senna", era: "1988–1991", titles: "3× World Champion", img: "https://static.nationalgeographicbrasil.com/files/styles/image_3200/public/senna_divulgacao-gov-bra--1-.jpeg.webp?w=1600&h=1067&p=top", impact: "The ultimate qualifying specialist. His raw speed and spiritual approach to racing transformed the sport into an art form." },
    { name: "Michael Schumacher", era: "2000–2004", titles: "7× World Champion", img: "https://www.merkur.de/assets/images/40/852/40852597-michael-schumacher-laesst-die-korken-knallen-2ta7xEQOSTBG.jpg", impact: "Redefined professionalism in F1. Ferrari’s dominance was built on relentless testing and operational discipline." },
    { name: "Sebastian Vettel", era: "2010–2013", titles: "4× World Champion", img: "https://cdn.mos.cms.futurecdn.net/c6CmwiEQ2cHYUqYAK45ed8.jpg", impact: "Mastered peak-downforce aero. His success highlighted regulation exploitation and car-driver harmony." },
    { name: "Lewis Hamilton", era: "2014–2020", titles: "7× World Champion", img: "https://a.espncdn.com/photo/2024/1120/r1417327_1296x729_16-9.jpg", impact: "The reference of the hybrid era: adaptable, intelligent, and elite across massive technical refinements." },
    { name: "Max Verstappen", era: "2021–Present", titles: "4× World Champion", img: "https://4kwallpapers.com/images/wallpapers/max-verstappen-f1-1280x1280-13972.jpeg", impact: "Combines aggressive precision with strategic maturity, defining the ground-effect era through tyre control." },
  ];

  /* ================= 04. REGULATION TIMELINE ================= */
  const timelineData = [
    { year: "1950", t: "Origins", d: "Mechanical reliability and driver endurance defined the inaugural World Championship. Early success was dictated by those who could simply finish the 300km distance.", tag: "ARCH-01", short: "Inaugural Championship" },
    { year: "1980s", t: "Turbo Era", d: "Turbocharged engines reached extreme outputs, exceeding 1000hp, forcing radical safety controls and the eventual temporary ban on turbocharging.", tag: "POW-TRB", short: "Turbocharged Engines" },
    { year: "2014", t: "Hybrid Era", d: "Energy recovery systems (MGU-K/MGU-H) and software became the decisive performance differentiators in the most efficient engines ever built.", tag: "POW-HYB", short: "Energy Recovery Systems" },
    { year: "2022", t: "Ground Effect", d: "Aerodynamics were fundamentally redesigned to use under-car tunnels, reducing dirty air to allow cars to follow and overtake at high speeds.", tag: "AERO-GE", short: "Aerodynamic Redesign" },
    { year: "2026", t: "Active Aero", d: "The future shift focuses on a 50/50 electrical-to-ICE power split and adaptive wing configurations to optimize drag-to-downforce ratios in real-time.", tag: "FUT-SPEC", short: "Adaptive Wing Configurations" }
  ];

    /* ================= 05. MOTION CORE ================= */
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

    return (
      <div className="bg-black text-slate-100 selection:bg-red-600/30 selection:text-red-500 min-h-screen">
        
        {/* 06. FIXED GLOBAL RED SCROLL BAR - FIXED LOGIC */}
        <motion.div 
          className="fixed top-0 left-0 right-0 h-1.5 bg-red-600 z-[300] origin-left shadow-[0_0_20px_rgba(220,38,38,0.7)]" 
          style={{ scaleX }} 
        />

        <main ref={containerRef} className="relative w-full">
          
       <Hero />

        {/* 09. TECHNICAL NARRATIVE - EDITORIAL HUD */}
<section className="relative min-h-screen w-full flex items-center bg-[#050505] py-16 md:py-24 px-6 lg:px-24 overflow-hidden">
  
  {/* Subtly Textured Background */}
  <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
    style={{ backgroundImage: `radial-gradient(#fff 1px, transparent 1px)`, backgroundSize: '50px 50px' }} 
  />

  <div className="max-w-[1100px] mx-auto w-full relative">
    
    <div className="flex flex-col lg:grid lg:grid-cols-12 items-start gap-12 lg:gap-0">
      
      {/* LEFT: The Narrative Core */}
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="lg:col-span-7 z-20 space-y-8 md:space-y-12"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="text-[9px] md:text-[10px] font-mono tracking-[0.4em] md:tracking-[0.6em] text-zinc-600 uppercase">Ref_Archive_2026</span>
            <div className="h-[1px] w-12 md:w-16 bg-zinc-900" />
          </div>

          {/* FLUID TYPOGRAPHY: Adjusted for mobile visibility */}
          <h2 className="text-6xl md:text-8xl lg:text-9xl font-serif text-white tracking-tight leading-[0.85] uppercase">
            The <br />
            <span className="text-red-600">Physics</span> <br />
            Reset
          </h2>
        </div>

        <div className="max-w-md space-y-8 md:space-y-10">
          <p className="text-lg md:text-2xl text-zinc-400 font-serif leading-snug md:leading-relaxed tracking-tight">
            A total technical departure. Modeling the interaction between 100% sustainable fuels and active aero in real-time.
          </p>
          
          <div className="flex flex-wrap gap-10 md:gap-16 border-t border-white/5 pt-8 md:pt-10">
            <div className="space-y-2">
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Protocol</p>
              <p className="text-[11px] md:text-xs text-white font-mono uppercase tracking-tighter">Z-Active // 2026</p>
            </div>
            <div className="space-y-2">
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Efficiency</p>
              <p className="text-[11px] md:text-xs text-white font-mono uppercase tracking-tighter">Peak Stable</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* RIGHT: The Technical Index */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="lg:col-span-5 w-full mt-8 lg:mt-40"
      >
        {/* Adjusted padding for mobile (p-6) vs desktop (p-14) */}
        <div className="relative bg-[#070707] border border-white/5 p-6 md:p-14 shadow-2xl">
          
          <div className="space-y-10 md:space-y-14">
            {[
              { label: "Minimum Weight", val: "798", unit: "kg" },
              { label: "Turbo RPM Limit", val: "125", unit: "k" },
              { label: "Peak G-Loading", val: "6.5", unit: "g" }
            ].map((item, i) => (
              <div key={i} className="group">
                <div className="flex justify-between items-end mb-3 md:mb-4">
                  <span className="text-[9px] md:text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                    {item.label}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl md:text-6xl font-serif text-white uppercase tracking-tighter group-hover:text-red-600 transition-colors duration-300">
                      {item.val}
                    </span>
                    <span className="text-[9px] md:text-[10px] font-mono text-red-900 font-bold uppercase">
                      {item.unit}
                    </span>
                  </div>
                </div>
                <div className="h-[1px] w-full bg-zinc-900" />
              </div>
            ))}
          </div>

          <div className="mt-10 md:mt-14 flex justify-between items-center">
            <div className="flex gap-1.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-1 h-1 bg-red-900/40" />
              ))}
            </div>
            <span className="text-[8px] md:text-[9px] font-mono text-zinc-700 tracking-[0.3em] md:tracking-[0.5em] uppercase">Tech_Spec_V.09</span>
          </div>
        </div>
      </motion.div>

    </div>
  </div>
</section>
{/* 09.5 THE PINNACLE - COMPACT OPTIMIZATION */}
<section className="relative h-screen min-h-[650px] w-full flex items-center bg-[#050505] py-4 px-4 md:px-12 lg:px-24 border-b border-white/5 overflow-hidden">
  
  {/* Layer 1: Minimalist Texture */}
  <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
    style={{ backgroundImage: `radial-gradient(#fff 1px, transparent 1px)`, backgroundSize: '40px 40px' }} 
  />

  <div className="max-w-[1200px] mx-auto w-full h-full max-h-[850px] border border-white/5 relative z-10 bg-[#070707]/30 backdrop-blur-sm flex flex-col">
    
    {/* HEADER BLOCK - Optimized Height */}
    <div className="border-b border-white/5 p-4 md:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-red-600" />
          <span className="text-[8px] md:text-[10px] font-mono tracking-[0.4em] text-zinc-600 uppercase">Ref_09.5</span>
        </div>
        <h2 className="text-4xl md:text-7xl lg:text-8xl font-serif text-white uppercase leading-[0.8] tracking-tighter">
          Engineering <br />
          <span className="text-red-600">Marvel</span>
        </h2>
      </div>
      <div className="font-mono text-[8px] text-zinc-700 uppercase tracking-widest hidden sm:block border-l border-white/5 pl-6 mb-1">
        Maranello_HQ // 44.82° N
      </div>
    </div>

    {/* CONTENT GRID - Flexible Growth */}
    <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
      
      {/* LEFT: NARRATIVE (7 Columns) */}
      <div className="lg:col-span-7 border-b lg:border-b-0 lg:border-r border-white/5 p-4 md:p-8 flex flex-col justify-between space-y-6">
        <p className="text-lg md:text-3xl lg:text-4xl font-serif leading-tight text-zinc-300 tracking-tight">
          "F1 is the world's fastest laboratory. A convergence of <span className="text-white underline decoration-red-600 decoration-1 underline-offset-4">sovereign wealth</span> and aerospace engineering."
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div className="space-y-4">
            <p className="text-[10px] md:text-xs text-zinc-500 font-mono leading-relaxed uppercase tracking-tighter max-w-[280px]">
              Since 2021, focus shifted from "Who spends" to "Who optimizes." Every gram is a line item.
            </p>
            <div className="flex gap-4">
              <div className="flex-1 border-l border-zinc-800 pl-3 py-1">
                <span className="block text-[7px] font-mono text-zinc-600 uppercase mb-1">R&D Cap</span>
                <span className="text-xl font-serif text-white">$135M</span>
              </div>
              <div className="flex-1 border-l border-zinc-800 pl-3 py-1">
                <span className="block text-[7px] font-mono text-zinc-600 uppercase mb-1">Data/Sec</span>
                <span className="text-xl font-serif text-white">1.1M</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: DATA VISUAL (5 Columns) */}
      <div className="lg:col-span-5 p-4 md:p-8 bg-black/20 flex flex-col justify-between gap-8">
        <h3 className="font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-600 flex items-center gap-3">
          <span className="w-6 h-[1px] bg-red-900" /> Capital_Allocation
        </h3>

        <div className="space-y-6 md:space-y-8 lg:space-y-10">
          {[
            { label: "Constructor", val: 45, color: "bg-red-600" },
            { label: "Partnerships", val: 35, color: "bg-zinc-200" },
            { label: "Broadcast", val: 20, color: "bg-zinc-800" }
          ].map((item, i) => (
            <div key={i} className="group">
              <div className="flex justify-between items-end mb-2">
                <div className="space-y-1">
                  <span className="block text-[7px] font-mono text-zinc-700 uppercase tracking-widest">Index_0{i+1}</span>
                  <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-tighter group-hover:text-white transition-colors">{item.label}</span>
                </div>
                <span className="text-2xl md:text-3xl font-serif text-white tracking-tighter">{item.val}%</span>
              </div>
              <div className="h-[1px] w-full bg-zinc-900 overflow-hidden">
                <motion.div 
                  initial={{ x: "-100%" }} 
                  whileInView={{ x: "0%" }} 
                  transition={{ duration: 1, delay: i * 0.1 }}
                  className={`h-full ${item.color}`} 
                  style={{ width: `${item.val}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4">
          <p className="text-[7px] font-mono text-zinc-800 uppercase tracking-[0.4em]">Terminal_Confirmed_2026</p>
          <div className="flex gap-1">
             <div className="w-1 h-1 bg-red-600/20" />
             <div className="w-1 h-1 bg-red-600/40" />
             <div className="w-1 h-1 bg-red-600/60" />
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

{/* 11. CHAMPIONSHIP DATA CORE - REFINED WITH TITLE BADGES */}
<section className="relative h-screen w-full bg-[#030303] flex flex-col justify-between overflow-hidden border-t border-white/5">
  
  <header className="pt-8 md:pt-12 px-8 md:px-16 z-30 shrink-0">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-1.5 h-4 bg-red-600 shadow-[0_0_12px_#dc2626]" />
      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.5em] font-bold">Registry // Hall_Of_Fame</span>
    </div>
    <h2 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter text-white leading-[0.85]">
      THE <span className="text-red-600">REIGN</span>
    </h2>
  </header>

  <div className="flex-grow flex items-end justify-center px-4 md:px-10 pb-10 relative">
    <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
      <span className="text-[22vw] font-black italic text-white">DYNASTY</span>
    </div>

    {/* PODIUM GRID */}
    <div className="flex items-end justify-center gap-2 md:gap-4 w-full max-w-6xl h-full max-h-[450px] md:max-h-[550px] z-10">
      {[
        { 
          name: "Verstappen", 
          titles: "4x", 
          years: "2021, 2022, 2023, 2024",
          img: "https://i.pinimg.com/736x/2e/1f/a3/2e1fa3c0cc232ed9c7b5a3cab31b12e6.jpg", 
          h: "h-[80%]", 
          pos: "P2", 
          color: "from-zinc-900" 
        },
        { 
          name: "Hamilton", 
          titles: "7x", 
          years: "2008, 2014, 2015, 2017, 2018, 2019, 2020",
          img: "https://i.pinimg.com/736x/96/8a/4a/968a4a1ae6eff274e6c7f28e8565af20.jpg", 
          h: "h-full", 
          pos: "P1", 
          color: "from-red-900/40" 
        },
        { 
          name: "L. Norris", 
          titles: "1x", 
          years: "2025",
          img: "https://i.pinimg.com/736x/86/70/18/867018263dcdc332666cfa0746a0a794.jpg", 
          h: "h-[70%]", 
          pos: "P3", 
          color: "from-orange-900/30" 
        }
      ].map((driver, i) => (
        <motion.div
          key={i}
          className={`relative flex-1 ${driver.h} min-w-[100px] bg-zinc-900/40 border border-white/10 group overflow-hidden`}
        >
          {/* IMAGE LAYER */}
          <div className="absolute inset-0 w-full h-full">
            <img 
              src={driver.img} 
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 object-[50%_15%]" 
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${driver.color} via-black/20 to-transparent opacity-80`} />
          </div>

          {/* 7x / 4x BADGE */}
          <div className="absolute top-3 left-3 md:top-5 md:left-5 z-30">
            <div className="backdrop-blur-md bg-white/5 border border-white/10 px-2 py-1 rounded-sm">
              <span className="text-lg md:text-2xl font-black italic text-black group-hover:text-red-600 transition-colors">
                {driver.titles}
              </span>
            </div>
          </div>

          {/* HOVER REVEAL: TITLE YEARS */}
          <div className="absolute top-3 right-3 md:top-5 md:right-5 z-30 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
            <p className="text-[10px] md:text-[9px] font-mono text-red-800 text-right uppercase leading-tight max-w-[80px]">
              Championship_Years: <br/>
              <span className="text-red-600 font-bold font-extrabold">{driver.years}</span>
            </p>
          </div>

          {/* DATA OVERLAY */}
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <span className="text-[8px] md:text-[10px] font-mono text-white/40 uppercase tracking-widest block mb-1">
              Driver_Profile
            </span>
            <h3 className="text-[10px] md:text-3xl font-black uppercase italic text-white tracking-tighter leading-none group-hover:tracking-wider transition-all">
              {driver.name}
            </h3>
          </div>
        </motion.div>
      ))}
    </div>
  </div>

  <footer className="pb-8 px-8 md:px-16 z-30 shrink-0">
    <div className="flex justify-between items-end border-t border-white/10 pt-6">
      <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Archive_System_Verified</span>
      <span className="text-[10px] font-mono text-red-600 animate-pulse">● DATA_LIVE</span>
    </div>
  </footer>
</section>

       {/* 10. REGULATION TIMELINE - STATIC TECHNICAL GRID */}
<section className="relative min-h-screen bg-[#050505] flex flex-col py-16 md:py-24 px-6 overflow-hidden border-t border-white/5">
  
  {/* SECTION HEADER */}
  <div className="max-w-7xl mx-auto w-full mb-16 md:mb-24">
    <div className="flex items-center gap-4 mb-4">
      <div className="h-px w-12 bg-red-600" />
      <span className="text-[10px] font-mono tracking-[0.4em] text-red-600 uppercase">Evolution_Registry.v2</span>
    </div>
    <h2 className="text-5xl md:text-8xl font-black italic tracking-tighter text-white uppercase leading-[0.8]">
      TECH_<span className="text-red-600">HISTORY</span>
    </h2>
  </div>

  {/* THE DATA GRID: No internal scroll, just clean layout */}
  <div className="max-w-7xl mx-auto w-full relative">
    
    {/* VERTICAL SPINE (Desktop Only for clean look) */}
    <div className="absolute left-[140px] top-0 bottom-0 w-px bg-white/10 hidden md:block" />

    <div className="space-y-12 md:space-y-20">
      {timelineData.map((item, idx) => (
        <div key={idx} className="relative group grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 md:gap-16 items-start">
          
          {/* YEAR - Large, Brutalist Typography */}
          <div className="md:text-right md:pr-10 shrink-0">
            <span className="text-4xl md:text-6xl font-black italic text-zinc-800 group-hover:text-white transition-colors duration-500 leading-none">
              {item.year}
            </span>
            {/* Mobile-only accent line */}
            <div className="h-px w-8 bg-red-600 mt-2 md:hidden" />
          </div>

          {/* CONTENT CARD */}
          <div className="relative border-l border-white/10 md:border-l-0 pl-6 md:pl-0">
            

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono text-red-600 px-2 py-0.5 border border-red-600/30 uppercase tracking-widest">
                  {item.tag}
                </span>
                <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                  ID: {item.short}
                </span>
              </div>

              <h3 className="text-2xl md:text-4xl font-black text-zinc-100 uppercase italic tracking-tighter leading-tight group-hover:text-red-600 transition-colors">
                {item.t}
              </h3>

              <p className="text-sm md:text-lg text-zinc-500 font-serif italic leading-relaxed max-w-2xl">
                "{item.d}"
              </p>

              {/* TECHNICAL ACCENT - Looks like a blueprint detail */}
              <div className="pt-4 flex gap-8 opacity-40 group-hover:opacity-100 transition-opacity">
                <div className="text-[8px] font-mono uppercase text-zinc-500">
                  <span className="text-white block">Status</span> Verified_Entry
                </div>
                <div className="text-[8px] font-mono uppercase text-zinc-500">
                  <span className="text-white block">Regulation</span> FIA_STD_{item.year}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>

  {/* TERMINATOR LINE */}
  <div className="max-w-7xl mx-auto w-full mt-32 border-t border-white/5 pt-8 flex justify-between items-center">
    <span className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest">Data_Stream_Terminated</span>
    <div className="flex gap-2">
      <div className="w-1 h-1 bg-red-600" />
      <div className="w-1 h-1 bg-zinc-800" />
      <div className="w-1 h-1 bg-zinc-800" />
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
          The <span className="text-red-600">Hall of Fame</span>
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
          {[1,2,3,4,5].map(dot => <div key={dot} className="w-1 h-1 bg-zinc-800 rounded-full" />)}
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

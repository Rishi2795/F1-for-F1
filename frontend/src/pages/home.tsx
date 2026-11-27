import { DriverSilhouette } from "../components/ui/driversilhouette";
import { useDriverImages } from "../lib/driverimages";
import { hideBroken } from "../lib/images";
import { useState, useRef } from "react";
import { useHomeScenes } from "../lib/homescenes";
import { SceneDots } from "../components/home/scenedots";
import { TechTimeline, TechTimelineMobile } from "../components/home/techtimeline";
import { motion, useReducedMotion } from "framer-motion";
import Hero from "../components/home/hero";
import React from "react";



export default function Home() {
  const still = useReducedMotion();
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
    useHomeScenes(); // full-screen scenes that snap and ease in (laptop-sized screens)

    return (
      <div className="bg-black text-slate-100 selection:bg-red-600/30 selection:text-red-500 min-h-screen">
        
        <div ref={containerRef} className="relative w-full">
          
       <SceneDots />
       <Hero />

        {/* 09. TECHNICAL NARRATIVE - EDITORIAL HUD */}
<section data-scene data-title="The 2026 cars" className="home-scene relative min-h-[100svh] w-full flex items-center bg-[#050505] py-8 md:py-14 px-6 lg:px-24 overflow-hidden">
  
  {/* Subtly Textured Background */}
  <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
    style={{ backgroundImage: `radial-gradient(#fff 1px, transparent 1px)`, backgroundSize: '50px 50px' }} 
  />

  <div className="max-w-[1100px] mx-auto w-full relative">
    
    <div className="flex flex-col lg:grid lg:grid-cols-12 items-start gap-6 lg:gap-0">
      
      {/* LEFT: The Narrative Core */}
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="lg:col-span-7 z-20 space-y-5 md:space-y-10"
      >
        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-4">
            <span className="text-[9px] md:text-[10px] font-mono tracking-[0.4em] md:tracking-[0.6em] text-zinc-400 uppercase">Ref_Archive_2026</span>
            <div className="h-[1px] w-12 md:w-16 bg-zinc-900" />
          </div>

          {/* FLUID TYPOGRAPHY: Adjusted for mobile visibility */}
          <h2 className="text-[clamp(2.75rem,13vw,3.75rem)] md:text-8xl lg:text-9xl font-serif text-white tracking-tight leading-[0.85] uppercase">
            The <br />
            <span className="text-red-500">Physics</span> <br />
            Reset
          </h2>
        </div>

        <div className="max-w-md space-y-5 md:space-y-10">
          <p className="text-base md:text-2xl text-zinc-400 font-serif leading-snug md:leading-relaxed tracking-tight">
            A total technical departure. Modeling the interaction between 100% sustainable fuels and active aero in real-time.
          </p>
          
          <div className="flex flex-wrap gap-10 md:gap-16 border-t border-white/5 pt-4 md:pt-10">
            <div className="space-y-2">
              <p className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">Protocol</p>
              <p className="text-[11px] md:text-xs text-white font-mono uppercase tracking-tighter">Z-Active // 2026</p>
            </div>
            <div className="space-y-2">
              <p className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">Efficiency</p>
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
        className="lg:col-span-5 w-full mt-2 lg:mt-40"
      >
        {/* Adjusted padding for mobile (p-6) vs desktop (p-14) */}
        <div className="relative bg-[#070707] border border-white/5 p-4 md:p-14 shadow-2xl">
          
          <div className="space-y-5 md:space-y-10">
            {[
              { label: "Minimum Weight", val: "798", unit: "kg" },
              { label: "Turbo RPM Limit", val: "125", unit: "k" },
              { label: "Peak G-Loading", val: "6.5", unit: "g" }
            ].map((item, i) => (
              <div key={i} className="group">
                <div className="flex justify-between items-end mb-2 md:mb-4">
                  <span className="text-[9px] md:text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                    {item.label}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl md:text-6xl font-serif text-white uppercase tracking-tighter group-hover:text-red-500 transition-colors duration-300">
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

          <div className="mt-5 md:mt-14 flex justify-between items-center">
            <div className="flex gap-1.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-1 h-1 bg-red-900/40" />
              ))}
            </div>
            <span className="text-[8px] md:text-[9px] font-mono text-zinc-500 tracking-[0.3em] md:tracking-[0.5em] uppercase">Tech_Spec_V.09</span>
          </div>
        </div>
      </motion.div>

    </div>
  </div>
</section>
{/* 09.5 THE PINNACLE - COMPACT OPTIMIZATION */}
<section data-scene data-title="Engineering" className="home-scene relative w-full flex items-center bg-[#050505] py-6 md:py-8 px-4 md:px-12 lg:px-24 border-b border-white/5 overflow-hidden">
  
  {/* Layer 1: Minimalist Texture */}
  <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
    style={{ backgroundImage: `radial-gradient(#fff 1px, transparent 1px)`, backgroundSize: '40px 40px' }} 
  />

  <div className="max-w-[1200px] mx-auto w-full border border-white/5 relative z-10 bg-[#070707]/60 flex flex-col">
    
    {/* HEADER BLOCK - Optimized Height */}
    <div className="border-b border-white/5 p-4 md:p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-red-600" />
          <span className="text-[8px] md:text-[10px] font-mono tracking-[0.4em] text-zinc-400 uppercase">Ref_09.5</span>
        </div>
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif text-white uppercase leading-[0.85] tracking-tighter">
          Engineering <br />
          <span className="text-red-500">Marvel</span>
        </h2>
      </div>
      <div className="font-mono text-[8px] text-zinc-500 uppercase tracking-widest hidden sm:block border-l border-white/5 pl-6 mb-1">
        Maranello_HQ // 44.82° N
      </div>
    </div>

    {/* CONTENT GRID - Flexible Growth */}
    <div className="grid grid-cols-1 lg:grid-cols-12 flex-1">
      
      {/* LEFT: NARRATIVE (7 Columns) */}
      <div className="lg:col-span-7 border-b lg:border-b-0 lg:border-r border-white/5 p-4 md:p-6 flex flex-col justify-between gap-5">
        <p className="text-lg md:text-2xl lg:text-3xl font-serif leading-tight text-zinc-300 tracking-tight">
          "F1 is the world's fastest laboratory. A convergence of <span className="text-white underline decoration-red-600 decoration-1 underline-offset-4">sovereign wealth</span> and aerospace engineering."
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div className="space-y-4">
            <p className="text-[10px] md:text-xs text-zinc-500 font-mono leading-relaxed uppercase tracking-tighter max-w-[280px]">
              Since 2021, focus shifted from "Who spends" to "Who optimizes." Every gram is a line item.
            </p>
            <div className="flex gap-4">
              <div className="flex-1 border-l border-zinc-800 pl-3 py-1">
                <span className="block text-[7px] font-mono text-zinc-400 uppercase mb-1">R&D Cap</span>
                <span className="text-xl font-serif text-white">$135M</span>
              </div>
              <div className="flex-1 border-l border-zinc-800 pl-3 py-1">
                <span className="block text-[7px] font-mono text-zinc-400 uppercase mb-1">Data/Sec</span>
                <span className="text-xl font-serif text-white">1.1M</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: DATA VISUAL (5 Columns) */}
      <div className="lg:col-span-5 p-4 md:p-6 bg-black/20 flex flex-col justify-between gap-5">
        <h3 className="font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-3">
          <span className="w-6 h-[1px] bg-red-900" /> Capital_Allocation
        </h3>

        <div className="space-y-5 md:space-y-6">
          {[
            { label: "Constructor", val: 45, color: "bg-red-600" },
            { label: "Partnerships", val: 35, color: "bg-zinc-200" },
            { label: "Broadcast", val: 20, color: "bg-zinc-800" }
          ].map((item, i) => (
            <div key={i} className="group">
              <div className="flex justify-between items-end mb-2">
                <div className="space-y-1">
                  <span className="block text-[7px] font-mono text-zinc-500 uppercase tracking-widest">Index_0{i+1}</span>
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

        <div className="flex justify-between items-center pt-2">
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
<section data-scene data-title="The reign" className="home-scene relative h-[100svh] w-full bg-[#030303] flex flex-col justify-between overflow-hidden border-t border-white/5">
  
  <header className="pt-8 md:pt-12 px-8 md:px-16 z-30 shrink-0">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-1.5 h-4 bg-red-600 shadow-[0_0_12px_#dc2626]" />
      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.5em] font-bold">Registry // Hall_Of_Fame</span>
    </div>
    <h2 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter text-white leading-[0.85]">
      THE <span className="text-red-500">REIGN</span>
    </h2>
  </header>

  <div className="flex-grow flex items-end justify-center px-4 md:px-10 pb-10 relative">
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.02] pointer-events-none">
      <span className="text-[22vw] font-black italic text-white">DYNASTY</span>
    </div>

    {/* PODIUM GRID */}
    <ReignBento />
    <div className="hidden md:flex items-end justify-center gap-2 md:gap-4 w-full max-w-6xl h-full max-h-[450px] md:max-h-[550px] z-10">
      {REIGN.map((driver, i) => (
        <motion.div
          key={driver.code}
          className={`relative flex-1 ${driver.h} min-w-[100px] bg-zinc-900/40 border border-white/10 group overflow-hidden`}
        >
          {/* PORTRAIT LAYER */}
          <div className="absolute inset-0 w-full h-full">
            <ReignPortrait d={driver} i={i} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          </div>

          {/* 7x / 4x BADGE */}
          <div className="absolute top-3 left-3 md:top-5 md:left-5 z-30">
            <div className="bg-black/40 border border-white/10 px-2 py-1 rounded-sm">
              <span className="text-lg md:text-2xl font-black italic text-white group-hover:text-red-500 transition-colors">
                {driver.titles}
              </span>
            </div>
          </div>

          {/* HOVER REVEAL: TITLE YEARS */}
          <div className="absolute top-3 right-3 md:top-5 md:right-5 z-30 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
            <p className="text-[10px] md:text-[9px] font-mono text-zinc-400 text-right uppercase leading-tight max-w-[80px]">
              Championship_Years: <br/>
              <span className="text-red-500 font-bold">{driver.years}</span>
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
      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Archive_System_Verified</span>
      <span className="text-[10px] font-mono text-red-500 animate-pulse">● DATA_LIVE</span>
    </div>
  </footer>
</section>

       {/* 10. REGULATION TIMELINE - STATIC TECHNICAL GRID */}
<section data-scene data-title="Tech history" className="home-scene relative min-h-[100svh] bg-[#050505] flex flex-col justify-center py-10 lg:py-8 px-6 overflow-hidden border-t border-white/5">
  
  {/* SECTION HEADER */}
  <div className="max-w-7xl mx-auto w-full mb-5 md:mb-8 lg:mb-8">
    <div className="flex items-center gap-4 mb-3">
      <div className="h-px w-12 bg-red-600" />
      <span className="text-[10px] font-mono tracking-[0.4em] text-red-500 uppercase">Evolution_Registry.v2</span>
    </div>
    <h2 className="text-5xl md:text-7xl lg:text-7xl font-black italic tracking-tighter text-white uppercase leading-[0.8]">
      TECH_<span className="text-red-500">HISTORY</span>
    </h2>
  </div>

  {/* THE DATA GRID: No internal scroll, just clean layout */}
  <div className="max-w-7xl mx-auto w-full relative">
    <TechTimeline items={timelineData} />
    <TechTimelineMobile items={timelineData} />
  </div>

</section>
    

        {/* 12. DRIVER SPECIFICATIONS - REFINED BLADE MODE */}
<section data-scene data-title="Hall of fame" className="home-scene relative py-12 md:py-12 bg-[#050505] overflow-hidden flex flex-col justify-center">
  <div className="max-w-[1400px] mx-auto w-full px-6 md:px-12">
    
    {/* Header */}
    <div className="mb-8 md:mb-8 flex items-end justify-between border-b border-white/5 pb-5">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">Archive_Access</span>
        <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter">
          The <span className="text-red-500">Hall of Fame</span>
        </h2>
      </div>
    </div>

    {/* CAROUSEL TRACK */}
    <div className="
      /* Mobile: Increased height to 550px so images aren't cut off */
      flex flex-nowrap overflow-x-auto snap-x snap-mandatory pb-6 -mx-6 px-10 h-[clamp(300px,56svh,550px)]
      
      /* Desktop: Fixed container height to prevent 'too big' look */
      md:flex md:flex-row md:overflow-visible md:mx-auto md:px-0 md:h-[clamp(300px,52dvh,480px)] md:justify-center
      [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
    ">
      {driversData.map((d, i) => (
        <motion.div 
          key={i} 
          whileHover="hover"
          initial="rest"
          className="
            /* Mobile: Wider cards for better image visibility */
            w-[min(300px,78vw)] min-w-[min(300px,78vw)] snap-center mr-4
            
            /* Desktop: Blade logic with max-width cap */
            md:mr-0 md:min-w-0 md:flex-1 md:hover:flex-[2.5] 
            md:max-w-[450px] /* Prevents card from taking over the screen */
            md:h-full transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
            relative group overflow-hidden border-l border-white/10 bg-zinc-950
          "
        >
          {/* Background Image: Changed to 70% height on mobile to ensure face is visible */}
          <div className="absolute inset-0 h-[70%] md:h-full transition-transform duration-1000 group-hover:scale-[1.05]">
            <motion.img 
              initial={still ? false : GREY}
              whileInView={COLOUR}
              viewport={{ once: true, amount: 0.35 }}
              transition={reveal(i)}
              src={d.img}
              alt={d.name}
              referrerPolicy="no-referrer"
              onError={hideBroken}
              loading="lazy"
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
              <span className="text-[8px] font-black text-red-500 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity">
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
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">{d.era}</span>
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
       <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Swipe to Decrypt</span>
       <div className="flex gap-1">
          {[1,2,3,4,5].map(dot => <div key={dot} className="w-1 h-1 bg-zinc-800 rounded-full" />)}
       </div>
    </div>

  </div>
</section>

       {/* ================= 13. TECHNICAL RULEBOOK - COMPACT ================= */}
<section data-scene data-title="The rules" className="home-scene relative py-6 md:py-12 px-4 md:px-12 bg-white text-black overflow-hidden flex flex-col justify-center">
  {/* Restricted width for desktop to prevent stretching */}
  <div className="max-w-6xl mx-auto w-full">
    
    {/* Header: Condensed & Technical */}
    <div className="flex flex-col md:flex-row items-baseline justify-between mb-3 md:mb-6 border-b-2 border-black pb-3 md:pb-4 gap-2 md:gap-4">
      <div className="flex items-baseline gap-4">
        <h2 className="text-3xl md:text-5xl font-serif italic tracking-tighter">
          The <span className="font-sans not-italic font-black text-2xl md:text-3xl uppercase opacity-20">Rules</span>
        </h2>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 hidden md:block">
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-200 border border-zinc-200">
      {rules.map((rule, idx) => (
        <div key={idx} className="bg-white p-2 sm:p-6 hover:bg-zinc-50 transition-colors group relative h-full">
           <span className="hidden sm:inline text-[8px] font-mono text-zinc-300 group-hover:text-red-500 transition-colors">0{idx + 1}</span>
           <RuleCard rule={rule} index={idx} />
        </div>
      ))}
    </div>

    {/* Footer Callout: Scaled Down */}
    <div className="mt-3 sm:mt-8 flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4">
      <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest">
        Total Directives: {rules.length} // EOB_LINK
      </span>
      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="bg-black text-white px-5 py-2 sm:px-6 sm:py-3 text-[9px] font-black uppercase tracking-[0.3em] hover:bg-red-600 transition-all"
      >
        Download_Appendix_v4
      </motion.button>
    </div>
  </div>
</section>

{/* The credits footer is the site-wide one in AppLayout. */}
      </div>
    </div>
  );
}

/* ================= 15. SUB-COMPONENTS ================= */

// The reign: the living world champions, most titles first. Antonelli's 2026 title is already decided (the forecast calls it clinched).
// Hamilton and Verstappen keep their original photographs; the others use Formula 1's official portraits (credited in the footer, never copied).
// If a photograph does not load, the official portrait (or a silhouette) takes its place.
type ReignEntry = { code: string; name: string; titles: string; years: string; h: string; glow: string; photo?: string };
const REIGN: ReignEntry[] = [
  { code: "VER", name: "Verstappen", titles: "4x", years: "2021, 2022, 2023, 2024", h: "h-[80%]", glow: "#3b6cf5", photo: "https://i.pinimg.com/736x/2e/1f/a3/2e1fa3c0cc232ed9c7b5a3cab31b12e6.jpg" },
  { code: "HAM", name: "Hamilton", titles: "7x", years: "2008, 2014, 2015, 2017, 2018, 2019, 2020", h: "h-full", glow: "#dc2626", photo: "https://i.pinimg.com/736x/96/8a/4a/968a4a1ae6eff274e6c7f28e8565af20.jpg" },
  { code: "ALO", name: "Alonso", titles: "2x", years: "2005, 2006", h: "h-[68%]", glow: "#10b981" },
  { code: "ANT", name: "Antonelli", titles: "1x", years: "2026", h: "h-[56%]", glow: "#14b8a6" },
];

// The colour reveal used for the photographs on this page: they start grey and dim, then flood with colour (slightly past natural, so it
// "pops") as the scene scrolls into view, settling from a small zoom. Same filter functions in the same order on both ends so it can animate.
const GREY = { filter: "grayscale(1) brightness(0.55) saturate(1)", scale: 1.12 };
const COLOUR = { filter: "grayscale(0) brightness(1) saturate(1.25)", scale: 1 };
const reveal = (i: number) => ({ duration: 1.5, delay: 0.15 + i * 0.16, ease: [0.22, 1, 0.36, 1] as const });

/** A champion's portrait in a glow of their colour: Formula 1's official picture, else a licensed photo, else a silhouette. */
function ReignPortrait({ d, i = 0 }: { d: ReignEntry; i?: number }) {
  const still = useReducedMotion();
  const img = useDriverImages()(d.code, 6);
  const [photoFailed, setPhotoFailed] = useState(false);
  const photo = d.photo && !photoFailed ? d.photo : null;
  return (
    <>
      {!photo && <span aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: `radial-gradient(ellipse 85% 75% at 50% 100%, ${d.glow}77, transparent 72%)` }} />}
      {photo ? (
        <>
          <motion.img src={photo} alt={d.name} referrerPolicy="no-referrer" onError={() => setPhotoFailed(true)} loading="lazy" decoding="async" initial={still ? false : GREY} whileInView={COLOUR} viewport={{ once: true, amount: 0.4 }} transition={reveal(i)} className="absolute inset-0 h-full w-full object-cover object-[50%_15%]" />
          <span aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to top, ${d.glow}55, transparent 55%)` }} />
        </>
      ) : img?.kind === "official" ? (
        <motion.img src={img.url} alt={d.name} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={hideBroken} initial={still ? false : { ...GREY, scale: 1.3 }} whileInView={{ ...COLOUR, scale: 1.18 }} viewport={{ once: true, amount: 0.4 }} transition={reveal(i)} className="absolute inset-0 h-full w-full origin-top object-cover object-[50%_6%]" />
      ) : img?.kind === "licensed" ? (
        <img src={`/drivers/${img.photo.file}`} alt={d.name} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-top" />
      ) : (
        <DriverSilhouette color={d.glow} className="absolute bottom-0 left-1/2 h-[80%] w-[90%] -translate-x-1/2" />
      )}
    </>
  );
}


/** Phones: the champions as a bento, the most decorated one large on top and the other two side by side beneath, with the years
 *  always shown (there is no hover on a phone). */
function ReignBento() {
  const order = [...REIGN].sort((x, y) => parseInt(y.titles) - parseInt(x.titles)); // most titles first
  return (
    <div className="z-10 grid h-full max-h-[560px] w-full grid-cols-3 grid-rows-[1.25fr_1fr] gap-2 md:hidden">
      {order.map((d, i) => (
        <motion.figure
          key={d.code}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08, duration: 0.5 }}
          className={`relative m-0 overflow-hidden border border-white/10 bg-zinc-900 ${i === 0 ? "col-span-3" : ""}`}
        >
          <ReignPortrait d={d} i={i} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          <span aria-hidden="true" className={`absolute right-2 top-1 font-black italic leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.75)] ${i === 0 ? "text-[5.5rem]" : "text-[2.6rem]"}`}>{d.titles}</span>
          <span className="absolute left-2 top-2 border border-white/20 bg-black/60 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-white">P{i + 1}</span>
          <figcaption className="absolute inset-x-2 bottom-2">
            <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-red-400 sm:text-[9px]">{d.titles === "1x" ? "1 title" : `${d.titles.replace("x", "")} titles`}</p>
            <h3 className={`font-black uppercase italic leading-none tracking-tighter text-white ${i === 0 ? "text-3xl" : "text-[0.95rem]"}`}>{d.name}</h3>
            <p className={`mt-1 font-mono leading-snug text-zinc-300 ${i === 0 ? "text-[9px]" : "text-[8px]"}`}>{d.years.split(", ").join(" · ")}</p>
          </figcaption>
        </motion.figure>
      ))}
    </div>
  );
}

type Rule = { category: string; title: string; short: string; detail: string };

function RuleCard({ rule, index }: { rule: Rule, index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  // Opening a card used to animate its height (and, on laptops, on every hover), which re-flowed the whole grid on every frame. It now
  // opens on a click or tap only, all at once, with a fade (compositor-only), so nothing is re-laid-out while it moves.
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      onClick={() => setIsOpen((o) => !o)}
      className="group relative flex h-full w-full cursor-pointer flex-col overflow-hidden border-b border-zinc-100 bg-white p-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 sm:p-5 md:p-6"
    >
      <span className="mb-1.5 flex items-start justify-between sm:mb-3">
        <span className="border border-zinc-200 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-zinc-400 transition-colors group-hover:border-red-600/20 group-hover:text-red-500 md:text-[8px]">
          {rule.category}
        </span>
        <span aria-hidden="true" className="font-mono text-sm leading-none text-red-500 sm:hidden">{isOpen ? "−" : "+"}</span>
        <span className="hidden font-mono text-[10px] text-zinc-300 transition-colors group-hover:text-black sm:inline">
          // {index + 1 < 10 ? `0${index + 1}` : index + 1}
          <span aria-hidden="true" className="ml-2 text-sm leading-none text-red-500">{isOpen ? "−" : "+"}</span>
        </span>
      </span>

      <span className="block text-xs font-black uppercase leading-tight tracking-tighter text-black md:text-sm">{rule.title}</span>

      {isOpen && (
        <span className="f1-rise mt-3 block space-y-3 border-t border-zinc-100 pt-3">
          <span className="block border-l-2 border-red-600 pl-3 font-serif text-[11px] italic leading-relaxed text-zinc-500 md:text-xs">{rule.short}</span>
          <span className="block text-[10px] font-bold uppercase leading-snug tracking-tight text-zinc-500">{rule.detail}</span>
        </span>
      )}
    </button>
  );
}

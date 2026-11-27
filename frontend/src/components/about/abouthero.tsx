import { Orbs } from "../ui/orbs";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { fractionAtMs, readingAt } from "../../lib/telemetry";
import { pointAt } from "../../lib/trackmap";
import type { CircuitDoc, TelemetryDoc } from "../../types/api";

/** Drivers' fastest laps raced against each other, a few colours to tell them apart. */
const COLOURS = ["#ef4444", "#2dd4bf", "#fb923c", "#60a5fa", "#facc15", "#c084fc"];
const RATE = 3.2; // the laps run this many times faster than real life
const HOLD_MS = 1800; // the winner waits at the line before the next start
const FALLBACK = Array.from({ length: 120 }, (_, i) => [500 + 380 * Math.cos((i / 120) * 2 * Math.PI), 500 + 300 * Math.sin((i / 120) * 2 * Math.PI) * (1 + 0.25 * Math.cos((i / 120) * 6 * Math.PI))]);

const line: Variants = { hidden: { y: "108%" }, show: (i: number) => ({ y: 0, transition: { duration: 0.9, delay: 0.25 + i * 0.12, ease: [0.22, 1, 0.36, 1] } }) };
const fade: Variants = { hidden: { opacity: 0, y: 14 }, show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.9 + i * 0.1, ease: "easeOut" } }) };

/** The first thing on the About page: the headline, and the real circuit with real fastest laps racing round it. The track
 *  outline, the speeds and the gears all come from the published data; nothing on it is made up. */
export function AboutHero() {
  const still = useReducedMotion();
  const circuit = useApi<CircuitDoc>("/circuits/silverstone").data;
  const latest = circuit?.races.length ? [...circuit.races].sort((a, b) => b.season - a.season || b.round - a.round)[0] : null;
  const telemetry = useApi<TelemetryDoc>(latest ? `/seasons/${latest.season}/races/${latest.round}/telemetry` : null).data;
  const outline = circuit?.outline?.points ?? FALLBACK;
  const racers = telemetry ? [...telemetry.drivers].sort((a, b) => a.time_s - b.time_s).slice(0, COLOURS.length) : [];

  const dots = useRef<(SVGGElement | null)[]>([]);
  const [hud, setHud] = useState<{ order: { code: string; i: number }[]; speed: number; gear: number; throttle: number; brake: boolean } | null>(null);
  const pathD = `${outline.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ")} Z`;

  useEffect(() => {
    if (!racers.length) return;
    const lead = racers[0];
    const lapMs = lead.time_s * 1000;
    let raf = 0;
    let start: number | null = null;
    let lastHud = 0;
    const place = (ms: number, frame: number) => {
      const fr = racers.map((d, i) => ({ i, code: d.code, f: fractionAtMs(d, Math.min(ms, d.time_s * 1000)) }));
      fr.forEach(({ i, f }) => {
        const g = dots.current[i];
        if (!g) return;
        const [x, y] = pointAt(outline, f >= 1 ? 0 : f);
        g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      });
      if (frame - lastHud > 90) {
        lastHud = frame;
        const r = readingAt(lead, fractionAtMs(lead, Math.min(ms, lapMs)));
        setHud({ order: [...fr].sort((a, b) => b.f - a.f).map(({ code, i }) => ({ code, i })), speed: r.speed, gear: r.gear, throttle: r.throttle, brake: r.brake });
      }
    };
    if (still) {
      place(lapMs * 0.34, 0);
      return;
    }
    const tick = (now: number) => {
      start ??= now;
      const cycle = lapMs / RATE + HOLD_MS;
      const e = (now - start) % cycle;
      place(Math.min(e * RATE, lapMs), now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [telemetry, still]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="relative isolate overflow-hidden border-b border-white/5 bg-[#050505] pt-28 pb-20 md:pt-36">
      {/* moving speed lines, a dot grid and a red glow: depth without a picture */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
        {!still && [12, 27, 41, 58, 73, 88].map((top, i) => (
          <motion.span key={top} className="absolute h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" style={{ top: `${top}%`, width: `${22 + (i % 3) * 14}%` }} initial={{ left: "-40%" }} animate={{ left: "120%" }} transition={{ duration: 5 + i * 1.3, repeat: Infinity, ease: "linear", delay: i * 0.9 }} />
        ))}
        <motion.div className="absolute -right-40 top-10 h-[34rem] w-[34rem] rounded-full bg-red-600/20 blur-[140px]" animate={still ? undefined : { opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 7, repeat: Infinity }} />
      </div>

      <div className="page grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <motion.p initial="hidden" animate="show" variants={fade} custom={-6} className="mb-6 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.4em] text-zinc-400">
            <span aria-hidden="true" className="h-2 w-2 animate-pulse bg-red-600" />F1 for F1 · the data desk
          </motion.p>
          <h1 className="text-[clamp(3.2rem,9vw,7.5rem)] font-black uppercase italic leading-[0.88] tracking-tighter">
            <span className="block overflow-hidden pb-[0.08em]"><motion.span className="block text-white" initial="hidden" animate="show" variants={line} custom={0}>The race,</motion.span></span>
            <span className="block overflow-hidden pb-[0.08em]"><motion.span className="block text-transparent [-webkit-text-stroke:2px_#ef4444]" initial="hidden" animate="show" variants={line} custom={1}>explained.</motion.span></span>
          </h1>
          <motion.p initial="hidden" animate="show" variants={fade} custom={0} className="mt-8 max-w-xl border-l-2 border-red-600 pl-5 text-lg leading-relaxed text-zinc-300">
            Every race since 2019, taken apart: who was really fast, which strategy worked, where a race was won or lost. Free, no login, and honest about what the data can and cannot say.
          </motion.p>
          <motion.div initial="hidden" animate="show" variants={fade} custom={1} className="mt-9 flex flex-wrap gap-3">
            <Link to="/explore" className="group inline-flex items-center gap-3 bg-red-500 px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.25em] text-black transition hover:bg-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Explore the races <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link to="/forecast" className="inline-flex items-center border border-white/20 px-7 py-4 font-mono text-xs font-bold uppercase tracking-[0.25em] text-white transition hover:border-white hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">
              Next race forecast
            </Link>
          </motion.div>
        </div>

        {/* the racing panel */}
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }} className="glass relative mx-auto w-full max-w-[34rem] p-3">
          <svg viewBox="0 0 1000 1000" role="img" aria-label={`The ${circuit?.name ?? "circuit"} with fastest laps racing round it`} className="block w-full">
            <motion.path d={pathD} fill="none" stroke="#1f1f23" strokeWidth="46" strokeLinejoin="round" initial={{ pathLength: still ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: "easeInOut" }} />
            <motion.path d={pathD} fill="none" stroke="#ef4444" strokeOpacity="0.9" strokeWidth="3" strokeLinejoin="round" strokeDasharray="10 10" initial={{ pathLength: still ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.2, ease: "easeInOut", delay: 0.2 }} />
            {(() => { const [sx, sy] = pointAt(outline, 0); const [nx, ny] = pointAt(outline, 0.01); const n = Math.hypot(nx - sx, ny - sy) || 1; return <line x1={sx - ((ny - sy) / n) * 30} y1={sy + ((nx - sx) / n) * 30} x2={sx + ((ny - sy) / n) * 30} y2={sy - ((nx - sx) / n) * 30} stroke="#fff" strokeWidth="6" />; })()}
            {racers.map((d, i) => (
              <g key={d.code} ref={(el) => { dots.current[i] = el; }} transform="translate(-100 -100)">
                <circle r={i === 0 ? 24 : 17} fill={COLOURS[i]} fillOpacity="0.22" />
                <circle r={i === 0 ? 11 : 8} fill={COLOURS[i]} stroke="#0a0a0a" strokeWidth="3" />
              </g>
            ))}
          </svg>

          {hud && telemetry && latest ? (
            <div className="mt-1 grid grid-cols-[1fr_auto] gap-4 border-t border-white/10 p-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-500">{latest.season} {circuit?.name} · fastest laps, replayed {RATE}× · readings from {racers[0].code}’s lap</p>
                <ol aria-label="Running order of the replayed laps" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
                  {hud.order.map((o, rank) => <li key={o.code} className="flex items-center gap-1.5 text-zinc-300"><span className="text-zinc-500">{rank + 1}</span><span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOURS[o.i] }} />{o.code}</li>)}
                </ol>
              </div>
              <dl className="grid grid-cols-3 gap-3 text-right font-mono">
                <div><dt className="text-[8px] uppercase tracking-[0.2em] text-zinc-500">km/h</dt><dd className="text-2xl font-bold tabular-nums text-white">{Math.round(hud.speed)}</dd></div>
                <div><dt className="text-[8px] uppercase tracking-[0.2em] text-zinc-500">gear</dt><dd className="text-2xl font-bold tabular-nums text-white">{hud.gear || "N"}</dd></div>
                <div><dt className="text-[8px] uppercase tracking-[0.2em] text-zinc-500">{hud.brake ? "brake" : "throttle"}</dt><dd className={`text-2xl font-bold tabular-nums ${hud.brake ? "text-red-400" : "text-emerald-300"}`}>{hud.brake ? "ON" : `${Math.round(hud.throttle)}%`}</dd></div>
              </dl>
            </div>
          ) : (
            <p className="flex items-center gap-3 p-3 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500"><Orbs /> Loading the circuit</p>
          )}
        </motion.div>
      </div>

      <motion.a href="#what" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 font-mono text-[9px] uppercase tracking-[0.4em] text-zinc-500 hover:text-white md:flex">
        Scroll
        <motion.span aria-hidden="true" animate={still ? undefined : { y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity }} className="block h-6 w-px bg-red-500" />
      </motion.a>
    </section>
  );
}

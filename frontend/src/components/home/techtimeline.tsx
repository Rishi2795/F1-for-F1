import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

const SLIDE = {
  enter: (d: number) => ({ x: d * 70, opacity: 0, rotateY: d * 18 }),
  centre: { x: 0, opacity: 1, rotateY: 0 },
  exit: (d: number) => ({ x: d * -70, opacity: 0, rotateY: d * -18 }),
};

export type Era = { year: string; t: string; d: string; tag: string; short: string };

/** The history of F1 technology as one big, readable panel at a time: a rail of eras along the top (click or use the arrow keys), and the
 *  chosen era below in large type, with its year drawn huge behind. Laptop-sized screens and up; smaller screens keep the stacked list. */
export function TechTimeline({ items }: { items: Era[] }) {
  const [i, setI] = useState(items.length - 1); // open on the newest era: the one the rest of the page is about
  const still = useReducedMotion();
  const era = items[i];
  const go = (n: number) => setI((n + items.length) % items.length);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); }
    else if (e.key === "Home") { e.preventDefault(); go(0); }
    else if (e.key === "End") { e.preventDefault(); go(items.length - 1); }
  };

  return (
    <div className="hidden space-y-8 lg:block">
      {/* the rail: every era, the chosen one lit, a red line filling up to it */}
      <div role="tablist" aria-label="Eras of F1 technology" onKeyDown={onKey} className="relative grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        <span aria-hidden="true" className="absolute left-0 right-0 top-[1.1rem] h-px bg-white/15" />
        <span aria-hidden="true" className="absolute left-0 top-[1.1rem] h-px bg-red-500 shadow-[0_0_10px_#ef4444] transition-[width] duration-700" style={{ width: `${(i / (items.length - 1)) * 100}%` }} />
        {items.map((it, n) => {
          const on = n === i;
          const past = n < i;
          return (
            <button
              key={it.year}
              id={`era-tab-${n}`}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls="era-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => setI(n)}
              className="group relative flex flex-col items-start gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600"
            >
              <span aria-hidden="true" className={`relative z-10 block rounded-full border-2 transition-all duration-500 ${on ? "h-[2.2rem] w-[2.2rem] -translate-y-px border-red-500 bg-red-500/20 shadow-[0_0_24px_#ef4444]" : past ? "mt-[0.45rem] h-[1.3rem] w-[1.3rem] border-red-500 bg-red-500" : "mt-[0.45rem] h-[1.3rem] w-[1.3rem] border-white/30 bg-[#050505] group-hover:border-white"}`} />
              <span className={`font-black italic leading-none transition-all duration-500 ${on ? "text-5xl text-white" : "text-4xl text-zinc-500 group-hover:text-zinc-300"}`}>{it.year}</span>
              <span className={`font-mono text-xs uppercase tracking-[0.25em] transition-colors ${on ? "text-red-400" : "text-zinc-500"}`}>{it.t}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={era.year}
          id="era-panel"
          role="tabpanel"
          aria-labelledby={`era-tab-${i}`}
          initial={still ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={still ? undefined : { opacity: 0, y: -16 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative grid items-center gap-10 border border-white/10 bg-white/[0.02] p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:p-10"
        >
          <span aria-hidden="true" className="pointer-events-none select-none font-serif text-[clamp(6rem,13vw,11rem)] font-black italic leading-[0.85] text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.18)]">{era.year}</span>
          <div className="space-y-5">
            <p className="flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-[0.25em]">
              <span className="border border-red-600/50 px-2.5 py-1 text-red-400">{era.tag}</span>
              <span className="text-zinc-400">{era.short}</span>
            </p>
            <h3 className="text-4xl font-black uppercase italic leading-none tracking-tighter text-white xl:text-5xl">{era.t}</h3>
            <p className="max-w-2xl font-serif text-lg italic leading-relaxed text-zinc-300 xl:text-xl">“{era.d}”</p>
            <div className="flex items-center justify-between gap-6 border-t border-white/10 pt-5">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-400">
                <span className="text-white">{String(i + 1).padStart(2, "0")}</span> / {String(items.length).padStart(2, "0")} · FIA_STD_{era.year}
              </p>
              <div className="flex gap-2">
                <button type="button" aria-label="Previous era" onClick={() => go(i - 1)} className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition-colors hover:border-white hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"><ChevronLeft aria-hidden="true" size={20} /></button>
                <button type="button" aria-label="Next era" onClick={() => go(i + 1)} className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition-colors hover:border-white hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"><ChevronRight aria-hidden="true" size={20} /></button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}


/** The phone version: a rail of eras on top, one era at a time below in a card you swipe left and right (or step with the arrows).
 *  Sized to fit one screen, so the page's scenes still snap cleanly. */
export function TechTimelineMobile({ items }: { items: Era[] }) {
  const [[i, dir], set] = useState<[number, number]>([items.length - 1, 0]);
  const still = useReducedMotion();
  const era = items[i];
  const go = (n: number) => {
    const k = Math.min(Math.max(n, 0), items.length - 1);
    if (k !== i) set([k, k > i ? 1 : -1]);
  };
  const btn = "grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition-colors active:bg-white active:text-black disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600";

  return (
    <div className="space-y-4 lg:hidden">
      {/* the rail: tap an era; a red line fills up to the chosen one */}
      <div role="tablist" aria-label="Eras of F1 technology" className="relative grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        <span aria-hidden="true" className="absolute left-[10%] right-[10%] top-[0.55rem] h-px bg-white/15" />
        <span aria-hidden="true" className="absolute left-[10%] top-[0.55rem] h-px bg-red-500 shadow-[0_0_8px_#ef4444] transition-[width] duration-500" style={{ width: `${(i / (items.length - 1)) * 80}%` }} />
        {items.map((it, n) => (
          <button key={it.year} type="button" role="tab" aria-selected={n === i} aria-label={`${it.year}, ${it.t}`} onClick={() => go(n)} className="relative flex flex-col items-center gap-2 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">
            <span aria-hidden="true" className={`block h-3 w-3 rounded-full border-2 transition-all duration-300 ${n === i ? "scale-150 border-red-500 bg-red-500 shadow-[0_0_14px_#ef4444]" : n < i ? "border-red-500 bg-red-500" : "border-white/30 bg-[#050505]"}`} />
            <span className={`font-mono text-[10px] tracking-wider transition-colors ${n === i ? "text-white" : "text-zinc-500"}`}>{it.year}</span>
          </button>
        ))}
      </div>

      <div className="relative h-[clamp(280px,calc(100svh-26rem),440px)]" style={{ perspective: 900 }}>
        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          <motion.article
            key={era.year}
            custom={dir}
            variants={SLIDE}
            initial={still ? false : "enter"}
            animate="centre"
            exit={still ? undefined : "exit"}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50 || info.velocity.x < -400) go(i + 1);
              else if (info.offset.x > 50 || info.velocity.x > 400) go(i - 1);
            }}
            className="absolute inset-0 flex flex-col justify-end gap-3 overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-5"
          >
            <span aria-hidden="true" className="pointer-events-none absolute left-4 top-2 select-none [@media(max-height:720px)]:hidden font-serif text-[clamp(5rem,26vw,7.5rem)] font-black italic leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.28)]">{era.year}</span>
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-red-600/15 blur-3xl" />
            <p className="relative flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]">
              <span className="border border-red-600/50 px-2 py-0.5 text-red-400">{era.tag}</span>
              <span className="text-zinc-400">{era.short}</span>
            </p>
            <h3 className="relative text-4xl font-black uppercase italic leading-[0.9] tracking-tighter text-white">{era.t}</h3>
            <p className="relative font-serif text-[15px] italic leading-relaxed text-zinc-300">“{era.d}”</p>
          </motion.article>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">
          <span className="text-white">{String(i + 1).padStart(2, "0")}</span> / {String(items.length).padStart(2, "0")} · swipe
        </p>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous era" disabled={i === 0} onClick={() => go(i - 1)} className={btn}><ChevronLeft aria-hidden="true" size={18} /></button>
          <button type="button" aria-label="Next era" disabled={i === items.length - 1} onClick={() => go(i + 1)} className={btn}><ChevronRight aria-hidden="true" size={18} /></button>
        </div>
      </div>
    </div>
  );
}

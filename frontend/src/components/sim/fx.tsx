import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, type ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fades and lifts its content in, a beat after its neighbours. Plain content for people who prefer less motion. */
export function Reveal({ children, delay = 0, className = "", y = 16 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  const still = useReducedMotion();
  if (still) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

/** Between the setup and a live race: the screen slides and fades rather than cutting. */
export function Swap({ id, children }: { id: string; children: ReactNode }) {
  const still = useReducedMotion();
  if (still) return <div key={id}>{children}</div>;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4, ease: EASE }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** While the races run: five start lights, then the lights go out and a car races along the track as the count climbs. */
export function RaceProgress({ done, total }: { done: number; total: number }) {
  const still = useReducedMotion();
  const share = Math.max(0, Math.min(1, done / total));
  const lit = Math.min(5, Math.ceil(share * 100)); // the first 5% of the run is the start sequence
  const away = share >= 0.05;
  return (
    <div role="progressbar" aria-label="Simulating races" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} className="glass relative overflow-hidden p-5">
      <div className="flex items-center justify-between gap-4">
        <div aria-hidden="true" className="flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="h-4 w-4 rounded-full border border-red-900 transition-colors duration-150" style={{ backgroundColor: !away && i < lit ? "#ef4444" : "#1c0a0a", boxShadow: !away && i < lit ? "0 0 12px #ef4444" : "none" }} />
          ))}
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-300">{away ? `Race ${Math.min(done, total)} of ${total}` : "Lights…"}</p>
      </div>
      <div aria-hidden="true" className="relative mt-5 h-8">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15" />
        <div className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-red-700 to-red-400" style={{ width: `${share * 100}%`, transition: still ? "none" : "width 200ms linear" }} />
        <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `calc(${share * 100}% - 14px)`, transition: still ? "none" : "left 200ms linear" }}>
          <svg width="28" height="14" viewBox="0 0 28 14" fill="none"><path d="M1 9h5l3-5h9l4 3h5l1 2v3H1V9Z" fill="#ef4444" /><circle cx="8" cy="12" r="2" fill="#fff" /><circle cx="21" cy="12" r="2" fill="#fff" /></svg>
        </div>
        <div className="sim-checker absolute right-0 top-0 h-full w-3 opacity-80" />
      </div>
    </div>
  );
}

/** A burst of falling confetti for a podium. */
export function Confetti() {
  const still = useReducedMotion();
  const bits = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({ x: (i * 97) % 100, delay: (i % 9) * 0.08, drift: ((i * 53) % 60) - 30, hue: ["#ef4444", "#facc15", "#f4f4f5", "#22c55e", "#3b82f6"][i % 5], rot: (i * 71) % 360, size: 5 + (i % 4) * 2 })),
    [],
  );
  if (still) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-full overflow-hidden">
      {bits.map((b, i) => (
        <motion.span key={i} className="absolute top-0 block" style={{ left: `${b.x}%`, width: b.size, height: b.size * 0.5, backgroundColor: b.hue }} initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }} animate={{ y: 420, x: b.drift, opacity: [1, 1, 0], rotate: b.rot + 360 }} transition={{ duration: 2.4, delay: b.delay, ease: "easeIn" }} />
      ))}
    </div>
  );
}

/** A strip of chequered flag, sliding. */
export function ChequeredStrip() {
  return <div aria-hidden="true" className="sim-checker h-3 w-full" />;
}

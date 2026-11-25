import { useMemo } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** A circuit drawn from a real lap, tracing itself in, with a marker running the lap. */
export function TrackArt({ points, lengthM, source, name }: { points: number[][]; lengthM: number; source: string; name: string }) {
  const d = useMemo(() => `${points.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ")} Z`, [points]);
  const [x0, y0] = points[0];
  const [x1, y1] = points[1];
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const lapSeconds = Math.max(6, Math.round(lengthM / 750));
  return (
    <figure className="glass relative p-4">
      <svg viewBox="0 0 1000 1000" role="img" aria-label={`Outline of ${name}, ${(lengthM / 1000).toFixed(2)} kilometres, drawn from a real lap`} className="mx-auto block w-full max-w-[520px]">
        <path d={d} fill="none" stroke="#1f1f22" strokeWidth="34" strokeLinejoin="round" />
        <path d={d} pathLength={1} fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" className="f1-draw" />
        <line x1={x0 - ((y1 - y0) / len) * 26} y1={y0 + ((x1 - x0) / len) * 26} x2={x0 + ((y1 - y0) / len) * 26} y2={y0 - ((x1 - x0) / len) * 26} stroke="#dc2626" strokeWidth="7" />
        {!reduced() && (
          <circle r="13" fill="#dc2626" stroke="#050505" strokeWidth="4">
            <animateMotion dur={`${lapSeconds}s`} repeatCount="indefinite" path={d} />
          </circle>
        )}
      </svg>
      <figcaption className="mt-2 flex flex-wrap justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">
        <span>LENGTH {(lengthM / 1000).toFixed(2)}_KM</span>
        <span>START_LINE ▌ RED</span>
        <span>DRAWN_FROM {source.replace(" ", "_")}</span>
      </figcaption>
    </figure>
  );
}

/** A small outline for a card. */
export function TrackThumb({ points }: { points: number[][] }) {
  const d = `${points.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ")} Z`;
  return (
    <svg viewBox="0 0 1000 1000" aria-hidden="true" className="h-16 w-16 shrink-0 opacity-60 transition-opacity duration-300 group-hover:opacity-100">
      <path d={d} fill="none" stroke="#fff" strokeWidth="26" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={points[0][0]} cy={points[0][1]} r="34" fill="#dc2626" />
    </svg>
  );
}

import { useId, useMemo } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** A circuit as a glowing red line on black, drawn from a real lap: the line traces itself in, then a light runs the lap. */
export function TrackGlow({ points, lengthM, name }: { points: number[][]; lengthM: number; name: string }) {
  const id = useId();
  const d = useMemo(() => `${points.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ")} Z`, [points]);
  const [x0, y0] = points[0];
  const [x1, y1] = points[1];
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = (-(y1 - y0) / len) * 30;
  const ny = ((x1 - x0) / len) * 30;
  const lapSeconds = Math.max(7, Math.round(lengthM / 700));
  return (
    <figure className="relative overflow-hidden rounded-sm border border-white/10 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.16),transparent_65%)] p-4 sm:p-8">
      <svg viewBox="0 0 1000 1000" role="img" aria-label={`Outline of ${name}, ${(lengthM / 1000).toFixed(2)} kilometres, drawn from a real lap`} className="mx-auto block max-h-[60svh] w-full max-w-[560px]">
        <defs>
          <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        {/* soft glow underneath, then the crisp line */}
        <path d={d} pathLength={1} fill="none" stroke="#dc2626" strokeOpacity="0.75" strokeWidth="26" strokeLinejoin="round" strokeLinecap="round" filter={`url(#${id}-glow)`} className="f1-draw" />
        <path d={d} pathLength={1} fill="none" stroke="#ef4444" strokeWidth="11" strokeLinejoin="round" strokeLinecap="round" className="f1-draw" />
        <line x1={x0 - nx} y1={y0 - ny} x2={x0 + nx} y2={y0 + ny} stroke="#fff" strokeWidth="7" />
        {!reduced() && (
          <g>
            <circle r="26" fill="#fff" fillOpacity="0.25" filter={`url(#${id}-glow)`}>
              <animateMotion dur={`${lapSeconds}s`} repeatCount="indefinite" path={d} />
            </circle>
            <circle r="9" fill="#fff">
              <animateMotion dur={`${lapSeconds}s`} repeatCount="indefinite" path={d} />
            </circle>
          </g>
        )}
      </svg>
    </figure>
  );
}

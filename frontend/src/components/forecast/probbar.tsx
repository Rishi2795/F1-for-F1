import type { CSSProperties } from "react";
import { pct } from "../../lib/forecast";

/** A probability as a number and a flat bar. The leader's bar is red; the rest are white. */
export function ProbBar({ value, lead = false, delay = 0, label }: { value: number; lead?: boolean; delay?: number; label: string }) {
  return (
    <div role="img" aria-label={`${label}: ${pct(value)}`} className="flex items-center gap-3">
      <span className="w-14 text-right font-serif text-xl text-white">{pct(value)}</span>
      <span aria-hidden="true" className="relative h-1.5 w-full min-w-[3rem] bg-white/10">
        <span
          className={`f1-grow-x absolute inset-y-0 left-0 ${lead ? "bg-red-600" : "bg-white"}`}
          style={{ width: `${Math.max(value * 100, 0.8)}%`, "--d": `${delay}ms` } as CSSProperties}
        />
      </span>
    </div>
  );
}

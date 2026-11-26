import type { CSSProperties } from "react";

/** A 0-10 score as a number and a flat bar. */
export function ScoreBar({ value, label, delay = 0, hot = false }: { value: number; label: string; delay?: number; hot?: boolean }) {
  return (
    <div role="img" aria-label={`${label}: ${value.toFixed(1)} out of 10`} className="flex items-center gap-3">
      <span className="w-10 text-right font-serif text-xl text-white">{value.toFixed(1)}</span>
      <span aria-hidden="true" className="relative h-1.5 w-full min-w-[3rem] bg-white/10">
        <span className={`f1-grow-x absolute inset-y-0 left-0 ${hot ? "bg-red-600" : "bg-white"}`} style={{ width: `${value * 10}%`, "--d": `${delay}ms` } as CSSProperties} />
      </span>
    </div>
  );
}

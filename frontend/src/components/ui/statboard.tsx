import type { ReactNode } from "react";
import { useCountUp } from "../../hooks/useCountUp";

export type BoardItem = {
  label: string;
  /** a number counts up to its value (shown through `format`); text is shown as it is */
  value: number | string;
  format?: (n: number) => string;
  sub?: ReactNode;
  /** the main result: a white board with black type, so the eye lands on it first */
  headline?: boolean;
};

function Value({ value, format }: { value: number | string; format?: (n: number) => string }) {
  const shown = useCountUp(typeof value === "number" ? value : 0, 900);
  if (typeof value === "string") return <>{value}</>;
  const f = format ?? ((n: number) => String(Math.round(n)));
  return (
    <>
      <span className="sr-only">{f(value)}</span>
      <span aria-hidden="true" className="tabular-nums">{f(shown)}</span>
    </>
  );
}

/** The summary boards from the standings page, as one component: a hairline grid of tiles, each with a small tracked label,
 *  a big number and a line of context. The headline tile is a white board. */
export function StatBoard({ items, label, className = "" }: { items: BoardItem[]; label: string; className?: string }) {
  const cols = items.length >= 5 ? "grid-cols-2 md:grid-cols-5" : items.length === 4 ? "grid-cols-2 md:grid-cols-4" : items.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2";
  return (
    <section aria-label={label} className={`grid ${cols} gap-px overflow-hidden rounded-sm border border-white/10 bg-white/10 ${className}`}>
      {items.map((it) => (
        <div key={it.label} className={it.headline ? "bg-white px-5 py-4 text-black" : "glass-cell px-5 py-4"}>
          <p className={`font-mono text-[10px] uppercase tracking-[0.3em] ${it.headline ? "text-zinc-600" : "text-zinc-400"}`}>{it.label}</p>
          <p className={`mt-2 truncate font-serif text-3xl md:text-4xl ${it.headline ? "text-black" : "text-white"}`}><Value value={it.value} format={it.format} /></p>
          {it.sub && <p className={`truncate text-xs ${it.headline ? "text-zinc-700" : "text-zinc-400"}`}>{it.sub}</p>}
        </div>
      ))}
    </section>
  );
}

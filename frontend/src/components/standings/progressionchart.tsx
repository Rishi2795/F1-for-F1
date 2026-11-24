import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export type Series = { id: string; label: string; color: string; dashed: boolean; values: (number | null)[] };
type Props = { series: Series[]; rounds: { round: number; label: string }[]; ariaLabel: string };

const W = 800;
const H = 360;
const M = { l: 46, r: 16, t: 16, b: 34 };

/** Round the axis maximum up to a tidy multiple so gridlines land on round numbers. */
function axis(max: number): { top: number; step: number } {
  const step = [10, 20, 25, 50, 100, 200, 250, 500, 1000].find((s) => max / s <= 5) ?? 1000;
  return { top: Math.max(step, Math.ceil(max / step) * step), step };
}

/** Points after each round. Lines for teammates share a colour, so the second one is dashed. */
export function ProgressionChart({ series, rounds, ariaLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const n = rounds.length;
  const maxValue = Math.max(1, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null)));
  const { top, step } = axis(maxValue);
  const x = (i: number) => M.l + (n <= 1 ? (W - M.l - M.r) / 2 : (i / (n - 1)) * (W - M.l - M.r));
  const y = (v: number) => M.t + (1 - v / top) * (H - M.t - M.b);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const labelEvery = n > 18 ? 3 : n > 10 ? 2 : 1;

  const indexAt = (clientX: number): number | null => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || n === 0) return null;
    const px = ((clientX - rect.left) / rect.width) * W;
    return Math.min(n - 1, Math.max(0, Math.round(((px - M.l) / (W - M.l - M.r)) * (n - 1))));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === "Escape") setHover(null);
    else return;
    e.preventDefault();
  };

  const atHover =
    hover === null
      ? []
      : series
          .map((s) => ({ s, v: s.values[hover] }))
          .filter((r): r is { s: Series; v: number } => r.v !== null && r.v !== undefined)
          .sort((a, b) => b.v - a.v);

  return (
    <div
      ref={box}
      className="relative rounded-md border border-white/10 bg-black/40 p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
      tabIndex={0}
      onKeyDown={onKey}
      onPointerMove={(e: PointerEvent) => setHover(indexAt(e.clientX))}
      onPointerLeave={() => setHover(null)}
      onBlur={() => setHover(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="block h-auto w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.08)" />
            <text x={M.l - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#a1a1aa">
              {t}
            </text>
          </g>
        ))}
        {rounds.map((r, i) =>
          i % labelEvery === 0 ? (
            <text key={r.round} x={x(i)} y={H - 10} textAnchor="middle" fontSize="12" fill="#a1a1aa">
              {r.round}
            </text>
          ) : null,
        )}
        {series.map((s) => {
          const pts = s.values.map((v, i) => (v === null ? null : `${x(i)},${y(v)}`)).filter(Boolean);
          return (
            <polyline
              key={s.id}
              points={pts.join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeDasharray={s.dashed ? "7 5" : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} stroke="rgba(255,255,255,0.35)" />
            {atHover.map(({ s, v }) => (
              <circle key={s.id} cx={x(hover)} cy={y(v)} r={4} fill={s.color} stroke="#000" strokeWidth={1} />
            ))}
          </g>
        )}
      </svg>
      <p className="px-1 pt-1 text-xs text-zinc-500">Round number along the bottom. Hover, or focus and use the arrow keys, for exact points.</p>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-3 z-10 min-w-[10rem] rounded border border-white/15 bg-zinc-950/95 p-3 text-xs shadow-xl"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: x(hover) / W > 0.6 ? "translateX(-105%)" : "translateX(8%)" }}
        >
          <p className="mb-1 font-semibold text-white">
            R{rounds[hover].round} · {rounds[hover].label}
          </p>
          {atHover.map(({ s, v }) => (
            <p key={s.id} className="flex items-center justify-between gap-4 text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
              <span className="font-mono text-white">{v}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export type Series = {
  id: string;
  label: string; // legend / tooltip name
  short: string; // direct label at the line end
  color: string;
  dashed: boolean; // second line of a team that already has a line of the same colour
  values: (number | null)[]; // in plotted units: points, or (gap mode) points behind the leader as a negative number
};
export type ChartMode = "points" | "gap";
type Props = {
  series: Series[];
  rounds: { round: number; label: string }[];
  ariaLabel: string;
  mode: ChartMode;
  leaderId: string | null; // the only line that gets a direct label (selective labelling)
  highlight: string | null; // legend hover/focus: emphasise one line
  marker: number | null; // index of the round selected on the chart (null = latest)
  onSelect: (index: number) => void; // click, or Enter while a round is highlighted
};

const SURFACE = "#050505";
const TEXT = "#e4e4e7";
const MUTED = "#a1a1aa";

function niceTop(max: number): { top: number; step: number } {
  const step = [10, 20, 25, 50, 100, 200, 250, 500, 1000].find((s) => max / s <= 5) ?? 1000;
  return { top: Math.max(step, Math.ceil(max / step) * step), step };
}

const fmt = (v: number, mode: ChartMode) => (mode === "gap" ? (v === 0 ? "Leader" : `−${Math.abs(v)}`) : String(v));

/** Championship points after each round. One axis, hairline grid, 2 px lines, ringed end dots. */
export function ProgressionChart({ series, rounds, ariaLabel, mode, leaderId, highlight, marker, onSelect }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const clipId = `reveal-${useId().replace(/:/g, "")}`;
  const n = rounds.length;

  // Draw at the real pixel size so text stays 12 px on a phone instead of being scaled down with the chart.
  const [width, setWidth] = useState(840);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const W = Math.max(280, width - 24); // minus the card padding
  const narrow = W < 520;
  const H = narrow ? 300 : Math.min(420, Math.max(340, Math.round(W * 0.45)));
  const M = narrow ? { l: 40, r: 18, t: 16, b: 34 } : { l: 54, r: 92, t: 20, b: 38 };

  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const { top, step } = niceTop(Math.max(1, mode === "points" ? Math.max(0, ...all) : Math.max(0, ...all.map((v) => -v))));
  const yMin = mode === "points" ? 0 : -top;
  const yMax = mode === "points" ? top : 0;
  const x = (i: number) => M.l + (n <= 1 ? (W - M.l - M.r) / 2 : (i / (n - 1)) * (W - M.l - M.r));
  const y = (v: number) => M.t + ((yMax - v) / (yMax - yMin)) * (H - M.t - M.b);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => yMin + i * step);
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
    else if (e.key === "Enter" && hover !== null) onSelect(hover);
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
  const dim = (id: string) => highlight !== null && highlight !== id;

  return (
    <div
      ref={box}
      className="relative rounded-sm glass p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
      style={{ touchAction: "pan-y" }}
      tabIndex={0}
      onKeyDown={onKey}
      onPointerMove={(e: PointerEvent) => setHover(indexAt(e.clientX))}
      onPointerLeave={() => setHover(null)}
      onClick={(e) => {
        const i = indexAt(e.clientX);
        if (i !== null) onSelect(i);
      }}
      onBlur={() => setHover(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="block h-auto w-full">
        <defs>
          <clipPath id={clipId}>
            <rect className="f1-reveal" x={0} y={0} width={W} height={H} />
          </clipPath>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke={t === 0 && mode === "gap" ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.07)"} />
            <text x={M.l - 10} y={y(t) + 4} textAnchor="end" fontSize="12" fill={MUTED} style={{ fontVariantNumeric: "tabular-nums" }}>
              {fmt(t, mode)}
            </text>
          </g>
        ))}
        {rounds.map((r, i) =>
          i % labelEvery === 0 ? (
            <text key={r.round} x={x(i)} y={H - 12} textAnchor="middle" fontSize="12" fill={MUTED}>
              {r.round}
            </text>
          ) : null,
        )}

        <g clipPath={`url(#${clipId})`}>
          {series.map((s) => {
            const pts = s.values.flatMap((v, i) => (v === null ? [] : [`${x(i)},${y(v)}`]));
            const isHi = highlight === s.id;
            return (
              <polyline
                key={s.id}
                points={pts.join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth={isHi ? 3 : 2}
                strokeDasharray={s.dashed ? "7 5" : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={dim(s.id) ? 0.18 : 1}
                style={{ transition: "opacity 150ms" }}
              />
            );
          })}
        </g>

        {/* End dots: a 2 px ring in the surface colour keeps them legible where lines converge. */}
        {series.map((s) => {
          const last = s.values.reduce<number>((acc, v, i) => (v === null ? acc : i), -1);
          if (last < 0) return null;
          const v = s.values[last] as number;
          return (
            <g key={s.id} opacity={dim(s.id) ? 0.25 : 1} style={{ transition: "opacity 150ms" }}>
              <circle cx={x(last)} cy={y(v)} r={6} fill={SURFACE} />
              <circle cx={x(last)} cy={y(v)} r={4} fill={s.color} />
              {s.id === leaderId && !narrow && (
                <text x={x(last) + 12} y={y(v) + 4} fontSize="13" fontWeight="600" fill={TEXT}>
                  {s.short}
                </text>
              )}
            </g>
          );
        })}

        {marker !== null && marker < n && (
          <g aria-hidden="true">
            <line x1={x(marker)} x2={x(marker)} y1={M.t} y2={H - M.b} stroke="#ef4444" strokeWidth={1.5} />
            <text x={x(marker)} y={M.t - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="#f87171">
              R{rounds[marker].round}
            </text>
          </g>
        )}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} stroke="rgba(255,255,255,0.35)" />
            {atHover.map(({ s, v }) => (
              <g key={s.id}>
                <circle cx={x(hover)} cy={y(v)} r={6} fill={SURFACE} />
                <circle cx={x(hover)} cy={y(v)} r={4} fill={s.color} />
              </g>
            ))}
          </g>
        )}
      </svg>
      <p className="px-1 pt-1 text-xs text-zinc-500">
        {mode === "gap" ? "Points behind the leader; the leader sits on the top line. " : "Along the bottom: round number. "}
        Hover, or use the arrow keys, for exact values.
      </p>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-4 z-10 min-w-[11.5rem] rounded-sm border border-white/15 bg-zinc-950/95 p-3 text-xs"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: x(hover) / W > 0.55 ? "translateX(-106%)" : "translateX(8%)" }}
        >
          <p className="mb-2 font-medium text-zinc-400">
            R{rounds[hover].round} · {rounds[hover].label}
          </p>
          {atHover.map(({ s, v }) => (
            <p key={s.id} className="flex items-center justify-between gap-5 py-0.5">
              <span className="flex items-center gap-2 text-zinc-400">
                <svg width="14" height="6" aria-hidden="true">
                  <line x1="0" x2="14" y1="3" y2="3" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "4 3" : undefined} />
                </svg>
                {s.label}
              </span>
              <span className="text-sm font-semibold text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmt(v, mode)}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

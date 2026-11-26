import type { RatingHistory } from "../../types/api";

const W = 640;
const H = 220;
const PAD = { l: 44, r: 12, t: 12, b: 26 };
// Driver and car use fixed, distinct colours (validated contrast on the dark surface); legend always shown.
const DRIVER = "#f5f5f5";
const CAR = "#ef4444";

/** Driver skill and car strength over time, one point per race. SVG only, no chart library. */
export function RatingChart({ history, name }: { history: RatingHistory["history"]; name: string }) {
  if (history.length < 2) return null;
  const values = history.flatMap((p) => [p[2], p[3]]);
  const lo = Math.floor(Math.min(...values) / 50) * 50;
  const hi = Math.ceil(Math.max(...values) / 50) * 50;
  const x = (i: number) => PAD.l + (i / (history.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.t - PAD.b);
  const line = (k: 2 | 3) => history.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(" ");
  const last = history.length - 1;
  const avg = 1500;
  const years = history.reduce<{ season: number; i: number }[]>((acc, p, i) => (acc.at(-1)?.season === p[0] ? acc : [...acc, { season: p[0], i }]), []);
  const summary = `${name}: how good the driver and the car were, race by race, from ${history[0][0]} to ${history[last][0]}.`;

  return (
    <figure>
      <ul className="mb-3 flex gap-5 text-xs text-zinc-300">
        <li className="flex items-center gap-2"><span aria-hidden="true" className="h-0.5 w-5 rounded" style={{ background: DRIVER }} />The driver</li>
        <li className="flex items-center gap-2"><span aria-hidden="true" className="h-0.5 w-5 rounded" style={{ background: CAR }} />The car</li>
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="w-full">
        {avg > lo && avg < hi && (
          <g>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(avg)} y2={y(avg)} stroke="#ffffff" strokeOpacity="0.18" strokeDasharray="4 4" />
            <text x={PAD.l - 8} y={y(avg) + 4} textAnchor="end" className="fill-zinc-400" fontSize="11">avg</text>
          </g>
        )}
        <text x={PAD.l - 8} y={PAD.t + 10} textAnchor="end" className="fill-zinc-500" fontSize="11">better</text>
        <text x={PAD.l - 8} y={H - PAD.b - 2} textAnchor="end" className="fill-zinc-500" fontSize="11">lower</text>
        {years.filter((_, k) => k % 2 === 0 || years.length < 6).map(({ season, i }) => (
          <text key={season} x={x(i)} y={H - 6} textAnchor="start" className="fill-zinc-400" fontSize="11">{season}</text>
        ))}
        {([[2, DRIVER], [3, CAR]] as const).map(([k, colour]) => (
          <g key={k}>
            <path d={line(k)} fill="none" stroke={colour} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={x(last)} cy={y(history[last][k])} r="4" fill={colour} stroke="#080808" strokeWidth="2" />
          </g>
        ))}
      </svg>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

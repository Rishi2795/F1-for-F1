import type { CSSProperties, PointerEvent } from "react";
import { Link } from "react-router-dom";
import { useCountUp } from "../../hooks/useCountUp";
import { ChampionBadge } from "../ui/championbadge";
import { prefetch } from "../../lib/api";

export type PodiumEntry = {
  id: string;
  label: string;
  sublabel: string | null;
  color: string;
  points: number;
  wins: number;
  position: number | null;
  number: number | null; // race number (drivers); teams use their position as the backdrop numeral
  champion?: string; // e.g. "World Champion": set on P1 once the season is over
  href?: string;
  prefetch?: string;
};

function Points({ value, className }: { value: number; className: string }) {
  const shown = useCountUp(value);
  const decimals = Number.isInteger(value) ? 0 : 1;
  return (
    <span className={className}>
      {/* Screen readers get the final value at once; the counting digits are decoration. */}
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" style={{ fontVariantNumeric: "tabular-nums" }}>
        {shown.toFixed(decimals)}
      </span>
    </span>
  );
}

const follow = (e: PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

/** The top three, arranged like a podium: P2 – P1 – P3, the leader tallest. Reading order stays P1, P2, P3. */
export function Podium({ entries, leaderPoints }: { entries: PodiumEntry[]; leaderPoints: number }) {
  const place = [
    "md:order-2 md:min-h-[19rem]", // P1: centre, tallest
    "md:order-1 md:min-h-[16rem]", // P2
    "md:order-3 md:min-h-[14.5rem]", // P3
  ];
  return (
    <ol className="grid gap-4 md:grid-cols-3 md:items-end" aria-label="Top three">
      {entries.slice(0, 3).map((e, i) => {
        const lead = i === 0;
        const card = (
          <div
            onPointerMove={follow}
            className={`f1-spot f1-rise group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.015] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] transition-colors hover:border-white/25 ${place[i]}`}
            style={{ "--d": `${i * 110}ms` } as CSSProperties}
          >
            {/* Team colour: a soft corner glow and a hairline, nothing heavier. */}
            <span aria-hidden="true" className="absolute -bottom-28 -left-20 h-64 w-64 rounded-full opacity-[0.22] blur-3xl" style={{ backgroundColor: e.color }} />
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${e.color}, transparent 85%)` }} />
            {/* Oversized outline numeral: the driver's race number, or the team's position. */}
            <span
              aria-hidden="true"
              className="f1-outline pointer-events-none absolute right-3 -top-5 select-none text-[9rem] font-black italic leading-none"
              style={{ "--stroke": `${e.color}99` } as CSSProperties}
            >
              {e.number ?? e.position}
            </span>

            <div className="relative z-10 flex h-full flex-col p-6">
              <div className="flex items-center gap-3 text-xs">
                <span className="rounded-full border border-white/20 px-2.5 py-0.5 font-semibold tracking-widest text-zinc-200">P{e.position ?? i + 1}</span>
                <span className="text-zinc-400">
                  {e.wins} {e.wins === 1 ? "win" : "wins"}
                </span>
                {e.champion && <ChampionBadge titles={1} label={e.champion} />}
              </div>
              <div className="mt-auto pt-10">
                <h3 className={`truncate font-extrabold leading-tight tracking-tight text-white ${lead ? "text-2xl md:text-3xl" : "text-xl"}`}>{e.label}</h3>
                {e.sublabel && (
                  <p className="mt-0.5 flex items-center gap-2 truncate text-sm text-zinc-400">
                    <span aria-hidden="true" className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
                    {e.sublabel}
                  </p>
                )}
                <p className="mt-4 flex items-baseline gap-2">
                  <Points value={e.points} className={`font-black leading-none tracking-tight text-white ${lead ? "text-6xl md:text-7xl" : "text-5xl"}`} />
                  <span className="text-sm text-zinc-400">pts</span>
                </p>
                {!lead && <p className="mt-2 text-sm text-zinc-400">−{leaderPoints - e.points} behind the leader</p>}
              </div>
            </div>
          </div>
        );
        return (
          <li key={e.id} className={`${place[i]} md:flex`}>
            {e.href ? (
              <Link to={e.href} onMouseEnter={() => e.prefetch && prefetch(e.prefetch)} className="block w-full rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">
                {card}
              </Link>
            ) : (
              <div className="w-full">{card}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

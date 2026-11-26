import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useCountUp } from "../../hooks/useCountUp";
import { ChampionBadge } from "../ui/championbadge";
import { prefetch } from "../../lib/api";
import { framing } from "../../lib/driverphotos";
import { useDriverImages } from "../../lib/driverimages";

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


/** The top three, arranged like a podium on every screen: P2 – P1 – P3, the leader tallest. Reading order stays P1, P2, P3.
 *  On a phone the three sit side by side in compact cards. */
export function Podium({ entries, leaderPoints }: { entries: PodiumEntry[]; leaderPoints: number }) {
  const imageOf = useDriverImages();
  const withPictures = entries.slice(0, 3).some((e) => imageOf(e.id, 4));
  // The leader is tallest. With portraits the cards are taller, since the picture sits above the text.
  const place = withPictures
    ? [
        "order-2 min-h-[21rem] sm:min-h-[26rem]", // P1: centre, tallest
        "order-1 min-h-[18.5rem] sm:min-h-[23.5rem]", // P2
        "order-3 min-h-[17rem] sm:min-h-[21.5rem]", // P3
      ]
    : [
        "order-2 min-h-[15.5rem] sm:min-h-[17rem] md:min-h-[19rem]",
        "order-1 min-h-[13.5rem] sm:min-h-[14.5rem] md:min-h-[16rem]",
        "order-3 min-h-[12rem] sm:min-h-[13rem] md:min-h-[14.5rem]",
      ];
  return (
    <ol className="grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="Top three">
      {entries.slice(0, 3).map((e, i) => {
        const lead = i === 0;
        const img = imageOf(e.id, 4);
        const card = (
          <div
            className={`f1-rise group relative h-full overflow-hidden rounded-sm glass transition-colors hover:border-white/25 ${place[i]}`}
            style={{ "--d": `${i * 110}ms` } as CSSProperties}
          >
            {/* Team colour: one flat hairline. */}
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundColor: e.color }} />
            <div className="relative z-10 flex h-full flex-col p-2.5 sm:p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="rounded-sm border border-white/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-widest text-zinc-200 sm:px-2.5 sm:text-xs">P{e.position ?? i + 1}</span>
                <span className="text-[10px] text-zinc-400 sm:text-xs">
                  {e.wins}
                  <span className="hidden sm:inline"> {e.wins === 1 ? "win" : "wins"}</span>
                  <span className="sm:hidden">W</span>
                </span>
                {e.champion && (
                  <>
                    {/* a crown on its own where the three cards are narrow; the full badge from tablets up */}
                    <span title={e.champion} className="inline-flex items-center rounded-sm border border-red-500/60 p-1 sm:hidden">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="#ef4444" aria-hidden="true"><path d="M5 16 3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5Zm0 2h14v2H5v-2Z" /></svg>
                      <span className="sr-only">{e.champion}</span>
                    </span>
                    <span className="hidden sm:inline-flex"><ChampionBadge titles={1} label={e.champion} /></span>
                  </>
                )}
              </div>
              {img && (
                <div className="relative my-1 min-h-[6.5rem] flex-1 sm:min-h-[10rem]">
                  {/* a glow in the team's colour behind the driver */}
                  <span aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: `radial-gradient(ellipse 70% 62% at 50% 92%, ${e.color}77, transparent 72%)` }} />
                  {img.kind === "licensed" ? (
                    <img src={`/drivers/${img.photo.file}`} alt="" loading="lazy" className="absolute inset-0 h-full w-full rounded-sm object-cover" style={{ objectPosition: framing(img.photo, 1.2, 0.34) }} />
                  ) : (
                    <img src={img.url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(ev) => { ev.currentTarget.style.display = "none"; }} className="absolute inset-x-0 bottom-0 mx-auto h-full w-auto max-w-full object-contain object-bottom" />
                  )}
                </div>
              )}
              <div className={`min-w-0 ${img ? "pt-1" : "mt-auto pt-6 sm:pt-10"}`}>
                <h3 className={`line-clamp-3 break-words font-extrabold leading-tight tracking-tight text-white sm:line-clamp-2 ${lead ? "text-sm sm:text-2xl lg:text-3xl" : "text-xs sm:text-xl"}`}>{e.label}</h3>
                {e.sublabel && (
                  <p className="mt-0.5 flex items-start gap-1.5 text-[10px] leading-tight text-zinc-400 sm:items-center sm:gap-2 sm:truncate sm:text-sm">
                    <span aria-hidden="true" className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full sm:mt-0" style={{ backgroundColor: e.color }} />
                    {e.sublabel}
                  </p>
                )}
                <p className="mt-2 flex items-baseline gap-1 sm:mt-4 sm:gap-2">
                  <Points value={e.points} className={`font-serif leading-none text-white ${lead ? "text-3xl sm:text-6xl md:text-7xl" : "text-2xl sm:text-5xl"}`} />
                  <span className="text-[10px] text-zinc-400 sm:text-sm">pts</span>
                </p>
                {!lead && (
                  <p className="mt-1 text-[10px] text-zinc-400 sm:mt-2 sm:text-sm">
                    −{leaderPoints - e.points}<span className="hidden sm:inline"> behind the leader</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        );
        return (
          <li key={e.id} className={`${place[i]} flex min-w-0`}>
            {e.href ? (
              <Link to={e.href} onMouseEnter={() => e.prefetch && prefetch(e.prefetch)} className="block w-full rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">
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

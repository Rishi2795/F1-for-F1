import { Link } from "react-router-dom";
import { prefetch } from "../../lib/api";

export type PodiumEntry = {
  id: string;
  label: string;
  sublabel: string | null;
  color: string;
  points: number;
  wins: number;
  position: number | null;
  href?: string;
  prefetch?: string;
};

/** The top three, with the leader's points as the one hero figure on the page. */
export function Podium({ entries, leaderPoints }: { entries: PodiumEntry[]; leaderPoints: number }) {
  return (
    <ol className="grid gap-3 md:grid-cols-[1.35fr_1fr_1fr]" aria-label="Top three">
      {entries.slice(0, 3).map((e, i) => {
        const lead = i === 0;
        const card = (
          <div
            className="relative h-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25"
            style={{ backgroundImage: `radial-gradient(120% 90% at 0% 0%, ${e.color}${lead ? "2e" : "1a"}, transparent 60%)` }}
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: e.color }} />
            <div className="flex items-start justify-between gap-3">
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${lead ? "bg-red-600 text-white" : "bg-white/10 text-zinc-200"}`}>P{e.position ?? i + 1}</span>
              <span className="text-xs text-zinc-400">{e.wins} {e.wins === 1 ? "win" : "wins"}</span>
            </div>
            <p className={`mt-4 truncate font-black leading-tight text-white ${lead ? "text-2xl md:text-3xl" : "text-xl"}`}>{e.label}</p>
            {e.sublabel && <p className="truncate text-sm text-zinc-400">{e.sublabel}</p>}
            <p className="mt-5 flex items-baseline gap-2">
              <span className={`font-black leading-none tracking-tight text-white ${lead ? "text-6xl md:text-7xl" : "text-4xl"}`}>{e.points}</span>
              <span className="text-sm text-zinc-400">pts</span>
            </p>
            {!lead && <p className="mt-2 text-sm text-zinc-400">−{leaderPoints - e.points} behind the leader</p>}
          </div>
        );
        return (
          <li key={e.id} className={lead ? "md:row-span-1" : ""}>
            {e.href ? (
              <Link to={e.href} onMouseEnter={() => e.prefetch && prefetch(e.prefetch)} className="block h-full rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">
                {card}
              </Link>
            ) : (
              card
            )}
          </li>
        );
      })}
    </ol>
  );
}

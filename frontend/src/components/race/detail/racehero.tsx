import { DriverAvatar } from "../../ui/driveravatar";
import { Link } from "react-router-dom";
import { useApi } from "../../../hooks/useApi";
import { readableOnDark } from "../../../lib/color";
import { slugify } from "../../../lib/slug";
import { tag } from "../../../lib/tag";
import type { RaceDoc, RaceIndexEntry } from "../../../types/api";

const NAV_LINK = "font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600";

/** The page's fixed top bar and its title block, as on the original race page. */
export function RaceHero({ race, accent }: { race: RaceDoc; accent: string }) {
  const index = useApi<{ races: RaceIndexEntry[] }>(`/seasons/${race.season}/races`).data;
  const played = (index?.races ?? []).filter((r) => r.data_status !== "scheduled");
  const prev = played.filter((r) => r.round < race.round).at(-1);
  const next = played.find((r) => r.round > race.round);
  const winner = race.drivers.find((d) => d.finish === 1);
  const short = (name: string) => name.replace(" Grand Prix", "");

  return (
    <>
      <nav aria-label="Race navigation" className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link to="/explore" className="whitespace-nowrap text-xs font-black uppercase tracking-widest text-white transition-colors hover:text-red-500">All races</Link>
          <span aria-hidden="true" className="hidden h-3 w-px bg-white/10 sm:block" />
          <span className="hidden whitespace-nowrap font-mono text-xs uppercase text-zinc-500 sm:inline">SYS_ACTIVE // {race.season}.R{race.round}</span>
        </div>
        <div className="flex items-center gap-5">
          {prev && <Link to={`/race/${race.season}/${prev.round}`} className={NAV_LINK} aria-label={`Previous race: ${prev.event_name}`}>‹ <span className="hidden sm:inline">{tag(short(prev.event_name))}</span><span className="sm:hidden">PREV</span></Link>}
          {next && <Link to={`/race/${race.season}/${next.round}`} className={NAV_LINK} aria-label={`Next race: ${next.event_name}`}><span className="hidden sm:inline">{tag(short(next.event_name))}</span><span className="sm:hidden">NEXT</span> ›</Link>}
          <span className="hidden text-xs font-black italic uppercase tracking-tighter text-zinc-400 md:block">Archive · {race.date}</span>
        </div>
        </div>
      </nav>

      <header className="f1-rise space-y-8">
        <div className="grid items-end gap-8 border-b border-white/10 pb-6 md:grid-cols-12">
          <div className="md:col-span-8">
            <p className="mb-4 flex flex-wrap items-center gap-3">
              <span className="bg-red-600 px-2 py-0.5 text-xs font-black uppercase text-white">SEASON_{race.season}</span>
              <span className="font-mono text-xs uppercase text-zinc-500">TRACK_POSITION: {race.location}</span>
            </p>
            <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter text-white md:text-6xl">{race.event_name}</h1>
          </div>
          <dl className="flex gap-8 md:col-span-4 md:justify-end md:gap-10">
            {([["CIRCUIT", race.location], ["RACE_ID", `GP_R${race.round}`], ["LAPS", race.derived.total_laps ?? "—"]] as const).map(([k, v]) => (
              <div key={k} className="flex flex-col md:items-end">
                <dt className="mb-1 text-xs font-black uppercase tracking-widest text-zinc-500">{k}</dt>
                <dd className="text-xs font-black uppercase italic tracking-tighter text-white">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {race.excitement && (
            <Link to="/watch" className="inline-flex items-center gap-3 glass px-4 py-3 transition-colors hover:border-white/40">
              <span className="font-serif text-3xl text-white">{race.excitement.score.toFixed(1)}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">WORTH_WATCHING<br />{race.excitement.overtakes !== null ? `${race.excitement.overtakes}_PASSES` : "OUT_OF_10"}</span>
            </Link>
          )}
          <Link to={`/race/${race.season}/${race.round}/lab`} className="inline-flex items-center gap-2 border border-red-600 bg-red-600 px-4 py-4 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-white transition-colors hover:bg-red-500">
            OPEN_RACE_LAB <span aria-hidden="true">→</span>
          </Link>
          <Link to={`/circuit/${slugify(race.location)}`} className="inline-flex items-center gap-2 glass px-4 py-4 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-300 transition-colors hover:border-white/40 hover:text-white">
            TRACK_HISTORY <span aria-hidden="true">→</span>
          </Link>
        </div>

        {winner && (
          <Link
            to={`/driver/${winner.driver_code}`}
            className="group inline-flex items-center gap-5 glass py-3 pl-4 pr-6 transition-colors hover:border-white/40"
            style={{ boxShadow: `inset 3px 0 0 ${accent}` }}
          >
            <DriverAvatar code={winner.driver_code} color={winner.team_color} number={winner.driver_number} size={48} />
            <span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">WINNER</span>
              <span className="block text-xl font-black uppercase italic tracking-tighter text-white">{winner.driver_name}</span>
            </span>
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-300">
              <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: readableOnDark(`#${(winner.team_color ?? "888888").replace("#", "")}`) }} />
              {winner.team}
            </span>
            <span aria-hidden="true" className="text-zinc-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white">→</span>
          </Link>
        )}
      </header>
    </>
  );
}

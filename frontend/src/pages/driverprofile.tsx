import type { CSSProperties, ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ErrorState, Skeleton } from "../components/ui/states";
import { ChampionBadge } from "../components/ui/championbadge";
import { fmt, fmtSigned } from "../lib/format";
import { framing, useDriverPhotos } from "../lib/driverphotos";
import { DriverSilhouette } from "../components/ui/driversilhouette";
import { portrait } from "../lib/headshots";
import { CuboidFace, CuboidStack } from "../components/ui/cuboid";
import { WeekendPanel } from "../components/driver/weekendpanel";
import { RatingPanel } from "../components/ratings/ratingpanel";
import type { DriverProfile } from "../types/api";

/** `/driver/:code`: one driver's career, seasons, ratings and (for the current grid) this weekend's chances. */
export default function DriverPage() {
  const { code = "" } = useParams();
  const stats = useApi<DriverProfile>(code ? `/drivers/${code}` : null);

  useDocumentTitle(stats.data?.name ?? "Driver");
  const photos = useDriverPhotos();

  if (stats.loading) {
    return (
      <div className="min-h-screen py-14">
        <div className="page grid gap-8 lg:grid-cols-12">
          <Skeleton className="h-[420px] lg:col-span-4" />
          <Skeleton className="h-[420px] lg:col-span-8" />
        </div>
      </div>
    );
  }
  if (!stats.data) {
    return (
      <div className="min-h-screen">
        <ErrorState error={stats.error} onRetry={stats.reload} subject="driver" backTo={{ href: "/drivers", label: "All drivers" }} />
      </div>
    );
  }
  const driver = stats.data;
  const photo = photos[driver.code];
  const official = portrait(driver.image, 6);
  const teamColour = `#${(driver.team_color ?? "888888").replace("#", "")}`;
  const s = driver.stats;

  return (
    <div className="min-h-screen py-14 text-zinc-200">
      <div className="page mb-10 flex justify-between">
        <Link to="/drivers" className="text-xs font-mono text-zinc-400 hover:text-white">
          ← ALL DRIVERS
        </Link>
        <span className="text-xs font-mono text-red-500">DRIVER PROFILE</span>
      </div>

      <div className="page grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          {/* Pinned, and as tall as the screen: it stays in view while the cards on the right scroll past, and the portrait takes the
              spare height. On a very short window it is an ordinary card, so nothing is ever cut off. */}
          <div data-testid="driver-card" className="flex flex-col overflow-hidden rounded-sm border border-white/10 bg-[#080808] lg:sticky lg:top-8 lg:h-[calc(100svh-4rem)] lg:min-h-[34rem] lg:max-h-[56rem] [@media(max-height:640px)]:lg:static [@media(max-height:640px)]:lg:h-auto">
            <div className="relative flex h-[380px] flex-none items-center justify-center overflow-hidden glass-cell lg:h-auto lg:min-h-[18rem] lg:flex-1" style={photo ? undefined : { backgroundImage: `linear-gradient(165deg, ${teamColour}55 0%, ${teamColour}14 45%, #050505 85%)` }}>
              {driver.number !== null && (
                <span aria-hidden="true" className="f1-outline absolute -right-3 top-2 text-[10rem] font-black italic leading-none" style={{ "--stroke": `${teamColour}77` } as CSSProperties}>{driver.number}</span>
              )}
              {!photo && official && (
                <>
                  <img src={official} alt={driver.name} referrerPolicy="no-referrer" onError={(ev) => { ev.currentTarget.style.display = "none"; }} className="absolute bottom-0 left-1/2 h-full w-auto max-w-full -translate-x-1/2 object-contain object-bottom" />
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#080808] to-transparent" />
                </>
              )}
              {photo ? (
                <>
                  <img src={`/drivers/${photo.file}`} alt={`${driver.name}`} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: framing(photo, 1.05, 0.4) }} />
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#080808] to-transparent" />
                </>
              ) : !official ? (
                <>
                  <span aria-hidden="true" className="f1-outline absolute inset-x-0 top-[10%] text-center text-9xl font-black italic leading-none">{driver.code}</span>
                  <DriverSilhouette color={teamColour} className="absolute bottom-0 left-1/2 h-[82%] w-auto max-w-full -translate-x-1/2" />
                </>
              ) : null}
            </div>
            {!photo && official && <p className="border-t border-white/10 px-4 py-2 text-[10px] leading-snug text-zinc-500">Portrait © Formula 1, shown from formula1.com.</p>}
            {photo && (
              <p className="border-t border-white/10 px-4 py-2 text-[10px] leading-snug text-zinc-500">
                Photo: © {photo.credit},{" "}
                {photo.licenceUrl ? <a href={photo.licenceUrl} rel="noopener noreferrer" className="underline">{photo.licence}</a> : photo.licence}
                {photo.source && <> · <a href={photo.source} rel="noopener noreferrer" className="underline">Wikimedia Commons</a></>} · resized and cropped
              </p>
            )}
            <div className="space-y-3 p-6">
              <h1 className="text-3xl font-black italic text-white">{driver.name}</h1>
              <ChampionBadge titles={driver.titles} years={driver.title_years} />
              <p className="text-sm text-zinc-400">
                {driver.team ?? "—"}
                {driver.number !== null && ` · #${driver.number}`}
              </p>
              <dl className="grid grid-cols-3 gap-2 pt-2">
                {([["Wins", s.wins], ["Podiums", s.podiums], ["Races", s.races]] as const).map(([k, v]) => (
                  <div key={k} className="rounded-sm border border-white/10 bg-white/[0.03] px-3 py-2">
                    <dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">{k}</dt>
                    <dd className="font-serif text-2xl text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">{driver.latest_season} season</p>
            </div>
          </div>
        </div>

        <CuboidStack className="space-y-8 lg:col-span-8">
          <CuboidFace>
          <Panel title={`${driver.latest_season} SEASON`}>
            <Grid4>
              <Mini label="Races" value={s.races} />
              <Mini label="Wins" value={s.wins} />
              <Mini label="Podiums" value={s.podiums} />
              <Mini label="Race points (excl. sprints)" value={s.points} />
              <Mini label="Best finish" value={s.best_finish === null ? "—" : `P${s.best_finish}`} />
              <Mini label="Avg finish" value={fmt(s.avg_finish)} />
              <Mini label="Avg grid" value={fmt(s.avg_grid)} />
              <Mini label="Positions gained" value={fmtSigned(s.positions_gained)} signed={s.positions_gained} />
              <Mini label="Consistency" value={fmt(s.consistency, "%")} />
              <Mini label="Avg longest stint" value={fmt(s.avg_longest_stint, " laps")} />
              <Mini label="Recent form (avg finish, last 5)" value={fmt(s.recent_form)} />
            </Grid4>
          </Panel>
          </CuboidFace>

          {driver.latest_season >= 2026 && <CuboidFace><WeekendPanel code={driver.code} /></CuboidFace>}

          {driver.rating && <CuboidFace><RatingPanel code={driver.code} name={driver.name} rating={driver.rating} /></CuboidFace>}

          <CuboidFace>
          <Panel title="BY SEASON">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Season-by-season results for {driver.name}</caption>
                <thead className="text-xs uppercase text-zinc-500">
                  <tr>
                    <th scope="col" className="py-2 pr-4">SEASON</th>
                    <th scope="col" className="pr-4">TEAM</th>
                    <th scope="col" className="pr-4">RACES</th>
                    <th scope="col" className="pr-4">WINS</th>
                    <th scope="col" className="pr-4">PODIUMS</th>
                    <th scope="col">RACE_PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {driver.seasons.map((row) => (
                    <tr key={row.season} className="border-t border-white/5">
                      <td className="py-2 pr-4 font-semibold text-white">{row.season}</td>
                      <td className="pr-4">{row.team ?? "—"}</td>
                      <td className="pr-4">{row.races}</td>
                      <td className="pr-4">{row.wins}</td>
                      <td className="pr-4">{row.podiums}</td>
                      <td>{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          </CuboidFace>

        </CuboidStack>
      </div>
    </div>
  );
}



/* ================= UI ================= */


function Panel({ children, title }: { children: ReactNode; title?: string }) {

  return (
    <div className="
      bg-[#080808]
      border border-white/10
      rounded-sm
      p-6
    ">

      {title && (
        <h3 className="
          text-xs
          font-mono
          text-red-500
          mb-5
        ">
          {title}
        </h3>
      )}

      {children}

    </div>
  );
}


function Grid4({ children }: { children: ReactNode }) {
  return (
    <div className="
      grid grid-cols-2 md:grid-cols-4 gap-4
    ">
      {children}
    </div>
  );
}


function Mini({ label, value, signed }: { label: string; value: string | number; signed?: number | null }) {

  const color =
    signed === undefined || signed === null
      ? "text-white"
      : signed >= 0
        ? "text-white"
        : "text-red-500";

  return (
    <div className="bg-white/5 border border-white/10 p-4 rounded">

      <p className="text-[10px] uppercase text-zinc-500 mb-1">
        {label}
      </p>

      <p className={`text-xl font-black italic ${color}`}>
        {value}
      </p>

    </div>
  );
}

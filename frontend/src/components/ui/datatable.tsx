import { DriverAvatar } from "./driveravatar";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { readableOnDark } from "../../lib/color";

/** One table look for the whole site, taken from the standings table: a soft rounded frame, small
 *  tracked header, hairline rows that light up on hover, an italic position and a team-colour bar. */
export function DataTable({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    // relative: keeps the screen-reader caption inside the scroll box; tabIndex: keyboard users can scroll it.
    <div tabIndex={0} role="region" aria-label={caption} className="relative overflow-x-auto rounded-sm glass">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

/** Position number: bright for the top three, muted after. */
export function Pos({ n }: { n: number | string | null }) {
  const top = typeof n === "number" && n <= 3;
  return <span className={`text-xl font-black italic leading-none ${n === 1 ? "text-white" : top ? "text-zinc-200" : "text-zinc-500"}`}>{n ?? "—"}</span>;
}

/** Team-colour bar and the driver's name; the team sits underneath on small screens. */
export function DriverCell({ name, code, color, team }: { name: string; code?: string; color?: string | null; team?: string | null }) {
  const bar = color === undefined ? null : readableOnDark(`#${(color ?? "888888").replace("#", "")}`);
  const parts = name.split(" ");
  const short = parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(" ")}` : name;
  const label = (
    <span className="font-semibold text-white transition-colors group-hover:text-red-400">
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{name}</span>
    </span>
  );
  return (
    <span className="flex items-center gap-3">
      {bar && <span aria-hidden="true" className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: bar }} />}
      {code && <DriverAvatar code={code} color={color} size={34} />}
      <span className="min-w-0">
        {code ? <Link to={`/driver/${code}`} className="hover:text-red-400">{label}</Link> : label}
        {team && <span className="block text-xs text-zinc-500 md:hidden">{team}</span>}
      </span>
    </span>
  );
}

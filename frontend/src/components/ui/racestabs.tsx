import { Link } from "react-router-dom";

/** The two ways into the races, always one tap apart: the calendar (what is next, and when) and every race with its results. It sits at the
 *  top of both pages so the full race list is never hidden behind a menu. */
export function RacesTabs({ current }: { current: "calendar" | "results" }) {
  const item = (on: boolean) =>
    `px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${
      on ? "bg-white text-black" : "text-zinc-300 hover:bg-white/10 hover:text-white"
    }`;
  return (
    <nav aria-label="Races" className="inline-flex divide-x divide-white/15 overflow-hidden rounded-sm border border-white/15 bg-white/[0.04]">
      <Link to="/schedule" aria-current={current === "calendar" ? "page" : undefined} className={item(current === "calendar")}>Calendar</Link>
      <Link to="/explore" aria-current={current === "results" ? "page" : undefined} className={item(current === "results")}>All races &amp; results</Link>
    </nav>
  );
}

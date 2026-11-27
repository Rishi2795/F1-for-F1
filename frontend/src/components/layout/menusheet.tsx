import { useEffect, useRef, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "../ui/themetoggle";

type Entry = { to: string; title: string; note: string; match?: (path: string) => boolean };
const GROUPS: { name: string; entries: Entry[] }[] = [
  {
    name: "Follow the season",
    entries: [
      { to: "/schedule", title: "Schedule", note: "The calendar, countdown and session times in your time zone" },
      { to: "/news", title: "News", note: "Headlines from the sport's publishers" },
      { to: "/explore", title: "Race archive", note: "Every race: results, replay, pit stops and passes", match: (p) => p === "/explore" || p.startsWith("/race/") },
      { to: "/standings", title: "Standings", note: "Drivers and constructors, round by round", match: (p) => p.startsWith("/season/") || p === "/standings" },
      { to: "/drivers", title: "Drivers", note: "Every driver since 2020", match: (p) => p.startsWith("/driver") },
      { to: "/circuits", title: "Circuits", note: "Every track, drawn from a real lap", match: (p) => p.startsWith("/circuit") },
    ],
  },
  {
    name: "Predict and analyse",
    entries: [
      { to: "/forecast", title: "Forecast", note: "Next-race predictions, possible final standings, scored in public" },
      { to: "/watch", title: "Worth watching", note: "Was that race worth a replay? Spoiler-free" },
      { to: "/ratings", title: "Driver or car?", note: "How much of a result is the driver" },
      { to: "/duels", title: "Teammate duels", note: "Same car, head to head" },
      { to: "/team-pace", title: "Team pace", note: "Who is improving, who is fading" },
      { to: "/pitwall", title: "Pit Wall", note: "All the strategy tools in one place" },
    ],
  },
  {
    name: "Play",
    entries: [
      { to: "/simulation", title: "Simulator", note: "Plan stops, add rain and safety cars, test across hundreds of races" },
      { to: "/play", title: "Beat the model", note: "Pick the podium, see who called it better" },
      { to: "/my", title: "My driver", note: "A briefing on your driver, saved on this device" },
    ],
  },
  {
    name: "About",
    entries: [
      { to: "/about_app", title: "About", note: "What this is, and what it will not pretend" },
      { to: "/methodology", title: "Methodology", note: "How every number and model works" },
    ],
  },
];

/** The full menu: every page of the site, grouped, so nothing is only reachable by knowing where to look. */
export function MenuSheet({ onClose, onSearch }: { onClose: () => void; onSearch: () => void }) {
  const { pathname } = useLocation();
  const panel = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    first.current?.focus();
    const keep = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // the page behind does not scroll while the menu is open
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key !== "Tab" || !panel.current) return;
      const focusable = [...panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      const [a, z] = [focusable[0], focusable[focusable.length - 1]];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = keep;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/[0.98]" onClick={onClose}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label="Menu" onClick={(e) => e.stopPropagation()} className="page flex h-full flex-col overflow-y-auto pb-32 pt-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">Menu</h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { onClose(); onSearch(); }} className="rounded-sm border border-white/20 px-3 py-2 text-sm font-semibold text-zinc-200 hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">
              Search <span className="ml-1 hidden font-mono text-[10px] text-zinc-400 sm:inline">⌘K</span>
            </button>
            <button ref={first} type="button" onClick={onClose} aria-label="Close menu" className="grid h-10 w-10 place-items-center rounded-sm border border-white/20 text-zinc-200 hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" /></svg>
            </button>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4 rounded-sm border border-white/10 bg-white/[0.03] px-4 py-3">
          <span>
            <span className="block text-sm font-bold text-white">Typeface</span>
            <span className="block text-xs text-zinc-400">Dot-matrix headlines or the classic look. Kept on this device.</span>
          </span>
          <ThemeToggle />
        </div>

        {/* The whole site as a numbered index: big type, a nudge and an arrow on hover, a red edge where you are. */}
        <div className="gap-x-14 lg:columns-2">
          {GROUPS.map((g, gi) => {
            const before = GROUPS.slice(0, gi).reduce((n, x) => n + x.entries.length, 0);
            return (
              <section key={g.name} aria-label={g.name} className="mb-8 break-inside-avoid">
                <h3 className="mb-1 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-red-500">
                  {g.name}
                  <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-red-600/60 to-transparent" />
                </h3>
                <ul>
                  {g.entries.map((e, i) => {
                    const active = e.match ? e.match(pathname) : pathname === e.to;
                    const n = String(before + i + 1).padStart(2, "0");
                    return (
                      <li key={e.to} className="f1-rise" style={{ "--d": `${(before + i) * 32}ms` } as CSSProperties}>
                        <Link
                          to={e.to}
                          aria-current={active ? "page" : undefined}
                          onClick={onClose}
                          className="group relative flex items-baseline gap-4 border-b border-white/10 py-3.5 pl-3 pr-2 transition-colors hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
                        >
                          {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-red-500" />}
                          <span aria-hidden="true" className={`w-6 shrink-0 font-mono text-[10px] tabular-nums transition-colors ${active ? "text-red-500" : "text-zinc-600 group-hover:text-red-500"}`}>{n}</span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-[1.65rem] font-black uppercase italic leading-none tracking-tighter transition-transform duration-300 group-hover:translate-x-1.5 sm:text-3xl ${active ? "text-red-500" : "text-white"}`}>{e.title}</span>
                            <span className="mt-1.5 block text-[13px] leading-snug text-zinc-500 transition-colors group-hover:text-zinc-300">{e.note}</span>
                          </span>
                          <span aria-hidden="true" className="self-center text-xl text-red-500 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 max-lg:opacity-60 -translate-x-2">→</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

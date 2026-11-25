import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "../ui/themetoggle";

type Entry = { to: string; title: string; note: string; match?: (path: string) => boolean };
const GROUPS: { name: string; entries: Entry[] }[] = [
  {
    name: "Follow the season",
    entries: [
      { to: "/explore", title: "Races", note: "Every race: results, replay, pit stops and passes", match: (p) => p === "/explore" || p.startsWith("/race/") },
      { to: "/standings", title: "Standings", note: "Drivers and constructors, round by round", match: (p) => p.startsWith("/season/") || p === "/standings" },
      { to: "/drivers", title: "Drivers", note: "Every driver since 2020", match: (p) => p.startsWith("/driver") },
      { to: "/circuits", title: "Circuits", note: "Every track, drawn from a real lap", match: (p) => p.startsWith("/circuit") },
    ],
  },
  {
    name: "Predict and analyse",
    entries: [
      { to: "/forecast", title: "Forecast", note: "Win and title odds, scored in public" },
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
      { to: "/simulation", title: "Simulator", note: "Out-strategise the engineer" },
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
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-xl" onClick={onClose}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label="Menu" onClick={(e) => e.stopPropagation()} className="mx-auto flex h-full max-w-5xl flex-col overflow-y-auto px-5 pb-32 pt-6 sm:px-8">
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

        <div className="space-y-8">
          {GROUPS.map((g) => (
            <section key={g.name} aria-label={g.name}>
              <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-400">{g.name}</h3>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {g.entries.map((e) => {
                  const active = e.match ? e.match(pathname) : pathname === e.to;
                  return (
                    <li key={e.to}>
                      <Link to={e.to} aria-current={active ? "page" : undefined} onClick={onClose} className={`block h-full rounded-sm border p-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 ${active ? "border-red-500/60 bg-red-500/10" : "border-white/10 bg-white/[0.04] hover:border-white/40 hover:bg-white/[0.08]"}`}>
                        <span className={`block text-lg font-bold ${active ? "text-red-400" : "text-white"}`}>{e.title}</span>
                        <span className="mt-0.5 block text-sm text-zinc-400">{e.note}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <div className="flex items-center gap-3 border-t border-white/10 pt-6">
            <span className="text-xs uppercase tracking-widest text-zinc-500">Typeface</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

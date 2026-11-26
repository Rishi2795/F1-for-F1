import { CalendarDays, Gamepad2, Gauge, House, Menu, Newspaper, Search, Trophy, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { MenuSheet } from "./menusheet";

/** Pages that live under the Pit Wall, so its tab stays lit while you use one of them. */
const PIT_WALL = ["/pitwall", "/team-pace", "/forecast", "/watch", "/duels", "/ratings"];
/** Pages reached through the Menu rather than a tab of their own. */
const IN_MENU = ["/about_app", "/methodology", "/drivers", "/driver/", "/circuits", "/circuit/", "/play", "/my"];

const TABS: { label: string; path: string; Icon: LucideIcon; on: (p: string) => boolean }[] = [
  { label: "Home", path: "/", Icon: House, on: (p) => p === "/" },
  { label: "Schedule", path: "/schedule", Icon: CalendarDays, on: (p) => p === "/schedule" || p === "/explore" || p.startsWith("/race/") },
  { label: "Standings", path: "/standings", Icon: Trophy, on: (p) => p === "/standings" || p.startsWith("/season/") },
  { label: "News", path: "/news", Icon: Newspaper, on: (p) => p === "/news" },
  { label: "Pit Wall", path: "/pitwall", Icon: Gauge, on: (p) => PIT_WALL.some((t) => p.startsWith(t)) },
  { label: "Sim", path: "/simulation", Icon: Gamepad2, on: (p) => p === "/simulation" },
];

const base = "group relative flex h-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:h-10";
const off = `${base} w-9 text-zinc-300 hover:bg-white/10 hover:text-white sm:w-10`;
const on = `${base} gap-1.5 bg-white px-3 text-black sm:gap-2 sm:px-4`;

/** A slim pill of icons: each main place, a Menu for everything else, and search. The place you are in opens into a white pill
 *  with its name. Every icon keeps its name for screen readers. It fades after a few idle seconds and comes back with any movement, touch or key. */
export default function FloatingDock() {
  const { pathname } = useLocation();
  // The menu is open for the page it was opened on: going to another page closes it, with no effect needed to say so.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const menuOpen = openAt === pathname;
  const [isVisible, setIsVisible] = useState(true);
  const root = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    // Never fades while someone is using it with a keyboard: a focused link inside a hidden bar is invisible, which makes
    // keyboard use impossible.
    const wake = () => {
      setIsVisible(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (!root.current?.contains(document.activeElement)) setIsVisible(false);
      }, 3000);
    };

    const events = ["mousemove", "touchstart", "keydown", "focusin"] as const;
    events.forEach((e) => window.addEventListener(e, wake));
    wake();
    return () => {
      events.forEach((e) => window.removeEventListener(e, wake));
      clearTimeout(timeout);
    };
  }, []);

  const closeMenu = () => {
    setOpenAt(null);
    menuButton.current?.focus(); // hand focus back to where it came from
  };
  const menuLit = menuOpen || IN_MENU.some((p) => pathname.startsWith(p));
  return (
    <nav
      ref={root}
      aria-label="Main"
      className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transition-all duration-500 sm:bottom-6 ${isVisible || menuOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
    >
      <div className="flex max-w-[calc(100vw-1rem)] items-center gap-0.5 rounded-full border border-white/10 bg-black/70 p-1 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:gap-1 sm:p-1.5">
        {TABS.map(({ label: name, path, Icon, on: isOn }) => {
          const active = isOn(pathname);
          return (
            <Link key={name} to={path} title={name} aria-current={active ? "page" : undefined} className={active ? on : off}>
              <Icon aria-hidden="true" size={18} strokeWidth={active ? 2.4 : 1.9} />
              <span className={active ? "text-xs font-bold leading-none sm:text-[13px]" : "sr-only"}>{name}</span>
            </Link>
          );
        })}
        <button ref={menuButton} type="button" title="Menu" aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setOpenAt(menuOpen ? null : pathname)} className={menuLit ? on : off}>
          <Menu aria-hidden="true" size={18} strokeWidth={menuLit ? 2.4 : 1.9} />
          <span className={menuLit ? "text-xs font-bold leading-none sm:text-[13px]" : "sr-only"}>Menu</span>
        </button>
        <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-white/15" />
        <button type="button" title="Search (⌘K)" aria-label="⌘K: open search" onClick={() => window.dispatchEvent(new Event("f1:search"))} className={`${off} hidden sm:flex sm:w-auto sm:gap-2 sm:px-3`}>
          <Search aria-hidden="true" size={18} strokeWidth={1.9} />
          <span aria-hidden="true" className="hidden font-mono text-[10px] leading-none text-zinc-400 group-hover:text-zinc-200 sm:inline">⌘K</span>
        </button>
      </div>
      {menuOpen && createPortal(<MenuSheet onClose={closeMenu} onSearch={() => window.dispatchEvent(new Event("f1:search"))} />, document.body)}
    </nav>
  );
}

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { MenuSheet } from "./layout/menusheet";

const TOOLS = ["/pitwall", "/team-pace", "/forecast", "/watch", "/duels", "/ratings", "/circuits", "/circuit/", "/play", "/my"];

const items = [
  { label: "Home", path: "/" },
  { label: "Races", path: "/explore" },
  { label: "Standings", path: "/standings" },
  { label: "Pit Wall", path: "/pitwall" },
  { label: "Sim", path: "/simulation" },
];

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

    // The dock fades after a few idle seconds and comes back with any movement, touch or key. It never fades while someone
    // is using it with a keyboard: a focused link inside a hidden dock is invisible, which makes keyboard use impossible.
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

  return (
    <nav
      ref={root}
      aria-label="Main"
      className={`
        fixed
        bottom-6 left-1/2
        -translate-x-1/2
        z-50
        transition-all duration-500
        ${isVisible || menuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
      `}
    >
      <div
        className="
          flex max-w-[calc(100vw-1.5rem)] items-center gap-2.5 sm:gap-6
          px-3.5 py-3 sm:px-8
          rounded-full
          bg-white/[0.06] backdrop-blur-xl
         
          border border-white/10
         
        "
      >
        {items.map((item) => {
          const active =
            pathname === item.path ||
            (item.path === "/standings" && pathname.startsWith("/season/")) ||
            (item.path === "/pitwall" && TOOLS.some((t) => pathname.startsWith(t)));

          return (
            <Link
              key={item.label}
              to={item.path}
              aria-current={active ? "page" : undefined}
              className={`
                relative whitespace-nowrap
                text-[13px] font-medium sm:text-sm
                transition-all
                rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600
                ${active ? "text-red-500" : "text-zinc-300 hover:text-white"}
              `}
            >
              {item.label}

              {/* Active underline */}
              {active && (
                <span
                  className="
                    absolute
                    left-0 right-0
                    -bottom-2
                    h-[2px]
                    bg-red-600
                    rounded-full
                  "
                />
              )}
            </Link>
          );
        })}
        <button
          ref={menuButton}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          onClick={() => setOpenAt(menuOpen ? null : pathname)}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600 sm:text-sm ${menuOpen || ["/about_app", "/methodology", "/drivers", "/play", "/my", "/watch", "/duels", "/ratings", "/forecast", "/team-pace", "/circuits"].some((p) => pathname.startsWith(p)) ? "text-red-500" : "text-zinc-300 hover:text-white"}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          Menu
        </button>
        <button
          type="button"
          aria-label="⌘K: open search"
          onClick={() => window.dispatchEvent(new Event("f1:search"))}
          className="rounded-sm border border-white/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-300 transition-colors hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600"
        >
          <span className="hidden sm:inline">⌘K</span>
          <svg className="sm:hidden" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        </button>
      </div>
      {menuOpen && createPortal(<MenuSheet onClose={closeMenu} onSearch={() => window.dispatchEvent(new Event("f1:search"))} />, document.body)}
    </nav>
  );
}

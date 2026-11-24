import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

const items = [
  { label: "Home", path: "/" },
  { label: "Races", path: "/explore" },
  { label: "Standings", path: "/standings" },
  { label: "Sim", path: "/simulation" },
  { label: "About", path: "/about_app" },
];

export default function FloatingDock() {
  const { pathname } = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    // The dock fades after a few idle seconds, but never while someone is using it with a keyboard:
    // a focused link inside a hidden dock is invisible, which makes keyboard navigation impossible.
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
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
      `}
    >
      <div
        className="
          flex items-center gap-6
          px-8 py-3
          rounded-full
          bg-white/5
          backdrop-blur-xl
          border border-white/10
          shadow-xl shadow-black/40
        "
      >
        {items.map((item) => {
          const active = pathname === item.path || (item.path === "/standings" && pathname.startsWith("/season/"));

          return (
            <Link
              key={item.label}
              to={item.path}
              aria-current={active ? "page" : undefined}
              className={`
                relative
                text-sm font-medium
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
      </div>
    </nav>
  );
}

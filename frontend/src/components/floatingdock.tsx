import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const items = [
  { label: "Home", path: "/" },
  { label: "Races", path: "/explore" },
  { label: "Sim", path: "/simulation" },
  { label: "About", path: "/about_app" },
];

export default function FloatingDock() {
  const { pathname } = useLocation();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Fixed: Using ReturnType<typeof setTimeout> avoids the NodeJS error
    let timeout: ReturnType<typeof setTimeout>;

    const handleActivity = () => {
      setIsVisible(true);
      clearTimeout(timeout);
      // Hides the dock after 3 seconds of inactivity
      timeout = setTimeout(() => setIsVisible(false), 3000);
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    handleActivity();

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div
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
          const active = pathname === item.path;

          return (
            <Link
              key={item.label}
              to={item.path}
              className={`
                relative
                text-sm font-medium
                transition-all
                ${active ? "text-red-600" : "text-zinc-400 hover:text-white"}
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
    </div>
  );
}
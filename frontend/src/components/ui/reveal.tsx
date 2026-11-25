import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fades its content up the first time it scrolls into view. With reduced motion (or no
 *  IntersectionObserver) it is simply visible: the CSS turns the effect off. */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`f1-in ${seen ? "is-in" : ""} ${className}`}>
      {children}
    </div>
  );
}

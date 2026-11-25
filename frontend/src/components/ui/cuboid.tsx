import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, useSyncExternalStore, type ReactNode } from "react";

/** True while the window is at least `px` wide (kept in step as it resizes, without an effect). */
function useMinWidth(px: number): boolean {
  return useSyncExternalStore(
    (cb) => {
      const q = window.matchMedia(`(min-width: ${px}px)`);
      q.addEventListener("change", cb);
      return () => q.removeEventListener("change", cb);
    },
    () => window.matchMedia(`(min-width: ${px}px)`).matches,
    () => false,
  );
}

/** The column that holds the faces: it gives them their depth (perspective). */
export function CuboidStack({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={className} style={{ perspective: "1500px", perspectiveOrigin: "50% 45%" }}>
      {children}
    </div>
  );
}

/** One face of a turning drum. As it rolls up from the bottom of the screen it tilts back (top edge away), sits flat while it is
 *  in the middle, and tilts away again as it leaves at the top, dimming a little at the edges the way a turning face does.
 *  Only on wide screens, and never with reduced motion: on a phone or for anyone who asks for less, it is just a card. */
export function CuboidFace({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const wide = useMinWidth(1024);
  // 0: the card's top edge has just come up at the bottom of the screen. 1: its bottom edge is leaving at the top.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const stops = [0, 0.26, 0.74, 1];
  const rotateX = useTransform(scrollYProgress, stops, [44, 0, 0, -44]);
  const z = useTransform(scrollYProgress, stops, [-180, 0, 0, -180]);
  const shade = useTransform(scrollYProgress, stops, [0.5, 1, 1, 0.5]);
  const filter = useMotionTemplate`brightness(${shade})`;
  // The element and its scroll tracking always exist (the library needs the target even when the effect is off); on a phone
  // or with reduced motion it simply gets no transform.
  const on = !still && wide;
  return (
    <motion.div ref={ref} style={on ? { rotateX, z, filter, willChange: "transform" } : undefined}>
      {children}
    </motion.div>
  );
}

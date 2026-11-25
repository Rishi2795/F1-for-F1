import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/** A number that counts up from zero the first time it scrolls into view (and simply shows the value with reduced motion). */
export function CountUp({ to, className = "" }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const still = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView || still) return;
    const controls = animate(0, to, { duration: 1.6, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [inView, still, to]);
  return <span ref={ref} className={className}>{(still ? to : shown).toLocaleString("en-GB")}</span>;
}

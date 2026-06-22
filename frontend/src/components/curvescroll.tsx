import { motion, useScroll, useSpring } from "framer-motion";

export default function TopProgress() {
  const { scrollYProgress } = useScroll();
  
  // Spring physics makes the bar "liquid"—it won't stutter on mobile touch
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[200] origin-left bg-red-600"
      style={{ 
        scaleX,
        /* 2px on mobile, 3px on desktop for that sharp F1 look */
        height: 'clamp(2px, 0.5vh, 4px)',
        boxShadow: '0 0 10px rgba(220, 38, 38, 0.8)' 
      }}
    />
  );
}
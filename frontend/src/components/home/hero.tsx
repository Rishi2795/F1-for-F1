import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { hideBroken } from "../../lib/images";

const EASE = [0.22, 1, 0.36, 1] as const;

const Hero = () => {
  const navigate = useNavigate();
  const section = useRef<HTMLElement>(null);
  const still = useReducedMotion();
  const assets = {
    desktopBg: "https://media.formula1.com/image/upload/c_lfill,w_3392/q_auto/v1740000000/fom-website/2026%20regulations/2026_Explainer_FIA_Front_3_4_1920x1080.webp",
    desktopCutout: "/f1_new-hd.webp",
    mobileBg: "https://www.autohebdo.fr/app/uploads/2025/12/G8X2yH-WAAAtXkx.jpg",
    mobileCutout: "/top_down-f1.webp",
  };

  /* Scrolling away is part of the animation: the car drives off towards you while the headline lifts and fades, so the
     page below arrives as the next scene instead of a hard cut. */
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end start"] });
  const move = (to: number) => (still ? 0 : to);
  const carY = useTransform(scrollYProgress, [0, 1], [0, move(140)]);
  const carScale = useTransform(scrollYProgress, [0, 1], [1, still ? 1 : 1.08]);
  const carOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, move(-150)]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  /* Pointer parallax on desktop: the headline and the car drift in opposite directions, which reads as depth. */
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 70, damping: 18 });
  const sy = useSpring(py, { stiffness: 70, damping: 18 });
  const carX = useTransform(sx, [-0.5, 0.5], [still ? 0 : 14, still ? 0 : -14]);
  const carShift = useTransform(sy, [-0.5, 0.5], [still ? 0 : 5, still ? 0 : -5]);
  const titleX = useTransform(sx, [-0.5, 0.5], [still ? 0 : -8, still ? 0 : 8]);
  const onMove = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <section ref={section} data-scene data-hero data-title="Start" onMouseMove={onMove} className="home-scene relative min-h-[100svh] w-full bg-[#050505] overflow-hidden flex flex-col">
      {/* ==========================================
          DESKTOP VIEW
      ========================================== */}
      <div className="hidden md:block absolute inset-0 bg-black">
        {/* The shifted background would leave a hard edge at the top: blend it into the page */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-44 bg-gradient-to-b from-black via-black/80 to-transparent" />

        {/* Background photo and car cutout are the same shot, one baked into the other: they are drawn at exactly the same size and
            position and move as ONE block (entrance, scroll, pointer). Moving them separately shows a ghost second car. */}
        <motion.div style={{ x: carX, y: carY, scale: carScale, opacity: carOpacity }} className="pointer-events-none absolute inset-x-0 -bottom-[100px] top-[100px] z-[1]">
          <motion.div
            style={{ y: carShift }}
            initial={{ opacity: 0, x: 90 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ opacity: { duration: 1.1, delay: 0.25, ease: "easeOut" }, x: { duration: 1.5, delay: 0.25, ease: EASE } }}
            className="relative h-full w-full"
          >
            <img src={assets.desktopBg} referrerPolicy="no-referrer" onError={hideBroken} className="absolute inset-0 h-full w-full object-cover object-center brightness-[0.25]" alt="" />
            {/* a soft red rim light between the photo and the cutout, so it glows behind the car, not over it */}
            <motion.div aria-hidden="true" className="absolute bottom-[8%] left-[18%] z-10 h-[40%] w-[62%] rounded-full bg-red-700/30 blur-[110px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2.4, delay: 0.7, ease: "easeOut" }} />
            <img src={assets.desktopCutout} className="absolute inset-0 z-20 h-full w-full object-cover object-center drop-shadow-[0_30px_60px_rgba(0,0,0,1)]" alt="A 2026-era Formula 1 car" />
          </motion.div>
        </motion.div>

        {/* The shifted photo would leave a hard edge at the top: blend it into the page */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-44 bg-gradient-to-b from-black via-black/80 to-transparent" />

        {/* Layer 2: headline, each line rising out of a mask */}
        <motion.div style={{ y: titleY, x: titleX, opacity: titleOpacity }} className="absolute inset-0 z-10 flex flex-col justify-start pt-[4dvh] px-8 lg:px-12 pointer-events-none">
          <h2 className="flex flex-col text-left">
            <span className="block overflow-hidden pb-[0.06em]">
              <motion.span initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 1, delay: 0.2, ease: EASE }} className="block text-[clamp(5rem,10.5vw,10rem)] font-black italic tracking-tighter leading-[0.8] uppercase text-white drop-shadow-2xl">
                F1 FOR
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-[0.06em]">
              <motion.span initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 1, delay: 0.38, ease: EASE }} className="block text-[clamp(5rem,10.5vw,10rem)] font-black italic tracking-tighter leading-[0.8] uppercase text-transparent [-webkit-text-stroke:2px_#dc2626]">
                FORMULA 1
              </motion.span>
            </span>
          </h2>
        </motion.div>

      </div>

      {/* ==========================================
          MOBILE ENGINE (sm only)
      ========================================== */}
      <div className="block md:hidden absolute inset-0">
        <motion.div style={{ y: titleY, opacity: titleOpacity }} className="absolute inset-0 z-20 flex flex-col justify-start pt-[12dvh] px-6 text-center pointer-events-none">
          <h2 className="flex flex-col">
            <span className="block overflow-hidden pb-[0.06em]">
              <motion.span initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.2, ease: EASE }} className="block text-[13vw] font-black italic tracking-tighter leading-[0.8] text-white">F1 FOR</motion.span>
            </span>
            <span className="block overflow-hidden pb-[0.06em]">
              <motion.span initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.34, ease: EASE }} className="block text-[13vw] font-black italic tracking-tighter leading-[0.8] text-red-500 [-webkit-text-stroke:1px_#dc2626]">FORMULA 1</motion.span>
            </span>
          </h2>
        </motion.div>

        {/* Same rule as desktop: photo and cutout are one shot and move together */}
        <motion.div style={{ y: carY, scale: carScale, opacity: carOpacity }} className="pointer-events-none absolute inset-0 z-10">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.3, delay: 0.25, ease: EASE }} className="relative h-full w-full">
            <img src={assets.mobileBg} referrerPolicy="no-referrer" onError={hideBroken} className="absolute inset-0 h-full w-full object-cover brightness-[0.4]" alt="" />
            <img src={assets.mobileCutout} className="absolute inset-0 h-full w-full object-cover object-center" alt="A Formula 1 car seen from above" />
          </motion.div>
        </motion.div>
      </div>

      {/* ==========================================
          UNIVERSAL UI (Navigation & Buttons)
      ========================================== */}
      <div className="relative z-30 w-full min-h-[100dvh] flex flex-col p-8 pointer-events-none">
        <motion.div style={{ opacity: cueOpacity }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.5, ease: EASE }} className="mt-auto pb-44 md:pb-12 flex justify-center md:justify-start">
          <button onClick={() => navigate("/explore")} className="group flex flex-col items-center md:items-start gap-2 pointer-events-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-red-600">
            <span className="flex items-center gap-3 text-[10px] font-black italic text-red-500 tracking-[0.5em] uppercase">
              Start_exploring
              <motion.span aria-hidden="true" animate={still ? undefined : { x: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>→</motion.span>
            </span>
            <div className="w-12 h-[1px] bg-red-600/40 group-hover:w-24 transition-all duration-500" />
          </button>
        </motion.div>
      </div>

      {/* Finishing Vignette: the hero fades into the next section */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#050505] to-transparent z-[25] pointer-events-none" />
    </section>
  );
};

export default Hero;

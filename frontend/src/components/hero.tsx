import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();
  const assets = {
    desktopBg: "https://media.formula1.com/image/upload/c_lfill,w_3392/q_auto/v1740000000/fom-website/2026%20regulations/2026_Explainer_FIA_Front_3_4_1920x1080.webp",
    desktopCutout: "/f1_new-hd.png",
    mobileBg: "https://www.autohebdo.fr/app/uploads/2025/12/G8X2yH-WAAAtXkx.jpg",
    mobileCutout: "/top_down-f1.png",
  };

  return (
    <section className="relative min-h-[100dvh] w-full bg-[#050505] overflow-hidden flex flex-col">
      
  {/* ==========================================
    DESKTOP VIEW (Perfectly Synchronized)
========================================== */}
<div className="hidden md:block absolute inset-0 bg-black">
  
  {/* Layer 1: Base Background */}
  <div className="absolute inset-0 z-0">
    <motion.img 
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1,
        y: 100 // MATCHED: Sync with car
      }}
      transition={{ duration: 1.5 }}
      src={assets.desktopBg} 
      className="w-full h-full object-cover object-center brightness-[0.25] scale-110" 
      alt="Background"
    />
  </div>

  {/* Layer 2: 3D Text */}
  <div className="absolute inset-0 z-10 flex flex-col justify-start pt-[4dvh] px-16 pointer-events-none">
    <h2 className="flex flex-col text-left">
      <motion.span className="text-[11rem] font-black italic tracking-tighter leading-[0.8] uppercase text-white drop-shadow-2xl">
        F1 FOR
      </motion.span>
      <motion.span className="text-[11rem] font-black italic tracking-tighter leading-[0.8] uppercase text-transparent [-webkit-text-stroke:2px_#dc2626]">
        FORMULA 1
      </motion.span>
    </h2>
  </div>

  {/* Layer 3: The Foreground Car */}
  <div className="absolute inset-0 z-20 pointer-events-none">
    <motion.img 
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 100 // MATCHED: Sync with background
      }}
      transition={{ duration: 1.5 }}
      src={assets.desktopCutout} 
      className="w-full h-full object-cover object-center drop-shadow-[0_30px_60px_rgba(0,0,0,1)]" 
      alt="Car Overlay"
    />
  </div>
</div>
      {/* ==========================================
          MOBILE ENGINE (sm only)
      ========================================== */}
      <div className="block md:hidden absolute inset-0">
        {/* Top-Down BG */}
        <img src={assets.mobileBg} className="w-full h-full object-cover brightness-[0.4]" alt="F1 Mobile" />
        
        {/* MOBILE TEXT: Centered and High */}
        <div className="absolute inset-0 z-20 flex flex-col justify-start pt-[12dvh] px-6 text-center pointer-events-none">
          <h2 className="flex flex-col">
            <motion.span className="text-[15vw] font-black italic tracking-tighter leading-[0.8] text-white">
              F1 FOR
            </motion.span>
            <motion.span className="text-[15vw] font-black italic tracking-tighter leading-[0.8] text-red-600 [-webkit-text-stroke:1px_#dc2626]">
              FORMULA 1
            </motion.span>
          </h2>
        </div>

        {/* MOBILE CAR: Scaled to fill vertical space */}
        {/* MOBILE CAR: Full-Bleed Vertical Alignment */}
<div className="absolute inset-0 z-10">
  <motion.img 
    initial={{ 
      scale: 1.1, // Start slightly larger
      opacity: 0,
      y: 20 
    }} 
    animate={{ 
      scale: 1, // Settle to 100% width/height
      opacity: 1,
      y: 0 
    }}
    transition={{ duration: 1.2, ease: "easeOut" }}
    src={assets.mobileCutout} 
    /* CHANGE: object-cover makes the car stay "tall" and fill the screen 
       without being squeezed or pushed by padding.
    */
    className="w-full h-full object-cover object-center pointer-events-none" 
  />
</div>
      </div>

      {/* ==========================================
          UNIVERSAL UI (Navigation & Buttons)
      ========================================== */}
      <div className="relative z-30 w-full min-h-[100dvh] flex flex-col p-8 pointer-events-none">
        <div className="mt-auto pb-44 md:pb-12 flex justify-center md:justify-start">
            <button 
              onClick={() => navigate("/explore")} // 3. Add the redirect path
              className="group flex flex-col items-center md:items-start gap-2 pointer-events-auto"
            >
               <span className="text-[10px] font-black italic text-red-600 tracking-[0.5em] uppercase">
                 Start_exploring
               </span>
               <div className="w-12 h-[1px] bg-red-600/40 group-hover:w-20 transition-all duration-300" />
            </button>
        </div>
      </div>

      {/* Finishing Vignette */}
      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#050505] to-transparent z-25 pointer-events-none" />
    </section>
  );
};

export default Hero;
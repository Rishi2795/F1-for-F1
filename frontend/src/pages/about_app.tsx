import { motion } from "framer-motion";

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden">

      {/* ================= HERO ================= */}
      <section className="relative pt-32 pb-24 px-6 md:px-12 border-b border-white/5">

        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />

        {/* Scanline */}
        <motion.div
          animate={{ translateY: ["0%", "1200%"] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 left-0 w-full h-[2px] bg-red-600/20"
        />

        <div className="max-w-[1400px] mx-auto relative z-10">

          <p className="text-red-600 font-mono text-xs tracking-[0.4em] mb-5">
            FORMULA 1 DATA SYSTEM
          </p>

          <h1 className="text-5xl md:text-8xl font-black uppercase italic leading-tight">

            Where Speed <br />
            Meets <span className="text-red-600">Intelligence</span>

          </h1>

          <p className="mt-8 max-w-2xl text-zinc-400 text-lg italic border-l-2 border-red-600 pl-6">

            A performance-driven Formula 1 analytics platform built to
            understand racing beyond lap times and podiums.

          </p>

        </div>

      </section>


      {/* ================= ABOUT ME ================= */}
      <section className="py-24 px-6 md:px-12 bg-zinc-950/70">

        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">


          {/* Vertical Image */}
          <div className="relative group">

            <div className="absolute -inset-4 border border-white/5 group-hover:border-red-600/30 transition duration-700" />

            <div className="relative w-full max-w-sm mx-auto aspect-[3/4] bg-zinc-900 overflow-hidden border border-white/10">

              {/* Replace with your portrait */}
              <img
                src="/rishi-dr-44.jpeg"
                alt="Rishi"
                className="w-full h-full object-cover grayscale group-hover:scale-105 transition duration-1000"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent" />

              <div className="absolute bottom-6 left-6">

                <p className="text-red-600 text-xs font-mono mb-1">
                  Developer
                </p>

                <h3 className="text-2xl font-black uppercase italic">
                  Rishi Marrivada
                </h3>

              </div>

            </div>

          </div>


          {/* Bio */}
          <div className="space-y-8">

            <h2 className="text-3xl font-black uppercase">

              Who Am I?

            </h2>

            <p className="text-zinc-400 leading-relaxed">

              I am a Computer Science student and motorsport enthusiast who
              believes that racing is not just about drivers and cars —
              it is about data, strategy, and engineering excellence.

            </p>

            <p className="text-zinc-400 leading-relaxed">

              My interest in Formula 1 and software development merged into
              this platform, where I transform raw race telemetry into
              meaningful insights and visual narratives.

            </p>

            <p className="text-zinc-400 leading-relaxed">

              This project represents my journey in full-stack development,
              data engineering, and system design.

            </p>


            {/* Skills */}
            <div className="flex flex-wrap gap-3 pt-4">

              {[
                "React",
                "Tailwind CSS",
                "FastF1 API",
                "Node.js",
                "MongoDB",
                "Data Visualization",
                "Analytics",
                "System Design"
              ].map((skill) => (

                <span
                  key={skill}
                  className="px-4 py-1.5 text-xs border border-white/10 bg-white/5 uppercase tracking-wider"
                >
                  {skill}
                </span>

              ))}

            </div>

          </div>

        </div>

      </section>


      {/* ================= WHY ================= */}
      <section className="py-24 px-6 md:px-12 border-t border-white/5">

        <div className="max-w-4xl mx-auto text-center">

          <h2 className="text-4xl font-black uppercase mb-10">

            Why This Platform Exists

          </h2>

          <p className="text-zinc-400 leading-relaxed mb-6">

            Most Formula 1 websites focus only on headlines, standings,
            and highlights. They rarely explain *why* a race was won or lost.

          </p>

          <p className="text-zinc-400 leading-relaxed mb-6">

            Fans see lap times — but not tyre degradation, fuel loads,
            pace evolution, or strategic trade-offs.

          </p>

          <p className="text-zinc-400 leading-relaxed">

            This platform was built to close that gap by providing
            technical clarity, transparent data, and deep analytical tools.

          </p>

        </div>

      </section>


      {/* ================= THEORY ================= */}
      <section className="py-24 px-6 md:px-12 bg-zinc-950/70 border-t border-white/5">

        <div className="max-w-5xl mx-auto">

          <h2 className="text-4xl font-black uppercase mb-12 text-center">

            System Theory & Architecture

          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">


            {/* Step 1 */}
            <div className="p-8 border border-white/5 bg-black/40">

              <h3 className="text-xl font-bold mb-4 text-red-600">
                1. Data Collection
              </h3>

              <p className="text-zinc-400 text-sm leading-relaxed">

                Race telemetry, lap data, weather conditions, and timing
                information are fetched using the FastF1 API and
                validated against FIA sources.

              </p>

            </div>


            {/* Step 2 */}
            <div className="p-8 border border-white/5 bg-black/40">

              <h3 className="text-xl font-bold mb-4 text-red-600">
                2. Processing Layer
              </h3>

              <p className="text-zinc-400 text-sm leading-relaxed">

                Raw datasets are cleaned, normalized, and structured
                using backend pipelines to remove inconsistencies
                and missing values.

              </p>

            </div>


            {/* Step 3 */}
            <div className="p-8 border border-white/5 bg-black/40">

              <h3 className="text-xl font-bold mb-4 text-red-600">
                3. Visualization
              </h3>

              <p className="text-zinc-400 text-sm leading-relaxed">

                Processed data is rendered into interactive charts,
                comparative dashboards, and predictive models
                using modern frontend frameworks.

              </p>

            </div>

          </div>

        </div>

      </section>


      {/* ================= CTA ================= */}
      <section className="py-32 px-6 text-center border-t border-white/5">

        <h2 className="text-4xl md:text-6xl font-black uppercase italic mb-10">

          Explore the Data.
          <span className="text-red-600"> Understand the Race.</span>

        </h2>

        <button className="px-12 py-5 bg-red-600 text-black font-black uppercase tracking-widest text-xs skew-x-[-12deg]">

          Go to Dashboard

        </button>

      </section>


      {/* ================= FOOTER ================= */}
      <footer className="py-10 px-6 bg-black text-center text-xs text-zinc-500">

        Built by Rishi Marrivada • F1 Analytics Platform • 2026

      </footer>

    </div>
  );
};

export default AboutPage;

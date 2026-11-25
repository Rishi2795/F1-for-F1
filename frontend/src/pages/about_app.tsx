import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { AboutHero } from "../components/about/abouthero";
import { CountUp } from "../components/about/countup";
import { Reveal } from "../components/ui/reveal";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

type Coverage = { seasons: Record<string, { played: number; ok: number }> };

const TOOLS = [
  { to: "/explore", tag: "RACE LAB", title: "Replay any race", text: "The race on the real circuit: pit stops, passes, retirements, gaps and pace, and for recent races where every car really was." },
  { to: "/forecast", tag: "FORECAST", title: "Odds, scored in public", text: "Win, podium and title chances from a published model, checked against what actually happened, misses included." },
  { to: "/ratings", tag: "RATINGS", title: "Driver or car?", text: "Splits every result into driver skill and car strength, using teammates as the control." },
  { to: "/pitwall", tag: "PIT WALL", title: "Strategy tools", text: "Tyre models, strategy what-ifs and championship maths, with a simple view and a pro view." },
  { to: "/team-pace", tag: "TEAM PACE", title: "Who is improving", text: "Race pace of every team, round by round: who is catching up and who is fading." },
  { to: "/circuits", tag: "CIRCUITS", title: "Every track, drawn", text: "Real outlines from car position data, with overtaking, safety-car and strategy profiles." },
  { to: "/duels", tag: "DUELS", title: "Teammate head-to-heads", text: "The fairest comparison in the sport: same car, qualifying, race, pace and points." },
  { to: "/play", tag: "PLAY", title: "Beat the model", text: "Pick the podium before the race and see whether you out-called the forecast. Stays on your device." },
];

const FLOW = [
  { n: "01", title: "Free, public sources", text: "Results and pit stops from Jolpica. Laps, tyres and weather from the TracingInsights archive. Positions, car data and race control from OpenF1." },
  { n: "02", title: "Checked, never guessed", text: "Sources are cross-checked. A value nobody can confirm stays blank, not estimated. Every number records where it came from, and a quality gate blocks bad data." },
  { n: "03", title: "Published as static files", text: "Everything is computed ahead of time and served as plain files, so pages load in milliseconds and no visit ever calls the sources." },
  { n: "04", title: "This site", text: "Charts, replays and models read those files. A scheduled job refreshes them after each race." },
];

const LIMITS = [
  ["Not a live feed", "Results arrive after the race, when the sources publish them: usually within hours, not seconds."],
  ["Replays are for recent races", "Real car positions and sensor readings exist for the newest races. Older ones are placed from lap timing, and the page says which you are looking at."],
  ["Forecasts are probabilities", "Motor racing is noisy and retirements are close to unpredictable. The accuracy is published, including where the model was wrong."],
  ["Independent", "This project is not affiliated with Formula 1, the FIA or any team."],
];

export default function AboutPage() {
  useDocumentTitle("About");
  const coverage = useApi<Coverage>("/coverage").data;
  const seasons = coverage ? Object.keys(coverage.seasons).length : 0;
  const played = coverage ? Object.values(coverage.seasons).reduce((a, s) => a + s.played, 0) : 0;
  const ok = coverage ? Object.values(coverage.seasons).reduce((a, s) => a + s.ok, 0) : 0;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] font-sans text-white">
      <AboutHero />

      {/* ================= NUMBERS ================= */}
      <section aria-label="The data in numbers" className="border-b border-white/5">
        <dl className="mx-auto grid max-w-[1300px] grid-cols-2 gap-px bg-white/10 md:grid-cols-4">
          {[
            { v: seasons, l: "seasons covered" },
            { v: played, l: "races analysed" },
            { v: ok, l: "with complete data" },
            { v: 0, l: "logins, ads or trackers" },
          ].map((s) => (
            <div key={s.l} className="bg-[#050505] px-6 py-10 text-center md:py-14">
              <dd className="font-serif text-5xl font-bold tabular-nums text-white md:text-7xl">{coverage || s.v === 0 ? <CountUp to={s.v} /> : "—"}</dd>
              <dt className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{s.l}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ================= WHAT YOU CAN DO ================= */}
      <section id="what" className="scroll-mt-10 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-[1300px]">
          <Reveal>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.4em] text-red-500">What is here</p>
            <h2 className="max-w-3xl text-4xl font-black uppercase italic leading-[0.95] tracking-tighter md:text-6xl">Answers, not just <span className="text-red-500">tables.</span></h2>
            <p className="mt-6 max-w-2xl text-lg text-zinc-400">Most sites show you what happened. These tools are built around the questions fans actually ask: was it a good race, was the strategy right, is it the driver or the car.</p>
          </Reveal>
          <div className="mt-14 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((t, i) => (
              <motion.div key={t.to} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-8%" }} transition={{ duration: 0.55, delay: (i % 4) * 0.08 }} className="bg-[#050505]">
                <Link to={t.to} className="group flex h-full flex-col gap-4 p-7 transition-colors hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red-600">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-red-500">{t.tag}</span>
                  <h3 className="text-2xl font-black uppercase italic leading-none tracking-tight">{t.title}</h3>
                  <p className="flex-1 text-sm leading-relaxed text-zinc-400">{t.text}</p>
                  <span aria-hidden="true" className="font-mono text-xs text-zinc-500 transition group-hover:translate-x-1 group-hover:text-white">Open →</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= HOW THE DATA FLOWS ================= */}
      <section className="border-t border-white/5 bg-zinc-950/70 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-[1300px]">
          <Reveal>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.4em] text-red-500">How it works</p>
            <h2 className="max-w-3xl text-4xl font-black uppercase italic leading-[0.95] tracking-tighter md:text-6xl">From a timing feed to <span className="text-red-500">a number you can trust.</span></h2>
          </Reveal>
          <div className="relative mt-16">
            <motion.div aria-hidden="true" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: "easeOut" }} className="absolute left-0 right-0 top-[1.15rem] hidden h-px origin-left bg-gradient-to-r from-red-600 via-red-600/50 to-transparent lg:block" />
            <ol className="grid gap-10 lg:grid-cols-4 lg:gap-8">
              {FLOW.map((s, i) => (
                <motion.li key={s.n} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-8%" }} transition={{ duration: 0.6, delay: i * 0.15 }} className="relative">
                  <span className="relative z-10 mb-6 grid h-10 w-10 place-items-center border border-red-600 bg-[#09090b] font-mono text-xs font-bold text-red-500">{s.n}</span>
                  <h3 className="mb-3 text-xl font-black uppercase italic tracking-tight">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-zinc-400">{s.text}</p>
                </motion.li>
              ))}
            </ol>
          </div>
          <Reveal><p className="mt-12 text-sm text-zinc-500">The full method, including how each model was tested, is on the <Link to="/methodology" className="text-white underline decoration-red-600 underline-offset-4 hover:text-red-400">methodology page</Link>.</p></Reveal>
        </div>
      </section>

      {/* ================= HONEST LIMITS ================= */}
      <section className="border-t border-white/5 px-6 py-24 md:px-12">
        <div className="mx-auto grid max-w-[1300px] gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.4em] text-red-500">Straight talk</p>
            <h2 className="text-4xl font-black uppercase italic leading-[0.95] tracking-tighter md:text-5xl">What this site <span className="text-red-500">will not pretend.</span></h2>
          </Reveal>
          <dl className="divide-y divide-white/10 border-y border-white/10">
            {LIMITS.map(([t, d], i) => (
              <motion.div key={t} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-6%" }} transition={{ duration: 0.5, delay: i * 0.07 }} className="grid gap-2 py-6 md:grid-cols-[14rem_1fr] md:gap-8">
                <dt className="font-bold text-white">{t}</dt>
                <dd className="text-zinc-400">{d}</dd>
              </motion.div>
            ))}
          </dl>
        </div>
      </section>

      {/* ================= THE BUILDER ================= */}
      <section className="border-t border-white/5 bg-zinc-950/70 px-6 py-24 md:px-12">
        <div className="mx-auto grid max-w-[1300px] items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <div className="group relative mx-auto w-full max-w-sm">
              <div className="absolute -inset-4 border border-white/5 transition duration-700 group-hover:border-red-600/30" />
              <div className="relative aspect-[3/4] overflow-hidden border border-white/10 bg-zinc-900">
                <img src="/rishi-dr-44.jpeg" alt="Rishi Marrivada" className="h-full w-full object-cover grayscale transition duration-1000 group-hover:scale-105 group-hover:grayscale-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent" />
                <div className="absolute bottom-6 left-6">
                  <p className="mb-1 font-mono text-xs text-red-500">Developer</p>
                  <h3 className="text-2xl font-black uppercase italic">Rishi Marrivada</h3>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal className="space-y-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-red-500">The person behind it</p>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter md:text-5xl">Who am I?</h2>
            <p className="leading-relaxed text-zinc-400">I am a Computer Science student and motorsport enthusiast who believes that racing is not just about drivers and cars: it is about data, strategy and engineering excellence.</p>
            <p className="leading-relaxed text-zinc-400">My interest in Formula 1 and software development merged into this platform, where I turn raw race data into insights and visual stories. It is my journey through full-stack development, data engineering and system design.</p>
            <div className="flex flex-wrap gap-3 pt-2">
              {["React", "Tailwind CSS", "Python data pipeline", "Node.js", "FastAPI", "Data Visualization", "Analytics", "System Design"].map((skill) => (
                <span key={skill} className="border border-white/10 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-wider">{skill}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="relative overflow-hidden border-t border-white/5 px-6 py-32 text-center">
        <motion.div aria-hidden="true" className="absolute left-1/2 top-1/2 -z-0 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/15 blur-[120px]" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 8, repeat: Infinity }} />
        <Reveal className="relative">
          <h2 className="mb-10 text-4xl font-black uppercase italic leading-[0.95] tracking-tighter md:text-7xl">Explore the data.<br /><span className="text-red-500">Understand the race.</span></h2>
          <Link to="/explore" className="inline-block skew-x-[-12deg] bg-red-600 px-12 py-5 font-mono text-xs font-black uppercase tracking-[0.25em] text-black transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            <span className="inline-block skew-x-[12deg]">Go to the races</span>
          </Link>
        </Reveal>
      </section>

    </div>
  );
}

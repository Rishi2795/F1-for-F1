import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center flex-1 px-6 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          F1 Strat<span className="text-red-500">Hub</span>
        </h1>

        <p className="mt-4 max-w-2xl text-slate-400 text-lg">
          Decode what really wins races in modern Formula 1 — tyre strategies,
          track behavior, and race-winning patterns powered by real data.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate("/race/2023/1")}
            className="px-7 py-3 rounded-xl bg-red-600 hover:bg-red-500 transition font-semibold text-lg"
          >
            Explore 2023 Season
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="px-7 py-3 rounded-xl border border-slate-700 hover:border-slate-500 transition text-slate-300"
          >
            View Project
          </a>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-2">
              Winning Recipes
            </h3>
            <p className="text-slate-400 text-sm">
              Discover the most effective pit stop counts and tyre sequences
              that actually won races at each circuit.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-2">
              Track Personalities
            </h3>
            <p className="text-slate-400 text-sm">
              Identify tyre-saving tracks, high-degradation races, and circuits
              where track position matters most.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-2">
              Modern F1 Focus
            </h3>
            <p className="text-slate-400 text-sm">
              Built around the 2023–2025 regulation era to reflect how Formula 1
              is actually raced today.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        Built with real F1 race data · Not affiliated with Formula 1
      </footer>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import type { BundleMeta } from "../../types/api";

const SOURCES = [
  { name: "Jolpica-F1", href: "https://github.com/jolpica/jolpica-f1", what: "results, standings, pit stops" },
  { name: "TracingInsights", href: "https://github.com/TracingInsights", what: "lap times, tyres, weather" },
  { name: "OpenF1", href: "https://openf1.org", what: "tyre cross-checks" },
];

/** Credits, the disclaimer, and when the data was last built. */
export function Footer() {
  const meta = useApi<BundleMeta>("/meta").data;
  const updated = meta?.generated_at ? new Date(meta.generated_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : null;
  return (
    <footer className="border-t border-white/10 bg-black/50 backdrop-blur-xl px-6 py-10 pb-28 text-sm text-zinc-400">
      <div className="mx-auto grid max-w-[1400px] gap-8 md:grid-cols-3">
        <div>
          <p className="font-bold text-white">F1 for F1</p>
          <p className="mt-2 max-w-xs">An unofficial fan project. Not affiliated with, or endorsed by, Formula 1, the FIA or any team.</p>
        </div>
        <div>
          <p className="font-semibold text-white">Data</p>
          <ul className="mt-2 space-y-1">
            {SOURCES.map((s) => (
              <li key={s.name}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-zinc-300 underline underline-offset-4 hover:text-white">
                  {s.name}
                </a>{" "}
                <span className="text-zinc-500">· {s.what}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">About the numbers</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link to="/forecast" className="text-zinc-300 underline-offset-4 hover:text-white hover:underline">
                Race and title forecasts
              </Link>
            </li>
            <li>
              <Link to="/ratings" className="text-zinc-300 underline-offset-4 hover:text-white hover:underline">
                Driver &amp; car ratings
              </Link>
            </li>
            <li>
              <Link to="/methodology" className="text-zinc-300 underline-offset-4 hover:text-white hover:underline">
                Methodology and data coverage
              </Link>
            </li>
            <li>
              <a href="https://github.com/Rishi2795/F1-for-F1" target="_blank" rel="noopener noreferrer" className="text-zinc-300 underline-offset-4 hover:text-white hover:underline">
                Source code
              </a>
            </li>
            {updated && <li className="text-zinc-500">Data last built {updated}</li>}
          </ul>
        </div>
      </div>
    </footer>
  );
}

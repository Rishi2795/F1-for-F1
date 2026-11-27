import { Link } from "react-router-dom";
import { Logo } from "../ui/logo";
import { ArrowUp, ExternalLink } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { OFFICIAL_HEADSHOTS } from "../../lib/headshots";
import type { BundleMeta } from "../../types/api";

const SOURCES = [
  { name: "Jolpica-F1", href: "https://github.com/jolpica/jolpica-f1", what: "results, standings, pit stops" },
  { name: "TracingInsights", href: "https://github.com/TracingInsights", what: "lap times, tyres, weather" },
  { name: "OpenF1", href: "https://openf1.org", what: "tyre cross-checks" },
];

// Internal links, grouped like the menu so the footer and the menu agree on where things live.
const COLUMNS: { name: string; links: { to: string; label: string }[] }[] = [
  {
    name: "Follow the season",
    links: [
      { to: "/schedule", label: "Schedule" },
      { to: "/news", label: "News" },
      { to: "/explore", label: "Race archive" },
      { to: "/standings", label: "Standings" },
      { to: "/drivers", label: "Drivers" },
      { to: "/circuits", label: "Circuits" },
    ],
  },
  {
    name: "Predict and analyse",
    links: [
      { to: "/forecast", label: "Race and title forecasts" },
      { to: "/ratings", label: "Driver & car ratings" },
      { to: "/duels", label: "Teammate duels" },
      { to: "/team-pace", label: "Team pace" },
      { to: "/watch", label: "Worth watching" },
      { to: "/pitwall", label: "Pit Wall" },
    ],
  },
  {
    name: "Play",
    links: [
      { to: "/simulation", label: "Simulator" },
      { to: "/play", label: "Beat the model" },
      { to: "/my", label: "My driver" },
    ],
  },
];

// the few places a phone's footer links to; everything else is in the Menu
const QUICK = [
  { to: "/schedule", label: "Schedule" },
  { to: "/explore", label: "Race results" },
  { to: "/standings", label: "Standings" },
  { to: "/news", label: "News" },
  { to: "/forecast", label: "Forecast" },
  { to: "/simulation", label: "Simulator" },
];

const link =
  "text-zinc-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600";
// On phones the link lists become compact chips so the whole footer fits one screen; on laptops they are plain lists.
const chip = "max-lg:rounded-full max-lg:border max-lg:border-white/10 max-lg:bg-white/[0.04] max-lg:px-3 max-lg:py-1.5 max-lg:text-xs";
const list = "mt-3 flex flex-wrap gap-2 lg:mt-4 lg:block lg:space-y-2.5";
const heading = "text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500";

/** One footer for every page: who made this, where the data comes from, a map of the site, and when the data was last built. */
export function Footer() {
  const meta = useApi<BundleMeta>("/meta").data;
  const updated = meta?.generated_at ? new Date(meta.generated_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : null;
  return (
    <footer className="site-footer relative overflow-hidden border-t border-white/10 bg-black/90 pb-24 pt-8 text-sm lg:pb-28 lg:pt-14 text-zinc-400">
      {/* a thin red accent along the top edge, fading out at both ends */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-600 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[40rem] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(220,38,38,0.14),transparent)]" />

      <div className="page relative">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
          {/* Brand + disclaimer */}
          <div className="lg:col-span-4">
            <Link to="/" className="inline-block pb-[0.35em] text-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600">
              <Logo /><span className="sr-only"> home</span>
            </Link>
            <p className="mt-2 max-w-xs text-xs leading-relaxed lg:mt-4 lg:text-sm">An unofficial fan project. Not affiliated with, or endorsed by, Formula 1, the FIA or any team.</p>
            {OFFICIAL_HEADSHOTS && (
              <p className="mt-4 hidden max-w-xs text-xs leading-relaxed text-zinc-500 lg:block">
                Driver portraits © Formula 1, shown from formula1.com. Any other photo is credited on the{" "}
                <Link to="/drivers" className="underline underline-offset-2 hover:text-white">
                  Drivers
                </Link>{" "}
                page.
              </p>
            )}
          </div>

          {/* Phones: a few quick links and the credits in two plain lines. The whole site is in the Menu. */}
          <div className="space-y-4 lg:hidden">
            <ul className="flex flex-wrap gap-2">
              {QUICK.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className={`${link} ${chip}`}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-zinc-500">
              Data from{" "}
              {SOURCES.map((s, i) => (
                <span key={s.name}>
                  {i > 0 && " · "}
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-zinc-300 underline underline-offset-2">
                    {s.name}
                  </a>
                </span>
              ))}
            </p>
            <p className="text-xs text-zinc-500">
              <Link to="/methodology" className="text-zinc-300 underline underline-offset-2">
                Methodology
              </Link>
              {" · "}
              <Link to="/about_app" className="text-zinc-300 underline underline-offset-2">
                About
              </Link>
              {" · "}
              <a href="https://github.com/Rishi2795/F1-for-F1" target="_blank" rel="noopener noreferrer" className="text-zinc-300 underline underline-offset-2">
                Source code
              </a>
            </p>
          </div>

          {/* Site map */}
          <nav aria-label="Site" className="hidden gap-4 sm:grid-cols-3 sm:gap-x-6 lg:col-span-5 lg:grid lg:gap-y-10">
            {COLUMNS.map((col) => (
              <div key={col.name}>
                <p className={heading}>{col.name}</p>
                <ul className={list}>
                  {col.links.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className={`${link} ${chip}`}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Data + about */}
          <div className="hidden gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid lg:grid-cols-1 lg:gap-10">
            <div>
              <p className={heading}>Data</p>
              <ul className={list}>
                {SOURCES.map((s) => (
                  <li key={s.name}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className={`${link} ${chip} inline-flex items-center gap-1 text-zinc-300`}>
                      {s.name}
                      <ExternalLink aria-hidden className="h-3 w-3 opacity-60" />
                    </a>
                    <span className="hidden text-xs text-zinc-500 lg:block">{s.what}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={heading}>About the numbers</p>
              <ul className={list}>
                <li>
                  <Link to="/methodology" className={`${link} ${chip}`}>
                    Methodology and data coverage
                  </Link>
                </li>
                <li>
                  <Link to="/about_app" className={`${link} ${chip}`}>
                    About this project
                  </Link>
                </li>
                <li>
                  <a href="https://github.com/Rishi2795/F1-for-F1" target="_blank" rel="noopener noreferrer" className={`${link} ${chip} inline-flex items-center gap-1`}>
                    Source code
                    <ExternalLink aria-hidden className="h-3 w-3 opacity-60" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 text-xs text-zinc-500 lg:mt-12 lg:pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} F1 for F1<span className="hidden lg:inline">. Made by fans, for fans.</span></p>
          <div className="flex items-center gap-5">
            {updated && (
              <span className="inline-flex items-center gap-2">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Data last built {updated}
              </span>
            )}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 font-semibold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
            >
              <ArrowUp aria-hidden className="h-3 w-3" />
              Back to top
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

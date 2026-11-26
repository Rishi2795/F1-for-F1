import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import AppLayout from "./components/layout/applayout";
import FloatingDock from "./components/layout/floatingdock";
import { CommandPalette } from "./components/search/commandpalette";
import ScrollProgress from "./components/layout/scrollprogress";
import { ErrorBoundary } from "./components/ui/errorboundary";
import { PageLoader } from "./components/ui/states";
import { ServerNotice } from "./components/ui/servernotice";

// Route-level code splitting: each page's code (and its heavy deps) loads only when visited.
const Home = lazy(() => import("./pages/home")); // the landing page, "/"
const RaceArchive = lazy(() => import("./pages/racearchive")); // "/explore"
const RaceDashboard = lazy(() => import("./pages/racedashboard"));
const StrategySim = lazy(() => import("./pages/simulation"));
const DriverProfile = lazy(() => import("./pages/driverprofile"));
const DriversHub = lazy(() => import("./pages/drivers"));
const About = lazy(() => import("./pages/about")); // "/about_app"
const NotFound = lazy(() => import("./pages/notfound"));
const Standings = lazy(() => import("./pages/standings"));
const Ratings = lazy(() => import("./pages/ratings"));
const PitWall = lazy(() => import("./pages/pitwall"));
const Watch = lazy(() => import("./pages/watch"));
const Duels = lazy(() => import("./pages/duels"));
const Circuits = lazy(() => import("./pages/circuits"));
const Circuit = lazy(() => import("./pages/circuit"));
const Play = lazy(() => import("./pages/play"));
const My = lazy(() => import("./pages/my"));
const RaceLab = lazy(() => import("./pages/racelab"));
const TeamPace = lazy(() => import("./pages/teampace"));
const Forecast = lazy(() => import("./pages/forecast"));
const Schedule = lazy(() => import("./pages/schedule"));
const News = lazy(() => import("./pages/news"));
const Methodology = lazy(() => import("./pages/methodology"));
const StandingsRedirect = lazy(() => import("./pages/standings").then((m) => ({ default: m.StandingsRedirect })));

export default function App() {
  const onLanding = useLocation().pathname === "/"; // the landing page navigates with its dots, not a progress bar
  return (
    <div className="relative">
      <a
        href="#main"
        onClick={(e) => {
          // Move focus explicitly: browsers differ on focusing a fragment target inside a single-page app.
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
        className="sr-only z-[100] rounded bg-white px-4 py-2 text-sm font-semibold text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      {/* Global components (always visible) */}
      {!onLanding && <ScrollProgress />}
      <FloatingDock />
      <CommandPalette />
      <ServerNotice />

      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>{/* only reached before the layout itself is ready */}
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/simulation" element={<StrategySim />} />
              <Route path="/about_app" element={<About />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/news" element={<News />} />
              <Route path="/explore" element={<RaceArchive />} />
              <Route path="/race/:year/:round" element={<RaceDashboard />} />
              <Route path="/race/:year/:round/lab" element={<RaceLab />} />

              <Route path="/ratings" element={<Ratings />} />
              <Route path="/forecast" element={<Forecast />} />
              <Route path="/pitwall" element={<PitWall />} />
              <Route path="/team-pace" element={<TeamPace />} />
              <Route path="/watch" element={<Watch />} />
              <Route path="/duels" element={<Duels />} />
              <Route path="/circuits" element={<Circuits />} />
              <Route path="/circuit/:slug" element={<Circuit />} />
              <Route path="/play" element={<Play />} />
              <Route path="/my" element={<My />} />
              <Route path="/methodology" element={<Methodology />} />
              <Route path="/standings" element={<StandingsRedirect />} />
              <Route path="/season/:year" element={<Standings />} />

              <Route path="/drivers" element={<DriversHub />} />
              <Route path="/driver/:code" element={<DriverProfile />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

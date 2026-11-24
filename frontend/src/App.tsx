import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import AppLayout from "./components/layout/Applayout";
import FloatingDock from "./components/floatingdock";
import CurveScrollRail from "./components/curvescroll";
import { ErrorBoundary } from "./components/ui/errorboundary";
import { PageLoader } from "./components/ui/states";
import { ServerNotice } from "./components/ui/servernotice";

// Route-level code splitting: each page's code (and its heavy deps) loads only when visited.
const About = lazy(() => import("./pages/about"));
const Home = lazy(() => import("./pages/home"));
const RaceDashboard = lazy(() => import("./pages/racedashboard"));
const StrategySim = lazy(() => import("./pages/simulation"));
const DriverProfile = lazy(() => import("./pages/driverprofile"));
const DriversHub = lazy(() => import("./pages/drivers"));
const AboutPage = lazy(() => import("./pages/about_app"));
const NotFound = lazy(() => import("./pages/notfound"));
const Standings = lazy(() => import("./pages/standings"));
const Ratings = lazy(() => import("./pages/ratings"));
const Methodology = lazy(() => import("./pages/methodology"));
const StandingsRedirect = lazy(() => import("./pages/standings").then((m) => ({ default: m.StandingsRedirect })));

export default function App() {
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
      <CurveScrollRail />
      <FloatingDock />
      <ServerNotice />

      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>{/* only reached before the layout itself is ready */}
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<About />} />
              <Route path="/simulation" element={<StrategySim />} />
              <Route path="/about_app" element={<AboutPage />} />
              <Route path="/explore" element={<Home />} />
              <Route path="/race/:year/:round" element={<RaceDashboard />} />

              <Route path="/ratings" element={<Ratings />} />
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

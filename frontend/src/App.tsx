import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import AppLayout from "./components/layout/Applayout";
import FloatingDock from "./components/floatingdock";
import CurveScrollRail from "./components/curvescroll";
import { ErrorBoundary } from "./components/ui/errorboundary";
import { PageLoader } from "./components/ui/states";

// Route-level code splitting: each page's code (and its heavy deps) loads only when visited.
const About = lazy(() => import("./pages/about"));
const Home = lazy(() => import("./pages/home"));
const RaceDashboard = lazy(() => import("./pages/racedashboard"));
const StrategySim = lazy(() => import("./pages/simulation"));
const DriverProfile = lazy(() => import("./pages/driverprofile"));
const DriversHub = lazy(() => import("./pages/drivers"));
const AboutPage = lazy(() => import("./pages/about_app"));
const NotFound = lazy(() => import("./pages/notfound"));

export default function App() {
  return (
    <div className="relative">
      {/* Global components (always visible) */}
      <CurveScrollRail />
      <FloatingDock />

      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<About />} />
              <Route path="/simulation" element={<StrategySim />} />
              <Route path="/about_app" element={<AboutPage />} />
              <Route path="/explore" element={<Home />} />
              <Route path="/race/:year/:round" element={<RaceDashboard />} />

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

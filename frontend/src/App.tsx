import { Routes, Route } from "react-router-dom";

import AppLayout from "./components/layout/Applayout";


import About from "./pages/about";
import Home from "./pages/home";
import RaceDashboard from "./pages/racedashboard";
import StrategySim from "./pages/simulation";
import DriverProfile from "./pages/driverprofile";
import DriversHub from "./pages/drivers";
import AboutPage from "./pages/about_app";
import FloatingDock from "./components/floatingdock";
import CurveScrollRail from "./components/curvescroll";


export default function App() {
  return (
    <div className="relative">
      {/* 1. GLOBAL COMPONENTS (Always visible) */}
      <CurveScrollRail />
      <FloatingDock />

      {/* 2. ROUTED CONTENT */}
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<About />} />
          <Route path="/simulation" element={<StrategySim />} />
          <Route path="/about_app" element={<AboutPage />} />
          <Route path="/explore" element={<Home />} />
          <Route path="/race/:year/:round" element={<RaceDashboard />} />

          <Route path="/drivers" element={<DriversHub />} />
          <Route path="/driver/:code" element={<DriverProfile />} />
        </Route>
      </Routes>
    </div>
  );
}
import { Routes, Route } from "react-router-dom";
import About from "./pages/about";
import Home from "./pages/home";
import RaceDashboard from "./pages/racedashboard";
import StrategySim from "./pages/simulation"; // 1. Import your new file

export default function App() {
  return (
    <Routes>
      {/* Landing / About (Where your button is) */}
      <Route path="/" element={<About />} />

      {/* The New Simulation Route */}
      <Route path="/simulation" element={<StrategySim />} />

      {/* Season + Circuit Explorer */}
      <Route path="/explore" element={<Home />} />

      {/* Race Analysis */}
      <Route path="/race/:year/:round" element={<RaceDashboard />} />
    </Routes>
  );
}
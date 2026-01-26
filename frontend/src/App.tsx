import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import RaceDashboard from "./pages/racedashboard";
import RaceSimulation from "./pages/racesimulation";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/race/:year/:round" element={<RaceDashboard />} />
      <Route path="/race/:year/:round/simulation" element={<RaceSimulation />} />
    </Routes>
  );
}

export default App;

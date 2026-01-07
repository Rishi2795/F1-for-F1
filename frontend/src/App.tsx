import { Routes, Route } from "react-router-dom";
import About from "./pages/about";
import Home from "./pages/home";
import RaceDashboard from "./pages/racedashboard";

export default function App() {
  return (
    <Routes>
      {/* Landing / About */}
      <Route path="/" element={<About />} />

      {/* Season + Circuit Explorer */}
      <Route path="/explore" element={<Home />} />

      {/* Race Analysis */}
      <Route path="/race/:year/:round" element={<RaceDashboard />} />
    </Routes>
  );
}

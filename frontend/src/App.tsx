import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import RaceDashboard from "./pages/racedashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/race/:year/:round" element={<RaceDashboard />} />
    </Routes>
  );
}

export default App;

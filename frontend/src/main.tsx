import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "@fontsource-variable/doto/full.css"; // dot-matrix display face (OFL), weight and roundness axes; fetched only when the Dot look is on
import "./index.css";
import { applyTheme } from "./lib/theme";

applyTheme();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

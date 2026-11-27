import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "@fontsource-variable/doto/full.css"; // dot-matrix display face (OFL), weight and roundness axes; fetched only when the Dot look is on
import "./index.css";
import { applyTheme } from "./lib/theme";

applyTheme();

// The browser must not put a reload or a Back visit at its old scroll position: the pages fill in after they appear, and it would land the
// landing page on whichever scene was open before. Set before the first render (AppLayout also does it, but that is too late to win).
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

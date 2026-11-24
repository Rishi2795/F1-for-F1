import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { PageLoader } from "../ui/states";
import { Footer } from "./footer";

/**
 * AppLayout — wraps all routed pages.
 * Renders the active child route via <Outlet />.
 * Add any persistent UI here (e.g. a top nav or footer) if needed.
 */
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <main id="main" tabIndex={-1} className="outline-none">
        {/* Only the page content waits for its code to load; the landmark, dock and footer stay put. */}
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

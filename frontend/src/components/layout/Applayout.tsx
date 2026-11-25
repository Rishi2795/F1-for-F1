import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PageLoader } from "../ui/states";
import { Footer } from "./footer";

/**
 * AppLayout wraps every routed page: a faint dot field for the glass surfaces to sit on, the page itself
 * (which eases in on each route change), and the footer.
 */
export default function AppLayout() {
  const { pathname } = useLocation();
  return (
    <div className="f1-dots min-h-screen bg-[#050505] text-white">
      <main id="main" tabIndex={-1} className="outline-none">
        {/* Only the page content waits for its code to load; the landmark, dock and footer stay put. */}
        <Suspense fallback={<PageLoader />}>
          <div key={pathname} className="f1-page">
            <Outlet />
          </div>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

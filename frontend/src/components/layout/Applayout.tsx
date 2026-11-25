import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PageLoader } from "../ui/states";
import { Footer } from "./footer";

/**
 * AppLayout wraps every routed page: a faint dot field for the glass surfaces to sit on, the page itself
 * (which eases in on each route change), and the footer.
 */
export default function AppLayout() {
  const { pathname, hash } = useLocation();

  // Every visit starts at the top, including coming back with the browser's Back button: the browser's own scroll memory is
  // switched off, since pages load their content a moment after they appear and would land it mid-page.
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }, []);
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      return;
    }
    // a link to a section (/forecast#accuracy): wait for the page's code and data to put it on screen
    let tries = 0;
    const id = window.setInterval(() => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) {
        el.scrollIntoView();
        window.clearInterval(id);
      } else if (++tries > 25) window.clearInterval(id);
    }, 80);
    return () => window.clearInterval(id);
  }, [pathname, hash]);

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

import { Outlet } from "react-router-dom";

/**
 * AppLayout — wraps all routed pages.
 * Renders the active child route via <Outlet />.
 * Add any persistent UI here (e.g. a top nav or footer) if needed.
 */
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Outlet />
    </div>
  );
}

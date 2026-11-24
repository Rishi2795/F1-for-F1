import { Link } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("Page not found");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#050505] px-6 text-center">
      <p className="font-mono text-sm text-red-600">404</p>
      <h1 className="text-3xl font-black italic text-white">Page not found</h1>
      <p className="max-w-md text-sm text-zinc-400">That address doesn&apos;t exist. Try the race calendar or the drivers list.</p>
      <div className="flex gap-3">
        <Link to="/explore" className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
          Race calendar
        </Link>
        <Link to="/drivers" className="rounded border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10">
          Drivers
        </Link>
      </div>
    </div>
  );
}

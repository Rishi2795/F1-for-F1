import type { ApiRequestError } from "../../lib/api";
import { OrbitLoader, Orbs } from "./orbs";

/** Big enough (about 10rem or taller) to carry the thinking orbs in its middle: read from the Tailwind height class (h-40, h-[480px]). */
function isBig(className: string): boolean {
  const px = className.match(/\bh-\[(\d+)px\]/);
  if (px) return Number(px[1]) >= 160;
  const step = className.match(/\bh-(\d+)\b/);
  return step ? Number(step[1]) >= 40 : false;
}

/** A placeholder while something loads: a soft light sweeps across it, and a large one also shows the thinking orbs, so every panel on
 *  every page says "working on it" in the same way. Decorative: the page-level loader is the one announced to screen readers. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`skeleton ${className}`} aria-hidden="true">
      {isBig(className) && (
        <span className="absolute inset-0 grid place-items-center">
          <Orbs />
        </span>
      )}
    </div>
  );
}

/** The loader for a whole page (or a page that is still being fetched): the F1 key with orbs orbiting it. */
export function PageLoader() {
  return (
    <div className="grid min-h-[80vh] place-items-center px-6">
      <OrbitLoader />
    </div>
  );
}

export function RaceSkeleton() {
  return (
    <div className="min-h-screen pt-24" role="status" aria-label="Loading race">
      <div className="page space-y-8">
        <div className="flex items-center gap-3">
          <Orbs />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">Loading the race</span>
        </div>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 w-2/3" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-56 md:col-span-2" />
          <Skeleton className="h-56" />
        </div>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  );
}

type ErrorProps = {
  error: ApiRequestError | null;
  onRetry?: () => void;
  backTo?: { href: string; label: string };
  /** What the page was trying to show, for clearer wording ("race", "driver"). */
  subject?: string;
};

export function ErrorState({ error, onRetry, backTo, subject = "page" }: ErrorProps) {
  // 422 = the address itself is malformed; 404 not_available = well-formed but nothing there (yet).
  const badLink = error?.status === 422 || error?.code === "not_found";
  const upcoming = error?.code === "not_available" && (error.data as { data_status?: string } | null)?.data_status === "scheduled";
  const expected = error?.code === "not_available" || badLink;
  const title = badLink
    ? `We couldn't find that ${subject}`
    : upcoming
      ? "This race hasn't happened yet"
      : error?.code === "not_available"
        ? subject === "page"
          ? "Nothing to show here yet"
          : `We couldn't find that ${subject}`
        : "Something went wrong";
  const message = badLink ? "That link doesn't look right. Check the address, or pick one from the list." : (error?.message ?? "Please try again.");
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center" role="alert">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="max-w-md text-sm text-zinc-400">{message}</p>
      {error?.requestId && !expected && <p className="font-mono text-xs text-zinc-400">Reference: {error.requestId}</p>}
      <div className="flex gap-3">
        {onRetry && !expected && (
          <button onClick={onRetry} className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
            Try again
          </button>
        )}
        {backTo && (
          <a href={backTo.href} className="rounded border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10">
            {backTo.label}
          </a>
        )}
      </div>
    </div>
  );
}

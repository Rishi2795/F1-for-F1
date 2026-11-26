import type { ApiRequestError } from "../../lib/api";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/[0.06] ${className}`} aria-hidden="true" />;
}

export function PageLoader() {
  return (
    <div className="min-h-screen px-6 pt-24" role="status" aria-label="Loading">
      <Skeleton className="mb-6 h-10 w-1/3" />
      <Skeleton className="mb-3 h-5 w-2/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function RaceSkeleton() {
  return (
    <div className="min-h-screen pt-24" role="status" aria-label="Loading race">
      <div className="page space-y-8">
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

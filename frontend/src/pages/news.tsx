import { useState } from "react";
import { PageHead } from "../components/ui/pagehead";
import { ErrorState, Skeleton } from "../components/ui/states";
import { chip } from "../components/ui/chipstyle";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { timeAgo } from "../lib/timeago";
import type { NewsDoc } from "../types/api";

const PAGE = 14;

/** Headlines from the sport's publishers. Only the headline, a short teaser and a link to the original are shown. */
export default function News() {
  useDocumentTitle("News");
  const { data, loading, error, reload } = useApi<NewsDoc>("/news");
  const [source, setSource] = useState<string>("all");
  const [shownCount, setShownCount] = useState(PAGE);
  const items = data?.items ?? [];
  const sources = Array.from(new Set(items.map((i) => i.source)));
  const shown = items.filter((i) => source === "all" || i.source === source);

  return (
    <div className="min-h-screen pb-32 pt-10 md:pt-12 text-zinc-300">
      <div className="page space-y-10">
        <PageHead kicker="HEADLINES" title="Paddock" accent="news" intro="The latest from the sport's own publishers. Each item opens the original article on the publisher's site." />
        {loading && <Skeleton className="h-96" />}
        {error && <ErrorState error={error} onRetry={reload} subject="news" />}
        {data && items.length === 0 && <p className="text-zinc-400">No headlines right now. Check back soon.</p>}
        {items.length > 0 && (
          <>
            <div role="group" aria-label="Filter by publisher" className="flex flex-wrap gap-2">
              {["all", ...sources].map((s) => (
                <button key={s} type="button" aria-pressed={source === s} onClick={() => { setSource(s); setShownCount(PAGE); }} className={`${chip(source === s)} !px-3`}>{s === "all" ? "ALL" : s.toUpperCase()}</button>
              ))}
            </div>
            <ul className="grid gap-x-10 border-t border-white/10 lg:grid-cols-2">
              {shown.slice(0, shownCount).map((n) => (
                <li key={n.link} className="border-b border-white/10 py-4">
                  <a href={n.link} target="_blank" rel="noopener noreferrer" className="group block rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{n.source} · {timeAgo(n.published)}</p>
                    <h2 className="mt-2 text-lg font-bold leading-snug text-white group-hover:underline group-hover:underline-offset-4 md:text-xl">{n.title}<span className="sr-only"> (opens the publisher's site in a new tab)</span></h2>
                    {n.summary && <p className="mt-2 line-clamp-2 text-sm text-zinc-300">{n.summary}</p>}
                    <span aria-hidden="true" className="mt-2 inline-block font-mono text-[11px] uppercase tracking-widest text-zinc-400 group-hover:text-white">Read at {n.source} ↗</span>
                  </a>
                </li>
              ))}
            </ul>
            {shown.length > shownCount && (
              <div className="flex justify-center">
                <button type="button" onClick={() => setShownCount((n) => n + PAGE)} className={chip(false)}>Show more ({shown.length - shownCount} more)</button>
              </div>
            )}
            <p className="max-w-3xl text-xs text-zinc-500">Headlines and links belong to their publishers. F1 for F1 does not host or copy their articles or images{data?.fetched_at ? ` · updated ${timeAgo(data.fetched_at)}` : ""}.</p>
          </>
        )}
      </div>
    </div>
  );
}

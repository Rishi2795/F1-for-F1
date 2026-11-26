import { useState } from "react";
import { PageHead } from "../components/ui/pagehead";
import { ErrorState, Skeleton } from "../components/ui/states";
import { StatBoard } from "../components/ui/statboard";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { timeAgo } from "../lib/timeago";
import type { NewsDoc, NewsItem } from "../types/api";

const PAGE = 14;
const HOUR = 3_600_000;

/** Each publisher gets one accent from the site's own palette (the red, white, amber, sky and emerald used across the pages),
 *  always the same one, so a headline's source reads at a glance. */
const SOURCE: Record<string, { text: string; fill: string; rule: string; ring: string }> = {
  "BBC Sport": { text: "text-red-400", fill: "bg-red-500 text-black border-red-500", rule: "border-l-red-500", ring: "border-red-500/50" },
  Autosport: { text: "text-white", fill: "bg-white text-black border-white", rule: "border-l-white", ring: "border-white/40" },
  "Motorsport.com": { text: "text-amber-300", fill: "bg-amber-400 text-black border-amber-400", rule: "border-l-amber-400", ring: "border-amber-400/50" },
  "The Race": { text: "text-sky-300", fill: "bg-sky-400 text-black border-sky-400", rule: "border-l-sky-400", ring: "border-sky-400/50" },
  RaceFans: { text: "text-emerald-300", fill: "bg-emerald-400 text-black border-emerald-400", rule: "border-l-emerald-400", ring: "border-emerald-400/50" },
};
const FALLBACK = { text: "text-zinc-300", fill: "bg-zinc-300 text-black border-zinc-300", rule: "border-l-zinc-500", ring: "border-zinc-500/50" };
const look = (source: string) => SOURCE[source] ?? FALLBACK;

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}
function dayLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  const days = Math.round((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

/** Headlines from the sport's publishers. Only the headline, a short teaser and a link to the original are shown. */
export default function News() {
  useDocumentTitle("News");
  const { data, loading, error, reload } = useApi<NewsDoc>("/news");
  const [source, setSource] = useState<string>("all");
  const [shownCount, setShownCount] = useState(PAGE);
  const now = new Date();
  const items = data?.items ?? [];
  const sources = Array.from(new Set(items.map((i) => i.source)));
  const shown = items.filter((i) => source === "all" || i.source === source);
  const page = shown.slice(0, shownCount);
  const hero = shown[0]; // phones open on the latest story; it is left out of the rails below so it is not shown twice
  const last24 = items.filter((i) => now.getTime() - new Date(i.published).getTime() < 24 * HOUR).length;

  // group what is on screen by day, newest first
  const groups: { key: string; label: string; items: NewsItem[] }[] = [];
  for (const it of page) {
    const key = dayKey(it.published);
    const g = groups[groups.length - 1];
    if (g && g.key === key) g.items.push(it);
    else groups.push({ key, label: dayLabel(it.published, now), items: [it] });
  }

  return (
    <div className="min-h-screen pb-32 pt-8 text-zinc-300 md:pt-12">
      <div className="page space-y-5 lg:space-y-8">
        <PageHead kicker="HEADLINES" title="Paddock" accent="news" intro={<span className="max-lg:hidden">The latest from the sport's own publishers. Each item opens the original article on the publisher's site.</span>} />
        {loading && <Skeleton className="h-96" />}
        {error && <ErrorState error={error} onRetry={reload} subject="news" />}
        {data && items.length === 0 && <p className="text-zinc-400">No headlines right now. Check back soon.</p>}
        {items.length > 0 && (
          <>
            <p className="-mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400 lg:hidden">
              <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              {last24} new in 24h · {sources.length} publishers{data?.fetched_at ? ` · ${timeAgo(data.fetched_at)}` : ""}
            </p>
            <div className="max-lg:hidden">
            <StatBoard
              label="News summary"
              items={[
                { label: "Last 24 hours", value: last24, sub: last24 === 1 ? "headline" : "headlines", headline: true },
                { label: "Headlines", value: items.length, sub: "in the last three weeks" },
                { label: "Publishers", value: sources.length, sub: sources.slice(0, 3).join(", ") + (sources.length > 3 ? "…" : "") },
                { label: "Latest", value: timeAgo(items[0].published), sub: items[0].source },
              ]}
            />
            </div>

            <div role="group" aria-label="Filter by publisher" className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
              <button type="button" aria-pressed={source === "all"} onClick={() => { setSource("all"); setShownCount(PAGE); }} className={`shrink-0 rounded-sm border px-3.5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${source === "all" ? "border-white bg-white text-black" : "border-white/15 bg-white/[0.04] text-zinc-300 hover:border-white/60 hover:text-white"}`}>ALL · {items.length}</button>
              {sources.map((s) => {
                const c = look(s);
                const on = source === s;
                return (
                  <button key={s} type="button" aria-pressed={on} onClick={() => { setSource(s); setShownCount(PAGE); }} className={`inline-flex shrink-0 items-center gap-2 rounded-sm border px-3.5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${on ? c.fill : `${c.ring} bg-white/[0.04] ${c.text} hover:bg-white/[0.09]`}`}>
                    {!on && <span aria-hidden="true" className={`h-2 w-2 rounded-full ${c.fill.split(" ")[0]}`} />}
                    {s.toUpperCase()}
                  </button>
                );
              })}
            </div>

            {hero && <TopStory n={hero} now={now} />}

            <div className="space-y-6 lg:space-y-8">
              {groups.map((g) => (
                <section key={g.key} aria-label={g.label} className={g.items.length === 1 && g.items[0].link === hero?.link ? "max-lg:hidden" : ""}>
                  <h2 className="mb-3 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-white">
                    <span aria-hidden="true" className="h-2 w-2 bg-red-600" />
                    {g.label}
                    <span className="text-zinc-500">{g.items.length}</span>
                    <span aria-hidden="true" className="font-mono text-[9px] tracking-widest text-zinc-600 lg:hidden">SWIPE →</span>
                    <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
                  </h2>
                  <ul className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
                    {g.items.map((n, idx) => {
                      const c = look(n.source);
                      const fresh = now.getTime() - new Date(n.published).getTime() < 3 * HOUR;
                      return (
                        <li key={n.link} className={`relative w-[82%] shrink-0 snap-center sm:w-[60%] lg:w-auto ${n.link === hero?.link ? "max-lg:hidden" : ""}`}>
                          <a href={n.link} target="_blank" rel="noopener noreferrer" className={`group flex h-full flex-col rounded-sm border border-white/10 border-l-[3px] ${c.rule} bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600`}>
                            <p className="flex items-center gap-2.5 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] lg:gap-3 lg:tracking-[0.3em]">
                              <span className={c.text}>{n.source}</span>
                              <span className="text-zinc-500">{timeAgo(n.published)}</span>
                              {fresh && <span className="rounded-sm bg-red-500 px-1.5 py-0.5 font-bold tracking-widest text-black">NEW</span>}
                              <span aria-hidden="true" className="ml-auto text-[9px] tracking-widest text-zinc-600 lg:hidden">{String(idx + 1).padStart(2, "0")}/{String(g.items.length).padStart(2, "0")}</span>
                            </p>
                            <h3 className="mt-3 text-[17px] font-bold leading-snug text-white max-lg:line-clamp-4 group-hover:underline group-hover:underline-offset-4 lg:text-lg">{n.title}<span className="sr-only"> (opens the publisher's site in a new tab)</span></h3>
                            {n.summary && <p className="mt-2 text-sm leading-relaxed text-zinc-300 line-clamp-3 lg:line-clamp-2">{n.summary}</p>}
                            <span aria-hidden="true" className={`mt-auto inline-block pt-4 font-mono text-[11px] uppercase tracking-widest ${c.text} opacity-80 group-hover:opacity-100`}>Read at {n.source} ↗</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>

            {shown.length > shownCount && (
              <div className="flex justify-center">
                <button type="button" onClick={() => setShownCount((n) => n + PAGE)} className="rounded-sm border border-white/25 px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-white transition-colors hover:border-white hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">Show more ({shown.length - shownCount} more)</button>
              </div>
            )}
            <p className="max-w-3xl text-xs text-zinc-500">Headlines and links belong to their publishers. F1 for F1 does not host or copy their articles or images{data?.fetched_at ? ` · updated ${timeAgo(data.fetched_at)}` : ""}.</p>
          </>
        )}
      </div>
    </div>
  );
}


/** Phones only: the latest story as one big card that fills the first screen. */
function TopStory({ n, now }: { n: NewsItem; now: Date }) {
  const c = look(n.source);
  const fresh = now.getTime() - new Date(n.published).getTime() < 3 * HOUR;
  return (
    <a href={n.link} target="_blank" rel="noopener noreferrer" className={`group relative flex min-h-[14rem] flex-col justify-end gap-3 overflow-hidden rounded-sm border border-white/10 border-l-[3px] ${c.rule} bg-gradient-to-b from-white/[0.06] to-white/[0.01] p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 lg:hidden`}>
      <span aria-hidden="true" className="pointer-events-none absolute -right-2 top-1 select-none text-[5.5rem] font-black italic leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.12)]">{n.source.split(" ")[0].toUpperCase()}</span>
      <p className="relative flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em]">
        <span className="rounded-sm bg-red-500 px-1.5 py-0.5 font-bold tracking-widest text-black">{fresh ? "NEW" : "TOP"}</span>
        <span className={c.text}>{n.source}</span>
        <span className="text-zinc-500">{timeAgo(n.published)}</span>
      </p>
      <h2 className="relative text-[1.7rem] font-black leading-[1.08] tracking-tight text-white">{n.title}<span className="sr-only"> (opens the publisher's site in a new tab)</span></h2>
      {n.summary && <p className="relative line-clamp-4 text-[15px] leading-relaxed text-zinc-300">{n.summary}</p>}
      <span aria-hidden="true" className={`relative mt-1 font-mono text-[11px] uppercase tracking-widest ${c.text}`}>Read at {n.source} ↗</span>
    </a>
  );
}


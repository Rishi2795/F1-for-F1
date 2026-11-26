import { useEffect, useState, type ReactNode } from "react";

/** A numbered chapter: a red [01], a large italic title and a hairline, then its content. */
export function Chapter({ id, n, title, lead, children }: { id: string; n: string; title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20 space-y-5">
      <div>
        <div className="flex items-baseline gap-3">
          <span aria-hidden="true" className="font-mono text-xs font-black text-red-500">[{n}]</span>
          <h2 id={`${id}-h`} className="text-2xl font-black uppercase italic tracking-tighter text-white md:text-3xl">{title}</h2>
          <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
        </div>
        {lead && <p className="mt-2 max-w-2xl text-zinc-400">{lead}</p>}
      </div>
      {children}
    </section>
  );
}

export type TocEntry = { id: string; label: string };

/** "On this page": jumps to a chapter and marks the one you are reading. Sticky beside the content on wide screens, a
 *  scrolling row of chips above it on small ones. */
export function Toc({ entries }: { entries: TocEntry[] }) {
  const [active, setActive] = useState(entries[0]?.id);
  useEffect(() => {
    const seen = new Map<string, number>();
    const io = new IntersectionObserver(
      (rows) => {
        rows.forEach((r) => seen.set(r.target.id, r.isIntersecting ? r.boundingClientRect.top : Infinity));
        const open = [...seen.entries()].filter(([, top]) => top !== Infinity).sort((a, b) => a[1] - b[1]);
        if (open.length) setActive(open[0][0]);
      },
      { rootMargin: "-10% 0px -70% 0px" },
    );
    entries.forEach((e) => {
      const el = document.getElementById(e.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [entries]);

  return (
    <nav aria-label="On this page" className="min-w-0 lg:sticky lg:top-8">
      <p className="mb-3 hidden font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-400 lg:block">On this page</p>
      <ol className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
        {entries.map((e, i) => {
          const on = e.id === active;
          return (
            <li key={e.id} className="shrink-0">
              <a
                href={`#${e.id}`}
                aria-current={on ? "location" : undefined}
                className={`flex items-center gap-3 rounded-sm border px-3 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 lg:border-0 lg:border-l-2 lg:rounded-none lg:py-1.5 ${on ? "border-white bg-white text-black lg:bg-transparent lg:text-white lg:border-l-red-500" : "border-white/15 text-zinc-300 hover:text-white lg:border-l-white/10 lg:text-zinc-400"}`}
              >
                <span aria-hidden="true" className={`font-mono text-[10px] ${on ? "text-red-600 lg:text-red-400" : "text-zinc-500"}`}>{String(i + 1).padStart(2, "0")}</span>
                {e.label}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

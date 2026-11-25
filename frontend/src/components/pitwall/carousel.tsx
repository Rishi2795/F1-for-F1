import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";

export type CarouselTool = { to: string; title: string; question: string; teaser?: string; Icon: LucideIcon };

/** One accent per card, always from the site's own palette (red, white, amber, sky, emerald), in a fixed order. */
const ACCENTS = ["#ef4444", "#f4f4f5", "#fbbf24", "#38bdf8", "#34d399"];

const hide = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/** A carousel of the pit wall's tools: big cards you swipe, scroll or step through with the arrows or the keyboard. The card in the
 *  middle lights up; every card is a real link, and the strip below jumps straight to any of them. */
export function ToolCarousel({ tools }: { tools: CarouselTool[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const cards = () => Array.from(track.current?.querySelectorAll<HTMLElement>("[data-card]") ?? []);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    // the "current" card is the one at the left edge; at the very end of the track it is the last
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
      setActive(tools.length - 1);
      return;
    }
    const gutter = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const edge = el.scrollLeft + gutter;
    let best = 0;
    let dist = Infinity;
    cards().forEach((c, i) => {
      const d = Math.abs(c.offsetLeft - edge);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setActive(best);
  }, [tools.length]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [measure]);

  const go = (i: number) => {
    const el = track.current;
    const card = cards()[Math.max(0, Math.min(tools.length - 1, i))];
    if (!el || !card) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const gutter = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    el.scrollTo({ left: card.offsetLeft - gutter, behavior: reduce ? "auto" : "smooth" });
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(active + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(active - 1); }
    else if (e.key === "Home") { e.preventDefault(); go(0); }
    else if (e.key === "End") { e.preventDefault(); go(tools.length - 1); }
  };

  const arrow = "grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur transition-colors hover:border-white hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-black/60 disabled:hover:text-white";

  return (
    <section aria-roledescription="carousel" aria-label="Pit wall tools" className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-400" aria-live="polite">
          <span className="text-white">{String(active + 1).padStart(2, "0")}</span> / {String(tools.length).padStart(2, "0")} · {tools[active]?.title}
        </p>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous tool" disabled={active === 0} onClick={() => go(active - 1)} className={arrow}><ChevronLeft aria-hidden="true" size={20} /></button>
          <button type="button" aria-label="Next tool" disabled={active === tools.length - 1} onClick={() => go(active + 1)} className={arrow}><ChevronRight aria-hidden="true" size={20} /></button>
        </div>
      </div>

      {/* edge to edge, with the page gutters restored as padding so the first card lines up with the headline */}
      <div
        ref={track}
        onKeyDown={onKey}
        tabIndex={0}
        aria-label="Swipe, scroll or use the arrow keys"
        className={`-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 py-4 [scroll-padding-inline:1.25rem] sm:px-8 sm:[scroll-padding-inline:2rem] lg:px-12 lg:[scroll-padding-inline:3rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 sm:-mx-8 lg:-mx-12 ${hide}`}
      >
        {tools.map((t, i) => {
          const accent = ACCENTS[i % ACCENTS.length];
          const on = i === active;
          return (
            <div key={t.to} data-card role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${tools.length}: ${t.title}`} className="w-[min(26rem,82vw)] shrink-0 snap-start">
            <Link
              to={t.to}
              style={{ "--accent": accent, backgroundImage: `radial-gradient(circle at 15% 0%, ${accent}2e, transparent 55%), radial-gradient(circle at 100% 100%, ${accent}14, transparent 50%)` } as CSSProperties}
              className={`group relative flex h-[22rem] w-full flex-col justify-between overflow-hidden rounded-sm border bg-[#0a0a0a] p-6 transition-all duration-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 motion-reduce:transition-none ${on ? "scale-100 border-[var(--accent)] opacity-100 shadow-[0_0_40px_-12px_var(--accent)]" : "scale-[0.94] border-white/10 opacity-60 hover:opacity-90"}`}
            >
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-6 -right-2 select-none font-serif text-[9rem] leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.12)]">{String(i + 1).padStart(2, "0")}</span>
              <span className="relative flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-400">REF_{String(i + 1).padStart(2, "0")}</span>
                <span className="grid h-11 w-11 place-items-center rounded-full border" style={{ borderColor: accent, color: accent, backgroundColor: `${accent}1a` }}><t.Icon aria-hidden="true" size={20} strokeWidth={1.8} /></span>
              </span>
              <span className="relative block">
                <span className="block text-3xl font-black uppercase italic leading-none tracking-tighter text-white">{t.title}</span>
                <span className="mt-3 block text-zinc-300">{t.question}</span>
                {t.teaser && <span className="mt-4 inline-block rounded-sm border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ borderColor: `${accent}88`, color: accent }}>{t.teaser}</span>}
              </span>
              <span className="relative flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">
                <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
                <span className="ml-3 text-white transition-transform duration-300 group-hover:translate-x-1">OPEN →</span>
              </span>
            </Link>
            </div>
          );
        })}
      </div>

      <div role="group" aria-label="Jump to a tool" className="flex flex-wrap justify-center gap-2">
        {tools.map((t, i) => (
          <button key={t.to} type="button" aria-current={i === active ? "true" : undefined} onClick={() => go(i)} className={`rounded-full border px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${i === active ? "border-white bg-white text-black" : "border-white/15 text-zinc-300 hover:border-white/60 hover:text-white"}`}>
            {t.title}
          </button>
        ))}
      </div>
    </section>
  );
}

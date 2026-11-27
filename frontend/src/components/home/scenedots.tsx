import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { sceneTop } from "../../lib/homescenes";

type Scene = { el: HTMLElement; title: string };

/** A column of dots down the right edge: one per scene, the current one lit. Clicking one scrolls to that scene. Wide screens only. */
export function SceneDots() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const found = Array.from(document.querySelectorAll<HTMLElement>("[data-scene]")).map((el) => ({ el, title: el.dataset.title ?? "Section" }));
    // one frame later: the page's sections are all mounted by then, and state is not set inside the effect itself
    const first = requestAnimationFrame(() => setScenes(found));
    // resting tops are measured when the page or window changes, so a scroll frame only compares numbers (no layout reads)
    let tops: number[] = found.map((s) => sceneTop(s.el));
    const remeasure = () => {
      tops = found.map((s) => sceneTop(s.el));
      pick();
    };
    let frame = 0;
    const pick = () => {
      frame = 0;
      const mid = window.scrollY + window.innerHeight * 0.45;
      let idx = 0;
      tops.forEach((t, i) => {
        if (t <= mid) idx = i;
      });
      setActive(idx);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(pick);
    };
    const watch = new ResizeObserver(remeasure);
    found.forEach((s) => watch.observe(s.el));
    pick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", remeasure);
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(frame);
      watch.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", remeasure);
    };
  }, []);

  if (scenes.length < 2) return null;
  // In <body>, not inside the page: the page eases in with a transform, which would make "fixed" mean "fixed to the page".
  return createPortal(
    <nav aria-label="Sections of the home page" className="fixed right-1 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-full border border-white/10 bg-black/70 px-1 py-2.5 lg:right-4 lg:gap-3 lg:border-white/15 lg:bg-black/80 lg:px-2.5 lg:py-4">
      {scenes.map((s, i) => (
        <button
          key={s.title + i}
          type="button"
          aria-label={s.title}
          aria-current={i === active ? "true" : undefined}
          onClick={() => window.scrollTo({ top: sceneTop(s.el), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
          className="group relative flex items-center p-1 -m-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600"
        >
          <span className="pointer-events-none absolute right-full mr-4 translate-x-1 whitespace-nowrap rounded-sm border border-white/15 bg-black/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">{s.title}</span>
          <span aria-hidden="true" className={`block rounded-full transition-all duration-500 ${i === active ? "h-6 w-1.5 bg-red-500 shadow-[0_0_12px_#ef4444]" : "h-1.5 w-1.5 bg-white/30 group-hover:bg-white"}`} />
        </button>
      ))}
    </nav>,
    document.body,
  );
}

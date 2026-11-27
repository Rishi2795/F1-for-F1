import { useEffect } from "react";

/** The home page as full-screen scenes. Each one is a face of a cube turning end over end as you scroll: the scene you leave folds
 *  away from the bottom edge while the next one swings in from its top edge, with a little depth and shade. It snaps from one scene to
 *  the next on any screen with room for it (phones included). For anyone who prefers less motion, or on a very short window, it is an
 *  ordinary page: nothing turns, nothing snaps, nothing is hidden, so nothing can get stuck out of view. */
/** Where a scene sits on the page when at rest, in page coordinates. Unlike getBoundingClientRect or scrollIntoView this ignores the
 *  turn applied while it is mid-scroll, so scrolling "to" a scene that is currently tipped away still lands on it squarely. */
export function sceneTop(el: HTMLElement): number {
  let top = 0;
  for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) top += e.offsetTop;
  return top;
}

const MAX_TURN = 82; // degrees: not quite edge-on, so the face never vanishes into a line
const REST = 0.01; // within 1% of a screen of resting flat counts as flat, so a scene that has landed is never left a hair off true

export function useHomeScenes(): void {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("snap-home");
    // The footer joins the snap points only after the visitor first scrolls, touches or presses a key (see the CSS for why).
    const INPUTS = ["wheel", "touchstart", "keydown", "pointerdown"];
    const armFooter = () => {
      root.classList.add("snap-footer");
      INPUTS.forEach((t) => window.removeEventListener(t, armFooter));
    };
    INPUTS.forEach((t) => window.addEventListener(t, armFooter, { passive: true }));
    const room = window.matchMedia("(min-height: 520px)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scenes = Array.from(document.querySelectorAll<HTMLElement>("[data-scene]"));
    if (!room.matches || still.matches) {
      return () => {
        INPUTS.forEach((t) => window.removeEventListener(t, armFooter));
        root.classList.remove("snap-home", "snap-footer");
      };
    }
    root.classList.add("scenes-on");
    // Where the browser can tie an animation to scroll position (Chrome, Edge, Safari 26), the turn is a CSS animation that runs off the
    // main thread, so it stays smooth even while the page is busy. Elsewhere the same turn is worked out here on every frame.
    const css = typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()");
    if (css) root.classList.add("cube-css");

    // Browsers work out where to snap from each element's *transformed* box, so a scene caught mid-turn would pull the page toward the
    // wrong place. The scenes therefore do not snap themselves: each gets an invisible anchor that sits exactly over its resting
    // position and never moves, and the page snaps to those.
    const anchors = scenes.map((s) => {
      const a = document.createElement("div");
      a.className = "scene-anchor";
      a.setAttribute("aria-hidden", "true");
      s.parentElement?.appendChild(a);
      return a;
    });
    // resting top and height of every scene, in page coordinates: measured from layout, never from the (turned) box on screen
    const tops: number[] = [];
    const heights: number[] = [];
    const place = () => {
      scenes.forEach((s, n) => {
        tops[n] = sceneTop(s);
        heights[n] = s.offsetHeight;
        const parent = s.parentElement;
        if (!parent) return;
        let top = 0;
        let el: HTMLElement | null = s;
        while (el && el !== parent) {
          top += el.offsetTop;
          el = el.offsetParent as HTMLElement | null;
        }
        if (el !== parent) top = s.offsetTop; // the parent is not the positioned ancestor: fall back to the direct offset
        anchors[n].style.top = `${top}px`;
        anchors[n].style.height = `${s.offsetHeight}px`;
      });
    };
    place();
    const watch = new ResizeObserver(place);
    scenes.forEach((s) => watch.observe(s));
    if (scenes[0]?.parentElement) watch.observe(scenes[0].parentElement);

    let frame = 0;
    const turn = () => {
      frame = 0;
      const vh = window.innerHeight;
      const y = window.scrollY;
      for (const [n, s] of scenes.entries()) {
        const r = { top: tops[n] - y, bottom: tops[n] - y + heights[n] };
        let transform = "";
        let origin = "";
        let shade = 0;
        if (r.top > vh * REST && r.top < vh) {
          // arriving from below: hinged on its own top edge, its far end tipped away
          const e = r.top / vh;
          transform = `perspective(1100px) rotateX(${-MAX_TURN * e}deg) translateZ(${-60 * e}px)`;
          origin = "50% 0%";
          shade = e;
        } else if (r.top <= 0 && r.bottom < vh * (1 - REST) && r.bottom > 0) {
          // leaving upward: hinged on its bottom edge, its top folding back
          const l = 1 - r.bottom / vh;
          transform = `perspective(1100px) rotateX(${MAX_TURN * l}deg) translateZ(${-60 * l}px)`;
          origin = "50% 100%";
          shade = l;
        }
        if (transform) {
          s.style.transformOrigin = origin;
          s.style.transform = transform;
          s.style.setProperty("--shade", shade.toFixed(3));
          s.setAttribute("data-turning", "");
        } else if (s.hasAttribute("data-turning")) {
          s.style.transform = "";
          s.style.transformOrigin = "";
          s.style.removeProperty("--shade");
          s.removeAttribute("data-turning");
        }
      }
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(turn);
    };
    if (!css) {
      turn();
      window.addEventListener("scroll", queue, { passive: true });
    }
    window.addEventListener("resize", queue);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      watch.disconnect();
      anchors.forEach((a) => a.remove());
      INPUTS.forEach((t) => window.removeEventListener(t, armFooter));
      root.classList.remove("snap-home", "snap-footer", "scenes-on", "cube-css");
      scenes.forEach((s) => {
        s.style.transform = "";
        s.style.transformOrigin = "";
        s.style.removeProperty("--shade");
        s.removeAttribute("data-turning");
      });
    };
  }, []);
}

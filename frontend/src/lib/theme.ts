import { useSyncExternalStore } from "react";

/** "classic" keeps the site's own type; "dot" sets the display type (headlines and big numbers) in a dot-matrix face. */
export type Theme = "classic" | "dot";
const KEY = "f1-theme";
const listeners = new Set<() => void>();

export function readTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === "classic" ? "classic" : "dot";
  } catch {
    return "dot"; // storage blocked: the default look
  }
}

/** Dot-matrix type reads well only when it is large, so it is used for display text of at least this many pixels (24). */
export const DOT_MIN_PX = 24;

/** Mark headlines and big numbers that are large enough for the dot face (they get `data-dot`; the CSS does the rest).
 *  Done from the real computed size, so a heading that is small on a phone and big on a laptop is right on both. */
function markDisplayText(): void {
  if (document.documentElement.dataset.theme !== "dot") return;
  for (const el of document.querySelectorAll<HTMLElement>("h1, h2, .font-serif")) {
    el.toggleAttribute("data-dot", parseFloat(getComputedStyle(el).fontSize) >= DOT_MIN_PX);
  }
}

let watching = false;
let timer = 0;
function watchDisplayText(): void {
  if (watching || typeof MutationObserver === "undefined") return;
  watching = true;
  const later = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(markDisplayText, 120);
  };
  new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", later);
  later();
}

/** Put the saved choice on <html> before anything renders, and keep display text marked for it. */
export function applyTheme(theme: Theme = readTheme()): void {
  document.documentElement.dataset.theme = theme;
  if (theme === "dot") watchDisplayText();
  window.setTimeout(markDisplayText, 0);
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* the choice still applies for this visit */
  }
  applyTheme(theme);
  listeners.forEach((l) => l());
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => (document.documentElement.dataset.theme === "classic" ? "classic" : "dot"),
    () => "dot" as Theme,
  );
  return [theme, setTheme];
}

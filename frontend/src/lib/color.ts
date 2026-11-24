/** Colour helpers for drawing team colours on the dark page. */

const SURFACE = "#050505";

function rgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two #rrggbb colours (1 to 21). */
export function contrast(a: string, b: string): number {
  const ca = rgb(a);
  const cb = rgb(b);
  if (!ca || !cb) return 1;
  const [hi, lo] = [luminance(ca), luminance(cb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * A team colour that is visible on the dark surface. Brand colours that are too dark (e.g. a navy at
 * 2.2:1) are mixed toward white until they reach `min` contrast; their hue is kept. Colours that
 * already pass are returned unchanged, so identity colours stay recognisable.
 */
export function readableOnDark(hex: string, min = 3, surface = SURFACE): string {
  const base = rgb(hex);
  if (!base) return hex;
  for (let t = 0; t <= 1; t += 0.05) {
    const mixed = base.map((c) => Math.round(c + (255 - c) * t)) as [number, number, number];
    const candidate = `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
    if (contrast(candidate, surface) >= min) return candidate.toUpperCase();
  }
  return "#FFFFFF";
}

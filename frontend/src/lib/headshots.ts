/** Official driver portraits: a standard studio shot in team kit, on a transparent background, published by Formula 1.
 *
 *  The pictures belong to Formula 1 and are shown straight from its server (never copied into this project), with a credit.
 *  Set VITE_DRIVER_HEADSHOTS=off at build time to switch them off everywhere: every driver then shows the number design. */
export const OFFICIAL_HEADSHOTS = import.meta.env.VITE_DRIVER_HEADSHOTS !== "off";
const HOST = "media.formula1.com";

/** The link at a given size, or null for anything that is not an https png on F1's media host.
 *  `cols` is F1's size step: 2 is about 200 px, 4 about 430 px, 6 about 660 px wide. */
export function portrait(url: string | null | undefined, cols: 2 | 4 | 6): string | null {
  if (!OFFICIAL_HEADSHOTS || !url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.hostname !== HOST || !u.pathname.toLowerCase().endsWith(".png")) return null;
    // F1's links carry an instruction to serve a grey silhouette when a portrait does not exist. We would rather get a clean
    // "not found", so the card shows its number design instead of someone else's placeholder.
    return url.replace("/d_driver_fallback_image.png/", "/").replace(/\/\d+col\//, `/${cols}col/`);
  } catch {
    return null;
  }
}

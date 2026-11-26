import { useEffect, useState } from "react";

export type Photo = { file: string; credit: string; licence: string; licenceUrl?: string | null; source?: string; focus?: string; note?: string; face?: [number, number]; width?: number; height?: number };
type Registry = Record<string, Photo>;

let cached: Registry | null = null;
let pending: Promise<Registry> | null = null;

/** The photos we are allowed to show, from /drivers/credits.json. A driver with no entry has no photo, and nothing is
 *  requested for them: every picture carries its credit and licence, and a picture without them is not shown. */
function load(): Promise<Registry> {
  pending ??= fetch("/drivers/credits.json")
    .then((r) => (r.ok ? r.json() : { photos: {} }))
    .then((j: { photos?: Registry }) => (cached = Object.fromEntries(Object.entries(j.photos ?? {}).filter(([, p]) => p.file && p.credit && p.licence))))
    .catch(() => (cached = {}));
  return pending;
}

export function useDriverPhotos(): Registry {
  const [photos, setPhotos] = useState<Registry>(cached ?? {});
  useEffect(() => {
    let live = true;
    load().then((r) => live && setPhotos(r));
    return () => {
      live = false;
    };
  }, []);
  return photos;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** `object-position` that puts the face a third of the way down (`target`) in a container of width/height `ratio`, however
 *  the picture is cropped. Without a located face it falls back to the hand-set focus. */
export function framing(photo: Photo, ratio: number, target = 0.38): string {
  if (!photo.face || !photo.width || !photo.height) return photo.focus ?? "50% 22%";
  const ri = photo.width / photo.height;
  let px = 50;
  let py = 50;
  if (ri > ratio) {
    const c = ratio / ri; // the share of the picture's width that shows
    px = clamp01((photo.face[0] - 0.5 * c) / (1 - c)) * 100;
  } else if (ri < ratio) {
    const c = ri / ratio; // the share of the picture's height that shows
    py = clamp01((photo.face[1] - target * c) / (1 - c)) * 100;
  }
  return `${px.toFixed(1)}% ${py.toFixed(1)}%`;
}

/** Background styles for a round avatar of `size` px: the picture scaled up so the face fills it, centred on the face. */
export function avatarStyle(photo: Photo, size: number): { backgroundImage: string; backgroundSize: string; backgroundPosition: string } {
  const url = `url(/drivers/${photo.file})`;
  const ri = photo.width && photo.height ? photo.width / photo.height : 1;
  const [fx, fy] = photo.face ?? [0.5, 0.3];
  const w = ri >= 1 ? 2 * size * ri : 2 * size; // zoom so the face, about a third of a portrait, fills the circle
  const h = w / ri;
  const left = Math.min(0, Math.max(size - w, size / 2 - fx * w));
  const top = Math.min(0, Math.max(size - h, size * 0.46 - fy * h));
  return { backgroundImage: url, backgroundSize: `${w.toFixed(0)}px ${h.toFixed(0)}px`, backgroundPosition: `${left.toFixed(0)}px ${top.toFixed(0)}px` };
}

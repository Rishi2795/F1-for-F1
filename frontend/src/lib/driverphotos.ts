import { useEffect, useState } from "react";

export type Photo = { file: string; credit: string; licence: string; licenceUrl?: string | null; source?: string; focus?: string; note?: string };
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

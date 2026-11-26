import { useApi } from "../hooks/useApi";
import type { DriverListEntry } from "../types/api";
import { useDriverPhotos, type Photo } from "./driverphotos";
import { portrait } from "./headshots";

export type DriverImage = { kind: "licensed"; photo: Photo } | { kind: "official"; url: string };

/** Which picture to show for a driver: a photo we hold a licence for comes first, then Formula 1's official portrait, then
 *  nothing (the caller draws the number design). `cols` picks the size of the official portrait. */
export function useDriverImages(): (code: string, cols?: 2 | 4 | 6) => DriverImage | null {
  const licensed = useDriverPhotos();
  const list = useApi<DriverListEntry[]>("/drivers").data;
  const links = new Map((list ?? []).map((d) => [d.code, d.image]));
  return (code, cols = 4) => {
    if (licensed[code]) return { kind: "licensed", photo: licensed[code] };
    const url = portrait(links.get(code), cols);
    return url ? { kind: "official", url } : null;
  };
}

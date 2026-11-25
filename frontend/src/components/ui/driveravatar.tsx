import { useState } from "react";
import { useDriverImages } from "../../lib/driverimages";
import { avatarStyle } from "../../lib/driverphotos";

/** A round driver picture for tables and lists. It shows a licensed photo if we hold one, else Formula 1's official portrait,
 *  and when there is none (or it does not load) the race number or code in the team's colour. Decorative: the driver's
 *  name is always next to it. */
export function DriverAvatar({ code, color, number, size = 32 }: { code: string; color?: string | null; number?: number | null; size?: number }) {
  const image = useDriverImages()(code, size > 60 ? 4 : 2);
  const [failed, setFailed] = useState(false);
  const colour = `#${(color ?? "888888").replace("#", "")}`;
  return (
    <span aria-hidden="true" className="relative inline-block shrink-0 overflow-hidden rounded-full border" style={{ width: size, height: size, borderColor: `${colour}aa`, backgroundColor: `${colour}38` }}>
      {image?.kind === "licensed" ? (
        <span className="absolute inset-0 bg-no-repeat" style={avatarStyle(image.photo, size)} />
      ) : image?.kind === "official" && !failed ? (
        <img src={image.url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="absolute left-1/2 top-[4%] h-[128%] w-[128%] max-w-none -translate-x-1/2 object-cover object-top" />
      ) : (
        <span className="grid h-full w-full place-items-center bg-black/55 font-mono text-[10px] font-bold text-white">{number ?? code.slice(0, 2)}</span>
      )}
    </span>
  );
}

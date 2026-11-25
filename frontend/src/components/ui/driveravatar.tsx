import { avatarStyle, useDriverPhotos } from "../../lib/driverphotos";

/** A round driver picture for tables and lists. With a licensed photo it zooms in on the face; without one it shows the
 *  race number (or the code) in the team's colour. Decorative: the driver's name is always next to it. */
export function DriverAvatar({ code, color, number, size = 32 }: { code: string; color?: string | null; number?: number | null; size?: number }) {
  const photo = useDriverPhotos()[code];
  const colour = `#${(color ?? "888888").replace("#", "")}`;
  return (
    <span aria-hidden="true" className="relative inline-block shrink-0 overflow-hidden rounded-full border" style={{ width: size, height: size, borderColor: `${colour}aa`, backgroundColor: `${colour}38` }}>
      {photo ? (
        <span className="absolute inset-0 bg-no-repeat" style={avatarStyle(photo, size)} />
      ) : (
        <span className="grid h-full w-full place-items-center bg-black/55 font-mono text-[10px] font-bold text-white">{number ?? code.slice(0, 2)}</span>
      )}
    </span>
  );
}

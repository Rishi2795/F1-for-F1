import { useId } from "react";

/** A driver with no picture we may show: a head and shoulders in the team's colour, so every tile, avatar and card is filled the same way.
 *  It is a drawing, not a likeness; the driver's name is always next to it. */
export function DriverSilhouette({ color = "#888888", className = "" }: { color?: string; className?: string }) {
  const id = useId();
  const c = `#${color.replace("#", "")}`;
  return (
    <svg viewBox="0 0 100 120" aria-hidden="true" focusable="false" className={className} preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity="0.85" />
          <stop offset="1" stopColor={c} stopOpacity="0.18" />
        </linearGradient>
      </defs>
      {/* shoulders */}
      <path d="M6 120c0-24 14-40 34-45h20c20 5 34 21 34 45Z" fill={`url(#${id})`} />
      {/* neck and head */}
      <path d="M42 70c-1-5 0-9 0-12h16c0 3 1 7 0 12-4 4-12 4-16 0Z" fill={c} fillOpacity="0.55" />
      <ellipse cx="50" cy="38" rx="19" ry="23" fill={`url(#${id})`} />
      {/* a helmet visor line, so it reads as a driver and not a generic user icon */}
      <path d="M31 36c6-6 32-6 38 0v6c-6 4-32 4-38 0Z" fill="#050505" fillOpacity="0.55" />
    </svg>
  );
}

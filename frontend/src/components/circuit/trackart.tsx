/** A small outline for a card. */
export function TrackThumb({ points }: { points: number[][] }) {
  const d = `${points.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ")} Z`;
  return (
    <svg viewBox="0 0 1000 1000" aria-hidden="true" className="h-16 w-16 shrink-0 opacity-60 transition-opacity duration-300 group-hover:opacity-100">
      <path d={d} fill="none" stroke="#fff" strokeWidth="26" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={points[0][0]} cy={points[0][1]} r="34" fill="#dc2626" />
    </svg>
  );
}

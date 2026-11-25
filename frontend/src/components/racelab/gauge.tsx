/** A speedometer from 0 to 400 km/h, drawn as an arc with a needle, like a dashboard. */
export function Gauge({ speed, max = 400 }: { speed: number; max?: number }) {
  const cx = 100;
  const cy = 100;
  const r = 78;
  const start = 135; // degrees, clockwise from 12 o'clock: bottom left
  const sweep = 270;
  const pos = (deg: number, rad: number): [number, number] => [cx + rad * Math.sin((deg * Math.PI) / 180), cy - rad * Math.cos((deg * Math.PI) / 180)];
  const arc = (from: number, to: number) => {
    const [x0, y0] = pos(from, r);
    const [x1, y1] = pos(to, r);
    return `M${x0},${y0} A${r},${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1},${y1}`;
  };
  const frac = Math.min(1, Math.max(0, speed / max));
  const end = start + sweep * frac;
  const [nx, ny] = pos(end, r - 14);
  return (
    <svg viewBox="0 0 200 196" role="img" aria-label={`${Math.round(speed)} kilometres per hour`} className="mx-auto block w-full max-w-[16rem]">
      <path d={arc(start, start + sweep)} fill="none" stroke="#27272a" strokeWidth="9" strokeLinecap="round" />
      {frac > 0.002 && <path d={arc(start, end)} fill="none" stroke="#dc2626" strokeWidth="9" strokeLinecap="round" />}
      {[0, 100, 200, 300, 400].map((v) => {
        const deg = start + sweep * (v / max);
        const [x0, y0] = pos(deg, r - 9);
        const [x1, y1] = pos(deg, r - 17);
        const [tx, ty] = pos(deg, r - 28);
        return (
          <g key={v}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#71717a" strokeWidth="1.5" />
            <text x={tx} y={ty + 3} textAnchor="middle" fontSize="9" fill="#a1a1aa">{v}</text>
          </g>
        );
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill="#09090b" stroke="#dc2626" strokeWidth="2" />
      <text x={cx} y="176" textAnchor="middle" fontSize="34" fontWeight="800" fill="#fff">{Math.round(speed)}</text>
      <text x={cx} y="192" textAnchor="middle" fontSize="9" letterSpacing="2" fill="#a1a1aa">KM/H</text>
    </svg>
  );
}

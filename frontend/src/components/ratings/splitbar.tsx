const MIN = 1300;
const MAX = 2000;

/** A rating on the Elo scale as a bar; the tick marks the 1500 average. */
export function SplitBar({ label, hint, value }: { label: string; hint?: string; value: number }) {
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - MIN) / (MAX - MIN)) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-zinc-300">{label}</span>
        <span className="font-mono font-semibold text-white">{value}</span>
      </div>
      <div className="relative h-2 rounded bg-white/10" role="img" aria-label={`${label} ${value}, average is 1500`}>
        <div className="h-full rounded bg-red-500" style={{ width: `${pct(value)}%` }} />
        <div aria-hidden="true" className="absolute -top-1 h-4 w-px bg-white/60" style={{ left: `${pct(1500)}%` }} />
      </div>
      {hint && <p className="mt-1 text-[11px] text-zinc-400">{hint}</p>}
    </div>
  );
}

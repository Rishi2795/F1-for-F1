const COMPOUND_COLORS: Record<string, string> = {
  SOFT: "#ef4444",
  MEDIUM: "#facc15",
  HARD: "#e5e7eb",
  INTERMEDIATE: "#22c55e",
  WET: "#3b82f6",
};
const UNKNOWN = "#52525b";

type Source = "timing" | "continuity" | "openf1" | null;
type Props = { stints: { compound: string | null; laps: number; compound_source?: Source }[] | null; className?: string };

const SOURCE_NOTE: Record<string, string> = {
  continuity: "inferred: no pit stop separates these laps from the next stint",
  openf1: "filled from OpenF1",
};

/** Tyre strategy as proportional bars. Unknown compounds are grey, and say so. */
export function StintBar({ stints, className = "" }: Props) {
  if (!stints || stints.length === 0) {
    return <p className="text-xs text-zinc-500">Tyre data unavailable for this driver.</p>;
  }
  const label = stints.map((s) => `${s.compound ?? "unknown"} ${s.laps} laps`).join(", then ");
  return (
    <div className={className} role="img" aria-label={`Tyre strategy: ${label}`}>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-sm">
        {stints.map((s, i) => (
          <div
            key={i}
            title={`${s.compound ?? "Unknown"} · ${s.laps} laps${s.compound_source && SOURCE_NOTE[s.compound_source] ? ` (${SOURCE_NOTE[s.compound_source]})` : ""}`}
            style={{ flexGrow: s.laps, backgroundColor: s.compound ? (COMPOUND_COLORS[s.compound] ?? UNKNOWN) : UNKNOWN }}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

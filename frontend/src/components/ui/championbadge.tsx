/** "World Champion ×N" pill. Gold is used only here, so it always means a title. */
export function ChampionBadge({ titles, years, label = "World Champion", compact = false }: { titles: number; years?: number[]; label?: string; compact?: boolean }) {
  if (titles <= 0) return null;
  const text = titles > 1 ? `${label} ×${titles}` : label;
  return (
    <span
      title={years?.length ? `${label}: ${years.join(", ")}` : undefined}
      aria-label={years?.length ? `${text} (${years.join(", ")})` : text}
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M5 16 3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5Zm0 2h14v2H5v-2Z" />
      </svg>
      {compact ? `×${titles}` : text}
    </span>
  );
}

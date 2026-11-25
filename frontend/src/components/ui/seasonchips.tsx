import { chip } from "./chipstyle";

/** A row of season chips, newest first. */
export function SeasonChips({ seasons, value, onChange }: { seasons: number[]; value: number; onChange: (season: number) => void }) {
  return (
    <div role="group" aria-label="Season" className="flex flex-wrap gap-2">
      {[...seasons].sort((a, b) => b - a).map((s) => (
        <button key={s} type="button" aria-pressed={s === value} onClick={() => onChange(s)} className={chip(s === value)}>{s}</button>
      ))}
    </div>
  );
}

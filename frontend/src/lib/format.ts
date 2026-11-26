/** Display helpers. Missing values render as an em dash, never as 0 or a fake number. */

export const DASH = "—";

export function fmt(value: number | string | null | undefined, suffix = ""): string {
  return value === null || value === undefined ? DASH : `${value}${suffix}`;
}

export function fmtSigned(value: number | null | undefined): string {
  if (value === null || value === undefined) return DASH;
  return value > 0 ? `+${value}` : String(value);
}

export function fmtGrid(grid: number | null, pitLane: boolean): string {
  if (pitLane) return "PIT";
  return grid === null ? DASH : `P${grid}`;
}

const MISSING_LABELS: Record<string, string> = {
  laps: "lap timing",
  stints: "tyre stints",
  weather: "weather",
  results: "results",
  "laps(some drivers)": "lap timing for some drivers",
  "compound(some stints)": "tyre compound for some stints",
};

/** Turn the pipeline's machine-readable gaps into a sentence fragment people can read. */
export function describeMissing(missing: string[]): string {
  return missing.map((m) => MISSING_LABELS[m] ?? m).join(", ");
}

/** 91.488 -> "1:31.488"; null -> dash. */
export function fmtLap(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return DASH;
  const m = Math.floor(seconds / 60);
  const s = (seconds - m * 60).toFixed(3).padStart(6, "0");
  return m > 0 ? `${m}:${s}` : s;
}

/** Gap to the winner: "+11.825s", or "+1:02.300" past a minute. Null stays a dash. */
export function fmtGap(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return DASH;
  return seconds < 60 ? `+${seconds.toFixed(3)}s` : `+${fmtLap(seconds)}`;
}

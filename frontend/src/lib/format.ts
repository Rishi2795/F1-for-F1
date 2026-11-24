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

export function fmtFinish(finish: number | null): string {
  return finish === null ? DASH : String(finish).padStart(2, "0");
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

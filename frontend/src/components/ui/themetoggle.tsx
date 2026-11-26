import { useTheme, type Theme } from "../../lib/theme";

const OPTIONS: [Theme, string][] = [["dot", "Dot"], ["classic", "Classic"]];

/** Switch the display type between the dot-matrix look and the classic one. Remembered on this device. */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  return (
    <div role="group" aria-label="Typeface" className="inline-flex gap-1 rounded-sm border border-white/15 p-1">
      {OPTIONS.map(([key, label]) => (
        <button key={key} type="button" aria-pressed={theme === key} onClick={() => setTheme(key)} className={`rounded-sm px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 ${theme === key ? "bg-white text-black" : "text-zinc-300 hover:bg-white/10 hover:text-white"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

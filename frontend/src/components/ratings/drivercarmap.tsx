import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { readableOnDark } from "../../lib/color";
import { VERDICT_TEXT, ordinal, type RatingView } from "../../lib/ratings";

const AVERAGE = 1500;

/** Each driver as a dot: further right = stronger car, higher up = stronger driver. No numbers on the
 *  axes on purpose; position is the message. Dashed lines mark the average driver and the average car. */
export function DriverCarMap({ views, drivers, cars }: { views: RatingView[]; drivers: number; cars: number }) {
  const [active, setActive] = useState<string | null>(null);
  const xs = views.map((v) => v.entry.car);
  const ys = views.map((v) => v.entry.driver);
  const pad = (lo: number, hi: number) => [lo - (hi - lo) * 0.08, hi + (hi - lo) * 0.08] as const;
  const [x0, x1] = pad(Math.min(...xs), Math.max(...xs));
  const [y0, y1] = pad(Math.min(...ys), Math.max(...ys));
  const left = (car: number) => `${((car - x0) / (x1 - x0)) * 100}%`;
  const top = (driver: number) => `${(1 - (driver - y0) / (y1 - y0)) * 100}%`;
  const shown = views.find((v) => v.entry.code === active);

  return (
    <div className="rounded-sm glass p-3 sm:p-5">
      <div className="relative h-[380px] sm:h-[480px]">
        {/* guides */}
        {AVERAGE > x0 && AVERAGE < x1 && <span aria-hidden="true" className="absolute inset-y-0 border-l border-dashed border-white/15" style={{ left: left(AVERAGE) }} />}
        {AVERAGE > y0 && AVERAGE < y1 && <span aria-hidden="true" className="absolute inset-x-0 border-t border-dashed border-white/15" style={{ top: top(AVERAGE) }} />}
        <span aria-hidden="true" className="absolute left-2 top-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">Beats the car</span>
        <span aria-hidden="true" className="absolute right-2 top-1 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">Strong on both</span>
        <span aria-hidden="true" className="absolute bottom-1 left-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">Struggling</span>
        <span aria-hidden="true" className="absolute bottom-1 right-2 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">Carried by the car</span>

        <ul aria-label="Drivers placed by car strength and driver skill" className="absolute inset-x-4 inset-y-7 sm:inset-x-6 sm:inset-y-8">
          {views.map((v, i) => {
            const color = readableOnDark(`#${(v.entry.team_color ?? "888888").replace("#", "")}`);
            const on = active === v.entry.code;
            return (
              <li key={v.entry.code} className="f1-pop absolute" style={{ left: left(v.entry.car), top: top(v.entry.driver), "--d": `${i * 25}ms`, zIndex: on ? 20 : 1 } as CSSProperties}>
                <Link
                  to={`/driver/${v.entry.code}`}
                  aria-label={`${v.entry.code}: ${v.entry.name}, ${v.entry.team}. ${ordinal(v.driverRank)} best driver, ${ordinal(v.carRank)} best car. ${VERDICT_TEXT[v.verdict].label}.`}
                  onMouseEnter={() => setActive(v.entry.code)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(v.entry.code)}
                  onBlur={() => setActive(null)}
                  className="group flex items-center gap-1.5 rounded-sm outline-none"
                >
                  <span className={`block h-3 w-3 rounded-full ring-2 ring-[#050505] transition-transform duration-200 group-focus-visible:ring-white sm:h-3.5 sm:w-3.5 ${on ? "scale-150" : "group-hover:scale-125"}`} style={{ backgroundColor: color }} />
                  <span className={`font-mono text-[10px] font-bold transition-colors duration-200 sm:text-xs ${on ? "text-white" : "text-zinc-300"}`}>{v.entry.code}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {shown && (
          <div
            role="status"
            className="pointer-events-none absolute z-30 w-56 rounded-sm border border-white/15 bg-black/90 p-3"
            style={{ left: `calc(${left(shown.entry.car)} * 0.9 + 1.5rem)`, top: `calc(${top(shown.entry.driver)} * 0.88 + 2.5rem)`, transform: `translate(${((shown.entry.car - x0) / (x1 - x0)) > 0.6 ? "-105%" : "5%"}, -110%)` }}
          >
            <p className="font-bold text-white">{shown.entry.name}</p>
            <p className="text-xs text-zinc-400">{shown.entry.team}</p>
            <p className="mt-2 text-xs text-zinc-300">{ordinal(shown.driverRank)} best driver of {drivers} · {ordinal(shown.carRank)} best car of {cars}</p>
            <p className="mt-1 text-xs font-semibold text-white">{VERDICT_TEXT[shown.verdict].label}</p>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Further right: a stronger car. Higher up: a stronger driver. Dashed lines mark the average. Select a dot to open the driver.
      </p>
    </div>
  );
}

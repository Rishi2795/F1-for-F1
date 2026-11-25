import { useId, type ReactNode } from "react";
import { AnimatedNumber } from "./fx";
import { COMPOUND_COLOR, COMPOUND_LETTER, type Compound } from "../../lib/sim/types";
import { control as _unused } from "./format";


/** A tyre as a coloured ring with its letter. The name is for screen readers; the colour is never the only cue. */
export function Tyre({ compound, size = 22 }: { compound: Compound; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-grid shrink-0 place-items-center rounded-full font-mono font-bold leading-none text-white"
      style={{ width: size, height: size, border: `${Math.max(2, size / 8)}px solid ${COMPOUND_COLOR[compound]}`, fontSize: size * 0.42, background: "rgba(0,0,0,0.5)" }}
    >
      {COMPOUND_LETTER[compound]}
    </span>
  );
}


export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{label}</label>
      {children(id)}
      {hint && <p className="mt-1.5 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

export function Slider({ label, value, min, max, step, onChange, format, hint }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string; hint?: ReactNode }) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <div className="flex items-center gap-3">
          <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-2 w-full cursor-pointer accent-red-500" aria-valuetext={format(value)} />
          <output htmlFor={id} className="w-20 shrink-0 text-right font-mono text-sm tabular-nums text-white">{format(value)}</output>
        </div>
      )}
    </Field>
  );
}

export function Stat({ label, value, format, note }: { label: string; value: number; format: (n: number) => string; note?: string }) {
  return (
    <div className="border border-white/10 bg-black/30 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">{label}</p>
      <p className="mt-2 font-serif text-4xl leading-none text-white">
        <span className="sr-only">{format(value)}</span>
        <span aria-hidden="true" className="tabular-nums"><AnimatedNumber value={value} format={format} /></span>
      </p>
      {note && <p className="mt-2 text-xs text-zinc-400">{note}</p>}
    </div>
  );
}

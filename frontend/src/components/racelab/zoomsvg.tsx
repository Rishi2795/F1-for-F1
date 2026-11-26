import { MAX_ZOOM } from "./usezoompan";

export function ZoomControls({ zoom, onIn, onOut, onReset }: { zoom: number; onIn: () => void; onOut: () => void; onReset: () => void }) {
  const btn = "grid h-9 w-9 place-items-center border border-white/15 bg-black/60 font-mono text-base font-bold text-zinc-200 backdrop-blur hover:border-white/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-30";
  return (
    <div role="group" aria-label="Zoom the map" className="absolute right-3 top-3 flex flex-col gap-1">
      <button type="button" onClick={onIn} disabled={zoom >= MAX_ZOOM} className={btn}><span aria-hidden="true">+</span><span className="sr-only">Zoom in</span></button>
      <button type="button" onClick={onOut} disabled={zoom <= 1} className={btn}><span aria-hidden="true">−</span><span className="sr-only">Zoom out</span></button>
      <button type="button" onClick={onReset} disabled={zoom === 1} className={`${btn} text-[9px] tracking-widest`}><span aria-hidden="true">1×</span><span className="sr-only">Reset the view</span></button>
      <span aria-live="polite" className="text-center font-mono text-[9px] tracking-widest text-zinc-500">{zoom.toFixed(1)}×</span>
    </div>
  );
}

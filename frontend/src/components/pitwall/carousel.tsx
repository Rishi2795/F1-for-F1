import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { Link } from "react-router-dom";

export type CarouselTool = { to: string; title: string; question: string; teaser?: string; Icon: LucideIcon };

/** One accent per card, always from the site's own palette (red, white, amber, sky, emerald), in a fixed order. */
const ACCENTS = ["#ef4444", "#f4f4f5", "#fbbf24", "#38bdf8", "#34d399"];

const mod = (a: number, n: number) => ((a % n) + n) % n;
const DRAG_DEG_PER_PX = 0.28;

/** The pit wall's tools on a ring in 3D: the card in front faces you, the others curve away behind it. Drag the ring, use the arrows
 *  or the keyboard to turn it, or jump straight to a tool. Every card stays a real link. */
export function ToolCarousel({ tools }: { tools: CarouselTool[] }) {
  const n = tools.length;
  const step = 360 / n;
  const stage = useRef<HTMLDivElement>(null);
  const [turn, setTurn] = useState(0); // whole turns of one card; may run past n so the ring can keep spinning one way
  const [drag, setDrag] = useState(0); // degrees, while a finger or mouse is down
  const [size, setSize] = useState({ w: 340, ring: 560 });
  const pointer = useRef<{ x: number; id: number; moved: boolean } | null>(null);
  const active = mod(turn, n);

  // card width follows the screen; the ring's radius is whatever lets n cards of that width sit side by side with a little air
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => {
      const w = Math.max(230, Math.min(360, el.clientWidth * 0.72));
      setSize({ w, ring: (w / 2 / Math.tan(Math.PI / n)) * 1.14 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [n]);

  // The mouse wheel or a trackpad swipe over the ring turns it, one card a time (a short pause after each, so a trackpad's
  // coasting does not spin it round). Elsewhere on the page scrolling is untouched.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let acc = 0;
    let last = -Infinity; // time of the last turn: the pause only follows a real turn
    let idle = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // a pinch-zoom
      e.preventDefault();
      window.clearTimeout(idle);
      idle = window.setTimeout(() => (acc = 0), 160);
      const now = performance.now();
      if (now - last < 420) return;
      acc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(acc) >= 40) {
        const dir = Math.sign(acc); // taken now: the updater below may run after `acc` is reset
        setTurn((t) => t + dir);
        acc = 0;
        last = now;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.clearTimeout(idle);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  const goTo = (i: number) => {
    let d = mod(i, n) - active;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    setTurn((t) => t + d);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); setTurn((t) => t + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); setTurn((t) => t - 1); }
    else if (e.key === "Home") { e.preventDefault(); goTo(0); }
    else if (e.key === "End") { e.preventDefault(); goTo(n - 1); }
  };

  const down = (e: PointerEvent) => {
    pointer.current = { x: e.clientX, id: e.pointerId, moved: false };
  };
  const move = (e: PointerEvent) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x;
    if (Math.abs(dx) > 6 && !p.moved) {
      p.moved = true;
      stage.current?.setPointerCapture(e.pointerId);
    }
    if (p.moved) setDrag(dx * DRAG_DEG_PER_PX);
  };
  const up = (e: PointerEvent) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    if (p.moved) setTurn((t) => t - Math.round(drag / step));
    setDrag(0);
    // a drag must not count as a click on the card under the finger
    window.setTimeout(() => (pointer.current = null), 0);
  };

  const dragging = drag !== 0;
  const arrow = "grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur transition-colors hover:border-white hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600";

  return (
    <section aria-roledescription="carousel" aria-label="Pit wall tools" className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-400" aria-live="polite">
          <span className="text-white">{String(active + 1).padStart(2, "0")}</span> / {String(n).padStart(2, "0")} · {tools[active]?.title}
        </p>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous tool" onClick={() => setTurn((t) => t - 1)} className={arrow}><ChevronLeft aria-hidden="true" size={20} /></button>
          <button type="button" aria-label="Next tool" onClick={() => setTurn((t) => t + 1)} className={arrow}><ChevronRight aria-hidden="true" size={20} /></button>
        </div>
      </div>

      <div
        ref={stage}
        tabIndex={0}
        aria-label="Turn the ring with the arrow keys, the scroll wheel, or drag it"
        onKeyDown={onKey}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="relative h-[26rem] cursor-grab select-none overflow-hidden [perspective:1700px] [touch-action:pan-y] focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 active:cursor-grabbing"
      >
        {/* the ring's floor: a flat ellipse the cards seem to stand on */}
        <div aria-hidden="true" className="pointer-events-none absolute bottom-3 left-1/2 h-40 w-[78%] -translate-x-1/2 [transform:translateX(-50%)_rotateX(72deg)]">
          <div className="h-full w-full rounded-[50%] border border-white/15 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.10),transparent_70%)]" />
        </div>

        <div
          className="absolute left-1/2 top-4 [transform-style:preserve-3d] motion-reduce:!transition-none"
          style={{
            width: size.w,
            height: "21rem",
            marginLeft: -size.w / 2,
            transform: `translateZ(${-size.ring}px) rotateY(${-turn * step + drag}deg)`,
            transition: dragging ? "none" : "transform 900ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {tools.map((t, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            const off = Math.abs(((mod(i - turn, n) + n / 2) % n) - n / 2); // how many places round the ring from the front
            const front = i === active;
            const opacity = front ? 1 : off <= 1.01 ? 0.78 : off <= 2.01 ? 0.5 : 0.3;
            return (
              <div
                key={t.to}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${n}: ${t.title}`}
                className="absolute inset-0 [backface-visibility:hidden] motion-reduce:!transition-none"
                style={{ transform: `rotateY(${i * step}deg) translateZ(${size.ring}px)`, opacity, transition: dragging ? "none" : "opacity 600ms" }}
              >
                <Link
                  to={t.to}
                  onFocus={() => goTo(i)}
                  onClickCapture={(e) => { if (pointer.current?.moved) e.preventDefault(); }}
                  draggable={false}
                  style={{ "--accent": accent, backgroundImage: `radial-gradient(circle at 15% 0%, ${accent}30, transparent 55%), radial-gradient(circle at 100% 100%, ${accent}14, transparent 50%)` } as CSSProperties}
                  className={`group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-sm border bg-[#0a0a0a] p-6 transition-[border-color,box-shadow] duration-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${front ? "border-[var(--accent)] shadow-[0_0_44px_-10px_var(--accent)]" : "border-white/10"}`}
                >
                  <span aria-hidden="true" className="pointer-events-none absolute -bottom-6 -right-2 select-none font-serif text-[9rem] leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.12)]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="relative flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-400">REF_{String(i + 1).padStart(2, "0")}</span>
                    <span className="grid h-11 w-11 place-items-center rounded-full border" style={{ borderColor: accent, color: accent, backgroundColor: `${accent}1a` }}><t.Icon aria-hidden="true" size={20} strokeWidth={1.8} /></span>
                  </span>
                  <span className="relative block">
                    <span className="block text-2xl font-black uppercase italic leading-none tracking-tighter text-white sm:text-3xl">{t.title}</span>
                    <span className="mt-3 block text-sm text-zinc-300 sm:text-base">{t.question}</span>
                    {t.teaser && <span className="mt-4 inline-block rounded-sm border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ borderColor: `${accent}88`, color: accent }}>{t.teaser}</span>}
                  </span>
                  <span className="relative flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">
                    <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
                    <span className="ml-3 text-white transition-transform duration-300 group-hover:translate-x-1">OPEN →</span>
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      <div role="group" aria-label="Jump to a tool" className="flex flex-wrap justify-center gap-2">
        {tools.map((t, i) => (
          <button key={t.to} type="button" aria-current={i === active ? "true" : undefined} onClick={() => goTo(i)} className={`rounded-full border px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${i === active ? "border-white bg-white text-black" : "border-white/15 text-zinc-300 hover:border-white/60 hover:text-white"}`}>
            {t.title}
          </button>
        ))}
      </div>
    </section>
  );
}

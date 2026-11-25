import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type RefObject } from "react";

const BOX = 1000;
export const MAX_ZOOM = 10;

type View = { zoom: number; cx: number; cy: number };

/** Keep the window inside the 1000 x 1000 drawing. */
function clamp(v: View): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom));
  const half = BOX / zoom / 2;
  return { zoom, cx: Math.min(BOX - half, Math.max(half, v.cx)), cy: Math.min(BOX - half, Math.max(half, v.cy)) };
}

/** The view after zooming by `factor`, keeping the drawing point under the cursor where it is. */
function zoomView(v: View, factor: number, r: DOMRect | null, clientX?: number, clientY?: number): View {
  const next = Math.min(MAX_ZOOM, Math.max(1, v.zoom * factor));
  if (!r || clientX === undefined || clientY === undefined) return clamp({ ...v, zoom: next });
  const side = Math.min(r.width, r.height);
  const px = (clientX - (r.left + r.width / 2)) / side;
  const py = (clientY - (r.top + r.height / 2)) / side;
  return clamp({ zoom: next, cx: v.cx + px * (BOX / v.zoom) - px * (BOX / next), cy: v.cy + py * (BOX / v.zoom) - py * (BOX / next) });
}

/** Zoom and pan for an SVG drawn in a 1000 x 1000 box: mouse wheel, drag, pinch, and buttons.
 *
 *  Returns the `viewBox` and handlers for the <svg>, the zoom (so drawings can keep strokes and markers a constant size
 *  on screen), and controls. `follow` keeps the window centred on a point (at the current zoom) while it is set. */
export function useZoomPan(svg: RefObject<SVGSVGElement | null>, follow?: [number, number] | null) {
  const [base, setView] = useState<View>({ zoom: 1, cx: BOX / 2, cy: BOX / 2 });
  // Following glides toward the target a little each frame instead of jumping, so a moving pack feels like a camera.
  const [glide, setGlide] = useState<[number, number] | null>(null);
  const target = useRef<[number, number] | null>(null);
  const following = !!follow;
  useEffect(() => {
    target.current = follow ?? null;
  });
  useEffect(() => {
    if (!following) return;
    let raf = 0;
    const step = () => {
      const goal = target.current;
      if (goal) setGlide((g) => (g ? [g[0] + (goal[0] - g[0]) * 0.1, g[1] + (goal[1] - g[1]) * 0.1] : goal));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      setGlide(null);
    };
  }, [following]);
  const centre = follow ? (glide ?? follow) : null;
  const view = centre ? clamp({ zoom: base.zoom, cx: centre[0], cy: centre[1] }) : base;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ x: number; y: number; dist: number } | null>(null);
  const moved = useRef(false);

  const zoomNow = useRef(1);
  useEffect(() => {
    zoomNow.current = view.zoom;
  });

  /** Screen pixels to drawing units, at the current zoom. */
  const unitSize = () => {
    const r = svg.current?.getBoundingClientRect();
    return r && r.width ? BOX / view.zoom / Math.min(r.width, r.height) : null;
  };
  const zoomAt = (factor: number, clientX?: number, clientY?: number) => {
    const r = svg.current?.getBoundingClientRect() ?? null;
    setView((v) => zoomView(v, factor, r, clientX, clientY));
  };

  // Wheel zoom needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && zoomNow.current === 1 && e.deltaY > 0) return; // let the page scroll when fully zoomed out
      e.preventDefault();
      const r = el.getBoundingClientRect();
      setView((v) => zoomView(v, Math.exp(-e.deltaY * 0.0022), r, e.clientX, e.clientY));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [svg]);

  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    const pts = [...pointers.current.values()];
    last.current = { x: e.clientX, y: e.clientY, dist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0 };
  };
  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const unit = unitSize();
    if (!unit || !last.current) return;
    if (pts.length === 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (last.current.dist) zoomAt(dist / last.current.dist, (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      last.current = { ...last.current, dist };
      moved.current = true;
      return;
    }
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    if (!moved.current && Math.hypot(dx, dy) < 4) return; // a tap, not a drag
    if (view.zoom > 1) {
      moved.current = true;
      setView((v) => clamp({ ...v, cx: v.cx - dx * unit, cy: v.cy - dy * unit }));
    }
    last.current = { ...last.current, x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: RPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    last.current = null;
  };

  const half = BOX / view.zoom / 2;
  return {
    zoom: view.zoom,
    /** True right after a drag or pinch, so a click handler can ignore it. */
    wasDrag: () => moved.current,
    svgProps: {
      viewBox: `${view.cx - half} ${view.cy - half} ${half * 2} ${half * 2}`,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      // Zoomed out, a finger can still scroll the page; zoomed in, it pans the map.
      style: { touchAction: view.zoom > 1 ? "none" : "pan-y", cursor: view.zoom > 1 ? "grab" : "default" },
    },
    zoomIn: () => zoomAt(1.6),
    zoomOut: () => zoomAt(1 / 1.6),
    reset: () => setView({ zoom: 1, cx: BOX / 2, cy: BOX / 2 }),
    /** Make sure the view is at least this zoomed in (used when switching on follow). */
    ensureZoom: (min: number) => setView((v) => clamp({ ...v, zoom: Math.max(v.zoom, min) })),
    /** Zoom in on a drawing point. */
    focusOn: (x: number, y: number) => setView((v) => clamp({ zoom: Math.max(v.zoom, 3.5), cx: x, cy: y })),
    /** Drawing units from a pointer event on the svg. */
    toDrawing: (clientX: number, clientY: number): [number, number] | null => {
      const r = svg.current?.getBoundingClientRect();
      if (!r) return null;
      const side = Math.min(r.width, r.height);
      return [view.cx + ((clientX - (r.left + r.width / 2)) / side) * (BOX / view.zoom), view.cy + ((clientY - (r.top + r.height / 2)) / side) * (BOX / view.zoom)];
    },
  };
}

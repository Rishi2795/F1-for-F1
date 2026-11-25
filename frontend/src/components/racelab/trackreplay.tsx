import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { chip } from "../ui/chipstyle";
import { COMPOUND_COLORS } from "../../lib/compounds";
import { readableOnDark } from "../../lib/color";
import { carAt, distanceAt, leaderLap, pointAt, raceLength } from "../../lib/trackmap";
import { lapClock, readingAt } from "../../lib/telemetry";
import { liveAt } from "../../lib/replay";
import { causeOf, pitWindows, retirement, type RaceEvent } from "../../lib/events";
import { EventFeed } from "./eventfeed";
import type { DriverRace, LapDoc, IncidentDoc, ReplayDoc, TelemetryDoc } from "../../types/api";
import { useZoomPan } from "./usezoompan";
import { ZoomControls } from "./zoomsvg";

const SPEEDS = [1, 2, 5, 10, 30];
const FLAG: Record<string, string> = { SC: "SAFETY_CAR", VSC: "VIRTUAL_SAFETY_CAR", R: "RED_FLAG", Y: "YELLOW_FLAGS" };
const clock = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

type Props = { doc: LapDoc; drivers: DriverRace[]; outline: number[][]; telemetry?: TelemetryDoc | null; replay?: ReplayDoc | null; incidents?: IncidentDoc | null; events?: RaceEvent[]; t: number; setT: Dispatch<SetStateAction<number>> };

/** The race played back on the circuit. Each car's place on the lap comes from its exact lap timing, so who is ahead and
 *  by how much is right; where it is within a lap assumes an even pace round that lap. */
export function TrackReplay({ doc, drivers, outline, telemetry, replay, incidents, events, t, setT }: Props) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [paint, setPaint] = useState<"team" | "tyre">("team");
  const [picked, setPicked] = useState<string[]>([]);
  /** Click a driver to highlight only them; up to two at once (a third replaces the oldest). */
  const pick = (code: string) => setPicked((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code].slice(-2)));
  const [follow, setFollow] = useState<"off" | "pack" | "car">("off");
  const [hover, setHover] = useState<{ code: string; x: number; y: number; w: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const length = useMemo(() => raceLength(doc.drivers), [doc]);
  // A red flag stops the race: the clock runs on quickly through it, and the cars wait at the line.
  const inRed = (time: number) => doc.status[leaderLap(doc.drivers, time, doc.laps) - 1] === "R";

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setT((cur) => {
        const next = cur + dt * (inRed(cur) ? speed * 25 : speed);
        if (next >= length) {
          setPlaying(false);
          return length;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, length, setT]); // eslint-disable-line react-hooks/exhaustive-deps

  const lap = leaderLap(doc.drivers, t, doc.laps);
  const flag = doc.status[lap - 1] ?? "G";
  const path = useMemo(() => `${outline.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ")} Z`, [outline]);

  const cars = useMemo(() => {
    return doc.drivers
      .map((d) => {
        const meta = drivers.find((x) => x.driver_code === d.code);
        const c = carAt(d, t, doc.laps);
        const stint = c.state === "racing" ? (meta?.stints ?? []).find((s) => c.lap >= s.lap_start && c.lap <= s.lap_end) : undefined;
        const grid = meta?.grid ?? 20;
        const suspended = c.state === "racing" && doc.status[c.lap - 1] === "R" && (d.lap_times[c.lap - 1] ?? 0) > 300;
        // Real positions and sensors when the race has them; otherwise the lap timing places the car.
        const rd = replay ? replay.drivers.find((x) => x.code === d.code) : undefined;
        const live = rd && replay ? liveAt(rd, t, replay.offset_s) : null;
        const inPit = !!meta && pitWindows(doc, meta).some((w) => t >= w.from && t <= w.to);
        // A retired car stays on the map as a marker for two minutes where it stopped, then leaves it.
        const stop = meta ? retirement(doc, meta) : null;
        const out = c.state === "out" && !!stop && t - stop.t <= 120 && !!live;
        const cause = c.state === "out" && stop ? (causeOf(d.code, stop.t, incidents ?? null) ?? "Retired (the cause was not published)") : null;
        const frac = c.state === "out" ? (out && live ? live.frac : null) : live ? live.frac : suspended ? 1 - 0.006 * grid : c.state === "racing" ? c.frac : c.state === "finished" ? 0 : c.state === "grid" ? 1 - 0.006 * grid : null;
        return { code: d.code, meta, c, dist: distanceAt(c), frac, live, inPit, out, cause, tyre: stint?.compound ?? null };
      })
      .sort((a, b) => b.dist - a.dist);
  }, [doc, drivers, replay, incidents, t]);

  const leader = cars[0];
  const avgLap = (doc.drivers.find((d) => d.code === leader?.code)?.lap_times.filter((x): x is number => x !== null && x < 200).reduce((a, b) => a + b, 0) ?? 0) / Math.max(1, doc.laps);
  const colorOf = (car: (typeof cars)[number]) =>
    paint === "tyre" ? (car.tyre ? (COMPOUND_COLORS[car.tyre] ?? "#52525b") : "#52525b") : readableOnDark(`#${(car.meta?.team_color ?? "888888").replace("#", "")}`);
  const picks = picked.map((code) => cars.find((c) => c.code === code)).filter((c): c is (typeof cars)[number] => !!c);
  const pickPoints = picks.filter((c) => c.frac !== null).map((c) => pointAt(outline, c.frac as number));
  const focusPos: [number, number] | null = pickPoints.length ? [pickPoints.reduce((a, p) => a + p[0], 0) / pickPoints.length, pickPoints.reduce((a, p) => a + p[1], 0) / pickPoints.length] : null;
  // The pack: the busiest stretch of track (most cars within 6% of a lap of each other), the front-most on a tie.
  const pack = useMemo(() => {
    const on = cars.filter((c) => c.frac !== null && (c.c.state === "racing" || c.c.state === "grid")).map((c) => c.frac as number);
    if (!on.length) return null;
    const near = (a: number, b: number) => Math.abs(((a - b + 1.5) % 1) - 0.5) <= 0.06;
    let best: number[] = [];
    for (const f of on) {
      const group = on.filter((g) => near(f, g));
      if (group.length > best.length) best = group;
    }
    const ref = best[0];
    const mean = ref + best.reduce((a, g) => a + (((g - ref + 1.5) % 1) - 0.5), 0) / best.length;
    return pointAt(outline, mean);
  }, [cars, outline]);
  const target = follow === "pack" ? pack : follow === "car" ? focusPos : null;
  const view = useZoomPan(svg, target);
  const k = 1 / view.zoom;
  const road = 20 / view.zoom ** 0.55;
  // Where each car is drawn, and which get a name. Bunched cars are nudged to alternate sides of the racing line, and a name
  // is only written when it would not land on one already written.
  const drawn = cars.map((car, rank) => {
    if (car.frac === null) return null;
    const [x0, y0] = pointAt(outline, car.frac);
    const [x1, y1] = pointAt(outline, car.frac + 0.003);
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const side = ((rank % 5) - 2) * 7 * k;
    return { code: car.code, x: x0 - ((y1 - y0) / len) * side, y: y0 + ((x1 - x0) / len) * side };
  });
  // Names go next to their dot on whichever side is free: each is tried at eight spots around the dot and kept at the first
  // one that touches no other name and no other dot. A name with no free spot is left out (hover for it). Chosen drivers
  // come first, then the leader, then the rest by position, and the rest only appear once zoomed in enough to have room.
  const labels = new Map<string, { x: number; y: number; end: boolean }>();
  const boxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const hit = (b: { x0: number; y0: number; x1: number; y1: number }) =>
    boxes.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0) ||
    drawn.some((d) => d && b.x0 - 8 * k < d.x && d.x < b.x1 + 8 * k && b.y0 - 8 * k < d.y && d.y < b.y1 + 8 * k);
  const w = 28 * k;
  const h = 12 * k;
  const gap = 12 * k;
  const spots = [[gap, 0], [-gap, 0], [0, -gap - h / 2], [0, gap + h], [gap, -h * 1.1], [gap, h * 1.4], [-gap, -h * 1.1], [-gap, h * 1.4]];
  const order = [...picked, ...cars.map((c) => c.code).filter((c) => !picked.includes(c))];
  for (const code of order) {
    const d = drawn[cars.findIndex((c) => c.code === code)];
    if (!d) continue;
    const chosen = picked.includes(code);
    const stopped = cars.find((c) => c.code === code)?.out;
    if (!chosen && !stopped && !(picked.length === 0 && (code === cars[0]?.code || view.zoom >= 1.8))) continue;
    for (const [dx, dy] of spots) {
      const end = dx < 0; // a name to the left of its dot is right-aligned
      const x0 = dx === 0 ? d.x - w / 2 : end ? d.x + dx - w : d.x + dx;
      const box = { x0, y0: d.y + dy - h * 0.75, x1: x0 + w, y1: d.y + dy + h * 0.25 };
      if (hit(box)) continue;
      boxes.push(box);
      labels.set(code, { x: dx === 0 ? d.x : d.x + dx, y: d.y + dy, end: dx === 0 ? false : end });
      break;
    }
  }
  const [sx, sy] = pointAt(outline, 0);
  const [nx, ny] = pointAt(outline, 0.01);
  const norm = Math.hypot(ny - sy, nx - sx) || 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" aria-pressed={playing} onClick={() => { if (t >= length) setT(0); setPlaying((p) => !p); }} className={chip(playing)}>{playing ? "PAUSE" : t >= length ? "REPLAY" : "PLAY"}</button>
        <div role="group" aria-label="Replay speed" className="flex gap-1">
          {SPEEDS.map((s) => <button key={s} type="button" aria-pressed={speed === s} onClick={() => setSpeed(s)} className={`${chip(speed === s)} !px-2.5`}>{s}×</button>)}
        </div>
        <div role="group" aria-label="Colour cars by" className="flex gap-1">
          {(["team", "tyre"] as const).map((p) => <button key={p} type="button" aria-pressed={paint === p} onClick={() => setPaint(p)} className={`${chip(paint === p)} !px-2.5`}>{p.toUpperCase()}</button>)}
        </div>
        <button type="button" aria-pressed={follow === "pack"} onClick={() => { if (follow !== "pack") view.ensureZoom(3); setFollow((f) => (f === "pack" ? "off" : "pack")); }} className={chip(follow === "pack")}>{follow === "pack" ? "FOLLOWING PACK" : "AUTO-ZOOM PACK"}</button>
        <span title={replay ? "Cars are placed from position data sampled once a second" : "Cars are placed from lap timing: order and gaps are exact, the spot within a lap is estimated"} className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] ${replay ? "border-emerald-500/60 text-emerald-300" : "border-white/15 text-zinc-500"}`}>{replay ? "REAL POSITIONS" : "ESTIMATED POSITIONS"}</span>
        <span className={`ml-auto border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] ${flag === "G" ? "border-white/15 text-zinc-500" : flag === "R" ? "border-red-500 text-red-400" : "border-white/60 text-white"}`}>{flag === "G" ? "GREEN" : (FLAG[flag] ?? flag)}</span>
      </div>

      <label className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">LAP_{lap}_OF_{doc.laps} · {clock(t)}</span>
        <input type="range" min={0} max={Math.floor(length)} value={Math.floor(t)} onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }} aria-label="Race time" className="h-2 min-w-full flex-1 cursor-pointer accent-red-600 sm:min-w-[6rem]" />
      </label>

      <div className="grid gap-4 lg:h-[calc(100svh-15rem)] lg:min-h-[460px] lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div ref={stage} className="glass relative flex h-[62svh] min-h-[360px] flex-col p-2 lg:h-auto">
          <svg ref={svg} {...view.svgProps} role="img" aria-label={`Track map replay at lap ${lap}: ${cars.slice(0, 3).map((c) => c.code).join(", ")} lead`} className="mx-auto block min-h-0 w-full flex-1">
            <path d={path} fill="none" stroke={flag === "R" ? "#7f1d1d" : "#2b2b30"} strokeWidth={road} strokeLinejoin="round" style={{ transition: "stroke 300ms" }} />
            <path d={path} fill="none" stroke="#ffffff" strokeOpacity={flag === "SC" || flag === "VSC" ? 0.8 : 0.35} strokeWidth={1.6 * k} strokeLinejoin="round" strokeDasharray={`${5 * k} ${5 * k}`} />
            <line x1={sx - ((ny - sy) / norm) * road * 0.75} y1={sy + ((nx - sx) / norm) * road * 0.75} x2={sx + ((ny - sy) / norm) * road * 0.75} y2={sy - ((nx - sx) / norm) * road * 0.75} stroke="#dc2626" strokeWidth={4 * k} />
            {[...cars].reverse().map((car) => {
              const at = drawn[cars.indexOf(car)];
              if (!at) return null;
              const on = picked.includes(car.code);
              const dim = picked.length > 0 && !on;
              const { x, y } = at;
              return (
                <g key={car.code} opacity={dim ? 0.3 : 1} style={{ cursor: "pointer" }} onClick={() => { if (!view.wasDrag()) pick(car.code); }} onPointerMove={(e) => { const r = stage.current?.getBoundingClientRect(); if (r) setHover({ code: car.code, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width }); }} onPointerLeave={() => setHover(null)}>
                  <circle cx={x} cy={y} r={13 * k} fill="transparent" />
                  {on && <circle cx={x} cy={y} r={14 * k} fill="none" stroke="#ffffff" strokeWidth={1.4 * k} />}
                  {car.out ? (
                    <path d={`M${x - 7 * k},${y - 7 * k} L${x + 7 * k},${y + 7 * k} M${x + 7 * k},${y - 7 * k} L${x - 7 * k},${y + 7 * k}`} stroke="#ef4444" strokeWidth={3 * k} strokeLinecap="round" />
                  ) : (
                    <>
                      {car.inPit && <circle cx={x} cy={y} r={12 * k} fill="none" stroke="#38bdf8" strokeWidth={1.5 * k} strokeDasharray={`${3 * k} ${3 * k}`} />}
                      <circle cx={x} cy={y} r={(on ? 9.5 : 8) * k} fill={colorOf(car)} stroke="#0a0a0a" strokeWidth={1.2 * k} />
                    </>
                  )}
                  {labels.has(car.code) && <text x={labels.get(car.code)!.x} y={labels.get(car.code)!.y} textAnchor={labels.get(car.code)!.x === x ? "middle" : labels.get(car.code)!.end ? "end" : "start"} fontSize={(on ? 13 : 12) * k} fontWeight="700" fill={on ? "#fff" : "#e4e4e7"} stroke="#050505" strokeWidth={3 * k} paintOrder="stroke">{car.code}{car.out ? " OUT" : car.inPit ? " PIT" : ""}</text>}
                </g>
              );
            })}
          </svg>
          {hover && (() => {
            const i = cars.findIndex((c) => c.code === hover.code);
            const car = cars[i];
            const m = car?.meta;
            if (!car || !m) return null;
            const d = doc.drivers.find((x) => x.code === car.code);
            const last = d && car.c.state === "racing" ? d.lap_times[car.c.lap - 2] : null;
            const stint = (m.stints ?? []).find((s) => car.c.state === "racing" && car.c.lap >= s.lap_start && car.c.lap <= s.lap_end);
            const age = stint && car.c.state === "racing" ? (stint.tyre_age_start ?? 0) + car.c.lap - stint.lap_start : null;
            const stops = (m.stints ?? []).filter((s) => car.c.state === "racing" && s.lap_start > 1 && s.lap_start <= car.c.lap).length;
            const gap = i === 0 ? "Leader" : `+${((leader.dist - car.dist) * avgLap).toFixed(1)}s`;
            return (
              <div role="tooltip" className="pointer-events-none absolute z-10 w-56 border border-white/20 bg-black/90 p-3 font-mono text-[11px] text-zinc-300 shadow-xl backdrop-blur" style={{ left: Math.min(hover.x + 16, hover.w - 232), top: Math.max(hover.y - 8, 4) }}>
                <div className="flex items-center gap-2"><span className="h-3 w-1" style={{ backgroundColor: colorOf(car) }} /><b className="text-sm text-white">{m.driver_name}</b></div>
                <div className="mb-2 mt-0.5 text-zinc-500">{m.team}</div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                  <dt className="text-zinc-500">Position</dt><dd className="text-right text-white">{car.c.state === "out" ? "OUT" : `P${i + 1}`} <span className="text-zinc-400">({gap})</span></dd>
                  <dt className="text-zinc-500">Grid</dt><dd className="text-right">{m.grid ? `P${m.grid}` : "—"}</dd>
                  <dt className="text-zinc-500">Tyre</dt><dd className="text-right">{car.tyre ? `${car.tyre}${age !== null ? ` · ${age} laps` : ""}` : "—"}</dd>
                  <dt className="text-zinc-500">Stops</dt><dd className="text-right">{car.c.state === "racing" ? stops : "—"}</dd>
                  <dt className="text-zinc-500">Last lap</dt><dd className="text-right">{last ? lapClock(last * 1000) : "—"}</dd>
                  {(car.inPit || car.cause) && <><dt className="text-zinc-500">Status</dt><dd className="text-right text-white">{car.inPit ? "In the pit lane" : "Stopped"}</dd></>}
                </dl>
                {car.cause && <p className="mt-2 border-t border-white/10 pt-2 text-[10px] leading-snug text-zinc-400">{car.cause}</p>}
              </div>
            );
          })()}
          <ZoomControls zoom={view.zoom} onIn={view.zoomIn} onOut={view.zoomOut} onReset={() => { setFollow("off"); view.reset(); }} />
          {picks.length > 0 && (
            <div className="absolute bottom-14 left-3 right-16 space-y-1.5 border border-white/15 bg-black/70 px-3 py-2 font-mono text-[11px] text-zinc-200 backdrop-blur sm:right-auto">
              <div className="flex items-center gap-3">
                <button type="button" aria-pressed={follow === "car"} onClick={() => { if (follow !== "car") view.ensureZoom(3.5); setFollow((f) => (f === "car" ? "off" : "car")); }} className={`${chip(follow === "car")} !px-2 !py-1`}>FOLLOW</button>
                <button type="button" onClick={() => { setPicked([]); setFollow((f) => (f === "car" ? "off" : f)); }} className={`${chip(false)} !px-2 !py-1`}>SHOW ALL</button>
              </div>
              {picks.map((car) => {
                const ref = car.frac !== null ? telemetry?.drivers.find((x) => x.code === car.code) : undefined;
                const r = car.live ?? (ref && car.frac !== null ? readingAt(ref, car.frac) : null);
                return (
                  <div key={car.code} className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
                    <span className="flex items-center gap-1.5 font-bold text-white"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorOf(car) }} />{car.code}</span>
                    {r && r.speed !== null ? (
                      <>
                        <span className="tabular-nums"><b className="text-white">{Math.round(r.speed)}</b> km/h</span>
                        <span>GEAR <b className="text-white">{r.gear || "N"}</b></span>
                        <span>THR <b className="text-white tabular-nums">{r.throttle === null ? "—" : `${Math.round(r.throttle)}%`}</b></span>
                        <span className={r.brake ? "font-bold text-red-400" : "text-zinc-500"}>BRAKE</span>
                        {r.drs && <span className="text-emerald-300">DRS</span>}
                      </>
                    ) : <span className="text-zinc-500">no telemetry for this circuit</span>}
                  </div>
                );
              })}
              {replay ? <p className="text-[10px] text-zinc-500">Live readings from the race data, once a second.</p> : telemetry && <p className="text-[10px] text-zinc-500">Readings are each driver’s fastest lap at this point on the track, not this lap.</p>}
            </div>
          )}
          <p className="px-2 pt-1 text-[11px] leading-snug text-zinc-500">Who is ahead, and by how much, comes straight from the lap timing. Where a car is within its lap assumes an even pace round that lap. Scroll or pinch to zoom, drag to move, click a driver (up to two) to highlight them.</p>
        </div>

        <ol aria-label={`Running order at lap ${lap}`} className="glass h-full max-h-[48svh] overflow-auto lg:max-h-none">
          {cars.map((car, i) => (
            <li key={car.code} title={car.cause ?? undefined} className="grid grid-cols-[1.5rem_3rem_1fr_4.5rem] items-center gap-2 border-t border-white/[0.06] px-3 py-1.5 first:border-t-0" style={picked.includes(car.code) ? { backgroundColor: "rgba(255,255,255,0.12)", boxShadow: `inset 3px 0 0 ${colorOf(car)}` } : picked.length ? { opacity: 0.55 } : undefined}>
              <span className="font-serif text-lg text-white">{car.c.state === "out" ? "—" : i + 1}</span>
              <button type="button" aria-pressed={picked.includes(car.code)} onClick={() => pick(car.code)} className="flex items-center gap-2 text-left font-mono text-xs font-bold text-white">
                <span aria-hidden="true" className="h-3 w-3 rounded-full border-2 border-white" style={{ backgroundColor: colorOf(car) }} />{car.code}
              </button>
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                {car.tyre && <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border border-black" style={{ backgroundColor: COMPOUND_COLORS[car.tyre] ?? "#52525b" }} />}
                {car.c.state === "out" ? "OUT" : car.c.state === "finished" ? "FINISHED" : car.inPit ? "PIT" : car.tyre ? car.tyre.slice(0, 1) : ""}
              </span>
              <span className="text-right font-mono text-xs text-zinc-300">
                {car.c.state === "out" || car.c.state === "grid" ? "" : i === 0 ? "LEADER" : leader.dist - car.dist >= 1 ? `+${Math.floor(leader.dist - car.dist)}_LAP` : `+${((leader.dist - car.dist) * avgLap).toFixed(1)}s`}
              </span>
            </li>
          ))}
        </ol>
      </div>
      {events && <EventFeed events={events} picked={picked} t={t} onJump={(time) => { setPlaying(false); setT(time); }} />}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { chip } from "../ui/chipstyle";
import { readableOnDark } from "../../lib/color";
import { pointAt } from "../../lib/trackmap";
import { deltaAt, fractionAtMs, lapClock, nearestFraction, readingAt, sectorAt, sectorTimes, trackColours, type Channel } from "../../lib/telemetry";
import type { DriverRace, TelemetryDoc } from "../../types/api";
import { Gauge } from "./gauge";
import { useZoomPan } from "./usezoompan";
import { ZoomControls } from "./zoomsvg";

const CHANNELS: { id: Channel; label: string; name: string; unit: string }[] = [
  { id: "speed", label: "SPD", name: "Speed", unit: "km/h" },
  { id: "throttle", label: "THR", name: "Throttle", unit: "%" },
  { id: "brake", label: "BRK", name: "Brake", unit: "" },
  { id: "rpm", label: "RPM", name: "Engine speed", unit: "rpm" },
  { id: "gear", label: "GEAR", name: "Gear", unit: "" },
];
const RATES = [0.25, 1, 4];
const SECTOR_COLOURS = ["#ef4444", "#facc15", "#34d399"];

type Props = { doc: TelemetryDoc; drivers: DriverRace[]; outline: number[][] };

/** Every driver's fastest lap on the circuit: zoom in, point at any spot on the track or the trace, or run the lap, and
 *  read what the car was doing there — speed, throttle, brake, gear, RPM, DRS — and how it compared with a rival. */
export function TelemetryLab({ doc, drivers, outline }: Props) {
  const ranked = [...doc.drivers].sort((a, b) => a.time_s - b.time_s);
  const [code, setCode] = useState(ranked[0].code);
  const [rival, setRival] = useState<string>("");
  const [channel, setChannel] = useState<Channel>("speed");
  const [frac, setFrac] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [follow, setFollow] = useState(false);
  const svg = useRef<SVGSVGElement>(null);

  const d = ranked.find((x) => x.code === code) ?? ranked[0];
  const other = ranked.find((x) => x.code === rival && x.code !== d.code) ?? null;
  const now = readingAt(d, frac);
  const mine = pointAt(outline, frac);
  const view = useZoomPan(svg, follow ? mine : null);
  const meta = (c: string) => drivers.find((x) => x.driver_code === c);
  const colour = (c: string) => readableOnDark(`#${(meta(c)?.team_color ?? "888888").replace("#", "")}`);
  const sectors = doc.sectors;
  const colours = trackColours(d, channel, sectors);
  const index = (i: number) => Math.min(d.speed.length - 1, Math.floor((i / outline.length) * d.speed.length));
  const k = 1 / view.zoom;
  const road = 22 / view.zoom ** 0.55;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last: number | null = null;
    let ms = readingAt(d, frac).ms;
    const tick = (t: number) => {
      ms += last === null ? 0 : (t - last) * rate;
      last = t;
      if (ms >= d.time_s * 1000) ms = 0; // run the lap on a loop
      setFrac(fractionAtMs(d, ms));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, rate, d]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (c: string) => {
    setCode(c);
    if (c === rival) setRival("");
  };
  const scrubTo = (f: number) => {
    setPlaying(false);
    setFrac(f);
  };
  const fromPointer = (clientX: number, clientY: number, strict: boolean) => {
    const p = view.toDrawing(clientX, clientY);
    if (!p) return;
    const hit = nearestFraction(outline, p[0], p[1]);
    if (!strict || hit.dist < 70 / view.zoom ** 0.8) scrubTo(hit.frac);
  };
  const goToSector = (s: number) => {
    if (!sectors) return;
    const from = s === 0 ? 0 : sectors[s - 1];
    const to = s === 2 ? 1 : sectors[s];
    const [x, y] = pointAt(outline, (from + to) / 2);
    setFollow(false);
    view.focusOn(x, y);
  };

  const [sx, sy] = pointAt(outline, 0);
  const [nx, ny] = pointAt(outline, 0.01);
  const norm = Math.hypot(nx - sx, ny - sy) || 1;
  const tick = (f: number, len: number) => {
    const [ax, ay] = pointAt(outline, f);
    const [bx, by] = pointAt(outline, f + 0.004);
    const l = Math.hypot(bx - ax, by - ay) || 1;
    return { x1: ax - ((by - ay) / l) * len, y1: ay + ((bx - ax) / l) * len, x2: ax + ((by - ay) / l) * len, y2: ay - ((bx - ax) / l) * len };
  };
  const splits = sectorTimes(d, sectors);
  const sector = sectorAt(frac, sectors);
  const delta = other ? deltaAt(d, other, frac) : null;
  const cur = CHANNELS.find((c) => c.id === channel) ?? CHANNELS[0];

  // The trace: the chosen channel against distance round the lap.
  const series = (x: typeof d) => (channel === "brake" ? x.brake.map((b) => b * 100) : x[channel]);
  const values = series(d);
  const rivalValues = other ? series(other) : null;
  const all = [...values, ...(rivalValues ?? [])];
  const lo = channel === "gear" || channel === "brake" ? 0 : Math.min(...all) * 0.95;
  const hi = Math.max(...all) * 1.05 || 1;
  const W = 800;
  const H = 220;
  const px = (i: number, n: number) => (i / n) * W;
  const py = (v: number) => H - 8 - ((v - lo) / Math.max(hi - lo, 1)) * (H - 20);
  const line = (vs: number[]) => `${vs.map((v, i) => `${i ? "L" : "M"}${px(i, vs.length).toFixed(1)},${py(v).toFixed(1)}`).join(" ")}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Channel" className="flex gap-1">
          {CHANNELS.map((c) => <button key={c.id} type="button" aria-pressed={channel === c.id} onClick={() => setChannel(c.id)} className={`${chip(channel === c.id)} !px-2.5`}>{c.label}</button>)}
        </div>
        <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">
          Compare with
          <select value={rival} onChange={(e) => setRival(e.target.value)} className="rounded-sm border border-white/15 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">
            <option value="">No one</option>
            {ranked.filter((x) => x.code !== d.code).map((x) => <option key={x.code} value={x.code}>{x.code}</option>)}
          </select>
        </label>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">{d.code} fastest lap · lap {d.lap} · {lapClock(d.time_s * 1000)}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <div className="glass relative h-[58svh] min-h-[340px] p-2 lg:h-[30rem]">
            <svg
              ref={svg}
              {...view.svgProps}
              role="img"
              aria-label={`${d.code} fastest lap on the track map, coloured by ${cur.name.toLowerCase()}. Point at the track to read the car at that spot.`}
              className="block h-full w-full"
              onPointerMove={(e) => { view.svgProps.onPointerMove(e); if (e.pointerType === "mouse" && e.buttons === 0 && !playing) fromPointer(e.clientX, e.clientY, true); }}
              onClick={(e) => { if (!view.wasDrag()) fromPointer(e.clientX, e.clientY, false); }}
            >
              <path d={`${outline.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ")} Z`} fill="none" stroke="#18181b" strokeWidth={road + 6 * k} strokeLinejoin="round" />
              {outline.map((p, i) => {
                const q = outline[(i + 1) % outline.length];
                return <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={colours[index(i)]} strokeWidth={road} strokeLinecap="round" />;
              })}
              {sectors?.map((f, i) => { const t = tick(f, road * 0.9); return <line key={i} {...t} stroke="#fff" strokeWidth={3 * k} strokeDasharray={`${6 * k} ${4 * k}`} />; })}
              {(() => { const t = tick(0, road * 0.9); return <line {...t} stroke="#fff" strokeWidth={4 * k} />; })()}
              <text x={sx - ((ny - sy) / norm) * (road + 26 * k)} y={sy + ((nx - sx) / norm) * (road + 26 * k)} fontSize={12 * k} fontWeight="700" fill="#fff" textAnchor="middle" stroke="#050505" strokeWidth={3 * k} paintOrder="stroke">S/F</text>
              {other && (() => { const [x, y] = pointAt(outline, fractionAtMs(other, now.ms)); return <g><circle cx={x} cy={y} r={6 * k} fill={colour(other.code)} stroke="#fff" strokeWidth={1.2 * k} opacity="0.9" /><text x={x + 10 * k} y={y - 8 * k} fontSize={12 * k} fontWeight="800" fill="#fff" stroke="#050505" strokeWidth={3 * k} paintOrder="stroke">{other.code}</text></g>; })()}
              <circle cx={mine[0]} cy={mine[1]} r={7 * k} fill={colour(d.code)} stroke="#fff" strokeWidth={1.5 * k} />
              <text x={mine[0] + 11 * k} y={mine[1] + 4 * k} fontSize={13 * k} fontWeight="700" fill="#fff" stroke="#050505" strokeWidth={3 * k} paintOrder="stroke">{d.code}</text>
            </svg>
            <ZoomControls zoom={view.zoom} onIn={view.zoomIn} onOut={view.zoomOut} onReset={() => { setFollow(false); view.reset(); }} />
            <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5">
              {sectors && [0, 1, 2].map((s) => (
                <button key={s} type="button" onClick={() => goToSector(s)} className="border px-2.5 py-1 font-mono text-[10px] font-bold tracking-widest backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600" style={{ borderColor: `${SECTOR_COLOURS[s]}${sector === s ? "ff" : "55"}`, color: SECTOR_COLOURS[s], backgroundColor: sector === s ? `${SECTOR_COLOURS[s]}26` : "#00000099" }}><span aria-hidden="true">S{s + 1}</span><span className="sr-only">Zoom to sector {s + 1}</span></button>
              ))}
              <button type="button" aria-pressed={follow} onClick={() => { if (!follow) view.ensureZoom(3.5); setFollow((f) => !f); }} className={`${chip(follow)} !px-2.5 !py-1`}>FOLLOW CAR</button>
            </div>
          </div>
          <p className="px-1 text-[11px] leading-snug text-zinc-500">Readings are from each driver’s fastest lap of the race, not a live feed. Scroll, pinch or use + / − to zoom; drag to move; point at the track or the trace to read the car at that spot.</p>

          <div className="glass p-3">
            <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">
              <span>{d.code} {cur.name} trace{other ? ` vs ${other.code}` : ""}</span>
              <span className="flex items-center gap-3 normal-case tracking-normal text-zinc-500">{rivalValues && <><i aria-hidden="true" className="inline-block h-0.5 w-4" style={{ backgroundColor: colour(d.code) }} />{d.code}<i aria-hidden="true" className="inline-block h-0.5 w-4" style={{ backgroundColor: colour(other!.code) }} />{other!.code}</>}</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} role="slider" tabIndex={0} aria-label={`${cur.name} round the lap: move the cursor along the lap`} aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(frac * 100)} aria-valuetext={`${Math.round(frac * 100)}% round the lap, ${Math.round(now.speed)} kilometres per hour, gear ${now.gear || "neutral"}`} className="block w-full cursor-crosshair touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
              onKeyDown={(e) => {
                const step = e.shiftKey ? 0.1 : 0.01;
                const next = e.key === "ArrowRight" || e.key === "ArrowUp" ? frac + step : e.key === "ArrowLeft" || e.key === "ArrowDown" ? frac - step : e.key === "Home" ? 0 : e.key === "End" ? 0.999 : null;
                if (next === null) return;
                e.preventDefault();
                scrubTo(Math.min(0.999, Math.max(0, next)));
              }}
              onPointerDown={(e) => { (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId); const r = e.currentTarget.getBoundingClientRect(); scrubTo((e.clientX - r.left) / r.width); }}
              onPointerMove={(e) => { if (e.buttons === 0 && e.pointerType !== "mouse") return; const r = e.currentTarget.getBoundingClientRect(); if (e.pointerType === "mouse" && e.buttons === 0 && playing) return; scrubTo(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))); }}>
              {sectors && [[0, sectors[0]], [sectors[0], sectors[1]], [sectors[1], 1]].map(([a, b], i) => <rect key={i} x={a * W} width={(b - a) * W} y="0" height={H} fill={SECTOR_COLOURS[i]} opacity="0.06" />)}
              {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2={W} y1={H - 8 - g * (H - 20)} y2={H - 8 - g * (H - 20)} stroke="#27272a" />)}
              {rivalValues && <path d={line(rivalValues)} fill="none" stroke={colour(other!.code)} strokeWidth="2" opacity="0.8" strokeLinejoin="round" />}
              <path d={line(values)} fill="none" stroke={colour(d.code)} strokeWidth="2.5" strokeLinejoin="round" />
              <line x1={frac * W} x2={frac * W} y1="0" y2={H} stroke="#fff" strokeWidth="1.5" />
              <circle cx={frac * W} cy={py(channel === "brake" ? (now.brake ? 100 : 0) : channel === "gear" ? now.gear : now[channel])} r="5" fill={colour(d.code)} stroke="#fff" strokeWidth="2" />
              <text x="6" y="14" fontSize="11" fill="#71717a">{Math.round(hi)}{cur.unit && ` ${cur.unit}`}</text>
            </svg>
          </div>
        </div>

        <div className="space-y-4">
          <ol aria-label="Fastest laps" className="glass max-h-[17rem] overflow-auto">
            {ranked.map((x, i) => (
              <li key={x.code}>
                <button type="button" aria-pressed={x.code === d.code} onClick={() => choose(x.code)} className="grid w-full grid-cols-[1.5rem_0.75rem_1fr_auto] items-center gap-2 border-t border-white/[0.06] px-3 py-1.5 text-left first:border-t-0 hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red-600" style={x.code === d.code ? { backgroundColor: "rgba(255,255,255,0.1)" } : undefined}>
                  <span className="font-serif text-base text-zinc-400">{i + 1}</span>
                  <span aria-hidden="true" className="h-4 w-1" style={{ backgroundColor: colour(x.code) }} />
                  <span className="font-mono text-xs font-bold text-white">{x.code}</span>
                  <span className="font-mono text-xs text-zinc-300">{i === 0 ? lapClock(x.time_s * 1000) : `+${(x.time_s - ranked[0].time_s).toFixed(3)}`}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="glass space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Telemetry · {d.code}</h3>
              <div className="flex gap-1">
                <button type="button" aria-pressed={playing} onClick={() => setPlaying((p) => !p)} className={`${chip(playing)} !px-2.5 !py-1`}>{playing ? "PAUSE" : "RUN LAP"}</button>
                {RATES.map((r) => <button key={r} type="button" aria-pressed={rate === r} onClick={() => setRate(r)} className={`${chip(rate === r)} !px-2 !py-1`}><span aria-hidden="true">{r}×</span><span className="sr-only">{r} times speed</span></button>)}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-4">
              <Gauge speed={now.speed} />
              <dl className="space-y-3 text-right font-mono">
                <div><dt className="text-[9px] uppercase tracking-[0.25em] text-zinc-500">Lap timer</dt><dd className="text-2xl font-bold text-white tabular-nums">{lapClock(now.ms)}</dd></div>
                {[0, 1, 2].map((s) => (
                  <div key={s}><dt className="text-[9px] uppercase tracking-[0.25em]" style={{ color: SECTOR_COLOURS[s] }}>Sector {s + 1}</dt><dd className="text-sm tabular-nums text-zinc-200">{splits[s] !== null && (s < sector || (s === 2 && frac >= 0.999)) ? splits[s]!.toFixed(3) : "– –"}</dd></div>
                ))}
              </dl>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="border border-white/10 py-2"><div className="text-[9px] uppercase tracking-[0.25em] text-zinc-500">Gear</div><div className="text-2xl font-bold text-white">{now.gear || "N"}</div></div>
              <div className="border border-white/10 py-2"><div className="text-[9px] uppercase tracking-[0.25em] text-zinc-500">RPM</div><div className="text-2xl font-bold tabular-nums text-white">{Math.round(now.rpm / 100) * 100}</div></div>
              <div className={`border py-2 ${now.drs ? "border-emerald-400 text-emerald-300" : "border-white/10 text-zinc-500"}`}><div className="text-[9px] uppercase tracking-[0.25em]">DRS</div><div className="text-2xl font-bold">{now.drs ? "OPEN" : "—"}</div></div>
            </div>
            <div className="space-y-2 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">
              <Bar label="Throttle" value={now.throttle} colour="#22c55e" />
              <Bar label="Brake" value={now.brake ? 100 : 0} colour="#ef4444" />
            </div>
            {other && delta !== null && (
              <p className="border-t border-white/10 pt-3 font-mono text-xs text-zinc-300">
                vs {other.code} here: <span className={delta > 0 ? "text-red-400" : "text-emerald-400"}>{delta > 0 ? "+" : ""}{delta.toFixed(3)}s</span>
                <span className="text-zinc-500"> · {readingAt(other, frac).speed.toFixed(0)} km/h vs {now.speed.toFixed(0)}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, colour }: { label: string; value: number; colour: string }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-2">
      <span>{label}</span>
      <span className="h-2 bg-white/10" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><span className="block h-full" style={{ width: `${value}%`, backgroundColor: colour }} /></span>
      <span className="text-right tabular-nums text-zinc-200">{Math.round(value)}%</span>
    </div>
  );
}

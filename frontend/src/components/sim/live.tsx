import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { chip } from "../ui/chipstyle";
import { advise, type Advice } from "../../lib/sim/advisor";
import type { Race } from "../../lib/sim/race";
import { DRY, type Compound, type ModeKey, type SimCircuit, type SimModel } from "../../lib/sim/types";
import { Tyre } from "./bits";
import { NAMES, fmtGap, fmtRace, fmtTime } from "./format";
import { ChequeredStrip, Confetti } from "./fx";
import { AdvisorCard, ControlCard, RestartPanel } from "./pitwall";
import { SampleRace } from "./results";

const SPEEDS = [
  { label: "1×", ms: 1100 },
  { label: "3×", ms: 400 },
  { label: "10×", ms: 110 },
];
const TYRES: Compound[] = ["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"];

/** Drive the race yourself: the order, the tyres, the weather and the safety car, one lap at a time. */
export function LiveRace({ model, circuit, race, onExit, onAgain }: { model: SimModel; circuit: SimCircuit; race: Race; onExit: () => void; onAgain: () => void }) {
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [pit, setPit] = useState<Compound | null>(null);
  const [mode, setMode] = useState<ModeKey>("standard");
  const [announce, setAnnounce] = useState("");
  const [toast, setToast] = useState("");
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [thinking, setThinking] = useState(false);
  const [auto, setAuto] = useState(true);
  const [pauseOn, setPauseOn] = useState(true);
  const [scLaps, setScLaps] = useState(3);
  const [restartTyre, setRestartTyre] = useState<Compound | null>(null);
  const [queue, setQueue] = useState<{ inLaps: number; lap: number; tyre: Compound } | null>(null);
  const [queueForm, setQueueForm] = useState<{ inLaps: number; tyre: Compound }>({ inLaps: 3, tyre: "HARD" });
  const [calls, setCalls] = useState<{ agreed: number; total: number }>({ agreed: 0, total: 0 });
  const adviceRef = useRef<Advice | null>(null);
  const still = useReducedMotion();
  const pitRef = useRef<Compound | null>(null);
  const modeRef = useRef<ModeKey>("standard");
  const queueRef = useRef(queue);
  const pauseRef = useRef(pauseOn);
  useEffect(() => {
    pitRef.current = pit;
    modeRef.current = mode;
    adviceRef.current = advice;
    queueRef.current = queue;
    pauseRef.current = pauseOn;
  }, [pit, mode, advice, queue, pauseOn]);

  const note = useCallback((events: { text: string }[]) => {
    if (!events.length) return;
    setAnnounce(events.map((e) => e.text).join(". "));
    setToast(events[events.length - 1].text);
  }, []);

  const advance = useCallback(() => {
    if (race.finished || race.suspended) return;
    // a queued stop fires when its lap comes up
    let call = pitRef.current;
    const q = queueRef.current;
    if (!call && q && race.lap + 1 >= q.lap) {
      call = q.tyre;
      setQueue(null);
    }
    // did the player do what the pit wall advised for this lap?
    const a = adviceRef.current;
    if (a && a.lap === race.lap) {
      const advised = a.best.action.pit;
      const calledIt = advised !== null || call !== null;
      if (calledIt) setCalls((c) => ({ agreed: c.agreed + (advised === call ? 1 : 0), total: c.total + 1 }));
    }
    const out = race.step({ pit: call, mode: modeRef.current });
    setPit(null);
    note(out.events);
    if (pauseRef.current && out.events.some((e) => ["sc", "vsc", "red", "rain", "dry"].includes(e.kind))) setPlaying(false);
    if (race.suspended) setPlaying(false);
    redraw();
  }, [race, note]);

  const ask = useCallback(() => {
    if (race.finished) return;
    setThinking(true);
    const id = window.setTimeout(() => {
      setAdvice(advise(race, 28));
      setThinking(false);
    }, 20);
    return () => window.clearTimeout(id);
  }, [race]);

  useEffect(() => {
    if (!auto || race.finished || (playing && speed > 0)) return;
    return ask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race.lap, race.suspended, auto, playing, speed]);

  const restart = () => {
    const out = race.restart(restartTyre);
    note(out);
    setRestartTyre(null);
    redraw();
  };
  const control = (fn: () => { text: string }[]) => {
    const out = fn();
    note(out);
    setPlaying(false);
    redraw();
  };

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!playing || race.finished) return;
    const id = window.setTimeout(advance, SPEEDS[speed].ms);
    return () => window.clearTimeout(id);
  }, [playing, speed, advance, race, race.lap]);

  const me = race.player();
  const total = circuit.laps;
  const rows = race.standings();
  const mine = rows.findIndex((r) => r.player);
  const flag = race.finished ? "green" : race.flagAt(race.lap + 1);
  const wet = race.wetnessNow();
  const dry = me ? DRY.filter((d) => me.used.has(d)) : [];
  const wetUsed = me ? [...me.used].some((c) => c === "INTERMEDIATE" || c === "WET") : false;
  const maxAge = me && (DRY as string[]).includes(me.compound) ? circuit.max_age[me.compound as "SOFT"] : null;
  const wear = maxAge && me ? me.age / maxAge : 0;
  const rain = race.cfg.weather.kind === "rain" ? race.cfg.weather : null;
  const rainSoon = rain && rain.start > race.lap && rain.start - race.lap <= 5;
  const results = race.finished ? race.results() : null;
  const myResult = results?.find((r) => r.player) ?? null;

  const podium = !!myResult && !myResult.dnf && !myResult.dsq && myResult.position <= 3;

  return (
    <div className="relative space-y-6 overflow-hidden">
      {wet > 0.12 && !race.finished && !still && <div aria-hidden="true" className="sim-rain pointer-events-none absolute inset-0 z-20" style={{ opacity: Math.min(0.32, wet * 0.5) }} />}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center">
        <AnimatePresence>
          {toast && (
            <motion.p key={toast} initial={still ? false : { opacity: 0, y: -14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={still ? undefined : { opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="rounded-sm border border-white/25 bg-black/85 px-4 py-2 font-mono text-xs uppercase tracking-[0.25em] text-white backdrop-blur">
              {toast}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-serif text-4xl leading-none text-white" aria-label={`Lap ${race.lap} of ${total}`}>
          {Math.min(race.lap + (race.finished ? 0 : 1), total)}<span className="text-xl text-zinc-400">/{total}</span>
        </p>
        <span className={`rounded-sm border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.25em] ${flag === "sc" ? "border-amber-400 bg-amber-400/15 text-amber-300" : flag === "vsc" ? "border-yellow-300/70 text-yellow-200" : "border-emerald-400/60 text-emerald-300"} ${race.suspended ? "!border-red-500 !bg-red-500/15 !text-red-300" : ""}`}>
          {race.finished ? "Finished" : race.suspended ? "Red flag" : flag === "sc" ? "Safety car" : flag === "vsc" ? "Virtual SC" : "Green"}
        </span>
        <span className="rounded-sm border border-white/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-200">
          {wet < 0.08 ? "Dry" : wet < 0.35 ? "Damp" : wet < 0.7 ? "Wet" : "Very wet"}
        </span>
        {rainSoon && !race.finished && <span className="rounded-sm border border-blue-400/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-blue-300">Rain on the radar</span>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!race.finished && (
            <>
              <button type="button" disabled={race.suspended} onClick={() => setPlaying((p) => !p)} className={`${chip(playing)} disabled:opacity-40`}>{playing ? "Pause" : "Play"}</button>
              <button type="button" disabled={race.suspended} onClick={() => { setPlaying(false); advance(); }} className={`${chip(false)} disabled:opacity-40`}>Next lap</button>
              <div role="group" aria-label="Speed" className="flex gap-1">
                {SPEEDS.map((s, i) => <button key={s.label} type="button" aria-pressed={speed === i} onClick={() => setSpeed(i)} className={`${chip(speed === i)} !px-2.5`}>{s.label}</button>)}
              </div>
            </>
          )}
          <button type="button" onClick={onExit} className={chip(false)}>Leave</button>
        </div>
        {!race.finished && (
          <label className="flex w-full items-center gap-2 text-xs text-zinc-300">
            <input type="checkbox" className="h-4 w-4 accent-red-500" checked={pauseOn} onChange={(e) => setPauseOn(e.target.checked)} />
            Pause when something happens: a safety car, a red flag, rain arriving or leaving
          </label>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>

      <AnimatePresence initial={false}>
        {!race.finished && flag !== "green" && (
          <motion.div
            key={flag}
            initial={still ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={still ? undefined : { opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={`sim-pulse border px-4 py-3 font-mono text-xs uppercase tracking-[0.3em] ${flag === "sc" ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-yellow-300/60 bg-yellow-300/10 text-yellow-100"}`}>
              {flag === "sc" ? "Safety car · the field bunches up, a pit stop costs about half as much" : "Virtual safety car · hold your delta"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {results && myResult && (
        <section aria-label="Result" className="glass relative space-y-4 overflow-hidden border-l-2 border-red-500 p-5">
          <ChequeredStrip />
          {podium && <Confetti />}
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-red-400">Chequered flag</p>
          <motion.p initial={still ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="origin-left font-serif text-3xl text-white sm:text-5xl">{myResult.dnf ? "Retired" : myResult.dsq ? "Disqualified" : `P${myResult.position}`}</motion.p>
          <p className="text-zinc-300">
            {myResult.dnf ? `Out on lap ${myResult.dnf}. It happens: retirements are random in this model.` : myResult.dsq ? "A dry race needs two different dry compounds." : `${myResult.gap === 0 ? "You won" : fmtGap(myResult.gap) + " behind the winner"} · ${myResult.stops} ${myResult.stops === 1 ? "stop" : "stops"} · ${fmtRace(myResult.total)}`}
          </p>
          {calls.total > 0 && <p className="text-sm text-zinc-300">You made the same call as the pit wall on {calls.agreed} of the {calls.total} laps where it had a view.</p>}
          {!myResult.dnf && <SampleRace result={myResult} total={total} />}
          <div className="flex gap-2">
            <button type="button" onClick={onAgain} className={chip(true)}>Race again</button>
            <button type="button" onClick={onExit} className={chip(false)}>Back to setup</button>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[26rem] border-collapse text-left text-sm">
            <caption className="sr-only">Running order</caption>
            <thead><tr className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">
              <th scope="col" className="py-2 pr-2 font-normal">Pos</th>
              <th scope="col" className="py-2 pr-2 font-normal">Driver</th>
              <th scope="col" className="py-2 pr-2 font-normal">Tyre</th>
              <th scope="col" className="py-2 pr-2 text-right font-normal">Interval</th>
              <th scope="col" className="py-2 pr-2 text-right font-normal">Gap</th>
              <th scope="col" className="py-2 text-right font-normal">Last lap</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <motion.tr key={r.code} layout={!still} transition={{ type: "spring", stiffness: 420, damping: 40 }} className={`border-t border-white/10 ${r.player ? "bg-white/[0.08]" : ""} ${r.out ? "opacity-50" : ""}`} aria-current={r.player ? "true" : undefined}>
                  <td className="py-1.5 pr-2 font-mono tabular-nums text-zinc-200">{i + 1}{!r.out && r.change !== 0 && <span className={`ml-1 text-[10px] ${r.change > 0 ? "text-emerald-400" : "text-red-400"}`} aria-label={`${r.change > 0 ? "up" : "down"} ${Math.abs(r.change)}`}>{r.change > 0 ? "▲" : "▼"}{Math.abs(r.change)}</span>}</td>
                  <td className="py-1.5 pr-2 text-white"><span aria-hidden="true" className="mr-2 inline-block h-3.5 w-1 rounded-full align-middle" style={{ backgroundColor: r.color ?? "#888" }} />{r.code}{r.player && <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-red-400">you</span>}</td>
                  <td className="py-1.5 pr-2">
                    {r.out ? <span className="font-mono text-xs text-zinc-400">OUT</span> : <span className="inline-flex items-center gap-1.5"><Tyre compound={r.compound} size={18} /><span className="sr-only">{NAMES[r.compound]}, </span><span className="font-mono text-xs tabular-nums text-zinc-300">{r.age}</span></span>}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono text-xs tabular-nums text-zinc-300">{i === 0 || r.out ? "" : fmtGap(r.interval)}</td>
                  <td className="py-1.5 pr-2 text-right font-mono text-xs tabular-nums text-zinc-300">{i === 0 || r.out ? "" : fmtGap(r.gap)}</td>
                  <td className="py-1.5 text-right font-mono text-xs tabular-nums text-zinc-300">{r.lastLap && !r.out ? fmtTime(r.lastLap) : ""}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="min-w-0 space-y-5">
          {race.suspended && me && !race.finished && <RestartPanel choice={restartTyre} onChoice={setRestartTyre} onRestart={restart} current={me.compound} />}
          {me && !race.finished && (
            <AdvisorCard advice={advice} thinking={thinking} onAsk={ask} auto={auto} onAuto={setAuto} suspended={race.suspended} onDo={(c) => (race.suspended ? setRestartTyre(c) : setPit(c))} />
          )}
          {me && !race.finished && mine >= 0 && (
            <section aria-label="Your car" className="glass space-y-4 p-5">
              <div className="flex items-end justify-between">
                <motion.p key={mine} initial={still ? false : { y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3 }} className="font-serif text-6xl leading-none text-white">P{mine + 1}</motion.p>
                <p className="text-right text-sm text-zinc-300">{me.spec.name}<br /><span className="text-xs text-zinc-400">{me.pits.length} {me.pits.length === 1 ? "stop" : "stops"} so far</span></p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-white"><Tyre compound={me.compound} size={26} /> {NAMES[me.compound]}, {Math.round(me.age)} laps old</div>
                {maxAge && (
                  <>
                    <div className="mt-2 h-2 w-full bg-white/10" role="img" aria-label={`Tyre life used: ${Math.round(wear * 100)}% of the longest run seen at this circuit`}>
                      <div className={`h-full transition-[width] duration-500 ${wear > 1 ? "bg-red-500" : wear > 0.75 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${Math.min(100, wear * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">{wear > 1 ? "Past anything seen here: the tyre is falling away." : `Longest run seen at ${circuit.location} on this tyre: ${maxAge} laps.`}</p>
                  </>
                )}
              </div>
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Engine mode</p>
                <div role="group" aria-label="Engine mode" className="flex gap-2">
                  {(Object.keys(model.modes_assumed) as ModeKey[]).map((k) => <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)} className={`${chip(mode === k)} !px-3`}>{model.modes_assumed[k].label}</button>)}
                </div>
              </div>
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Box at the end of this lap for</p>
                <div role="group" aria-label="Pit stop" className="flex flex-wrap gap-2">
                  {TYRES.map((c) => (
                    <button key={c} type="button" aria-pressed={pit === c} aria-label={`Box for ${NAMES[c]}`} title={NAMES[c]} onClick={() => setPit(pit === c ? null : c)} className={`grid h-11 w-11 place-items-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${pit === c ? "border-white bg-white/15" : "border-white/15 hover:bg-white/10"}`}>
                      <Tyre compound={c} size={28} />
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-zinc-400">{pit ? `Boxing for ${NAMES[pit].toLowerCase()}s. Tap again to cancel.` : flag !== "green" ? "A stop under the safety car costs about half as much." : "Pick a tyre to pit at the end of this lap."}</p>
              </div>
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Or plan a stop</p>
                {queue ? (
                  <p className="flex items-center gap-3 text-sm text-zinc-200"><Tyre compound={queue.tyre} size={20} /> Box for {NAMES[queue.tyre].toLowerCase()}s at lap {queue.lap}<button type="button" onClick={() => setQueue(null)} className="font-mono text-[10px] uppercase tracking-widest text-zinc-300 underline-offset-4 hover:text-white hover:underline">Cancel</button></p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-300">
                    Box in
                    <label className="sr-only" htmlFor="q-laps">Laps until the stop</label>
                    <input id="q-laps" type="number" min={1} max={30} value={queueForm.inLaps} onChange={(e) => setQueueForm({ ...queueForm, inLaps: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })} className="w-14 rounded-sm border border-white/15 bg-black/40 px-2 py-1.5 text-center font-mono text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600" />
                    laps for
                    <label className="sr-only" htmlFor="q-tyre">Tyre for the stop</label>
                    <select id="q-tyre" value={queueForm.tyre} onChange={(e) => setQueueForm({ ...queueForm, tyre: e.target.value as Compound })} className="rounded-sm border border-white/15 bg-black/40 px-2 py-1.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">
                      {TYRES.map((c) => <option key={c} value={c}>{NAMES[c]}</option>)}
                    </select>
                    <button type="button" onClick={() => setQueue({ ...queueForm, lap: Math.min(total - 1, race.lap + queueForm.inLaps) })} className={`${chip(false)} !px-3 !py-1.5`}>Schedule</button>
                  </div>
                )}
              </div>
              {!wetUsed && dry.length < 2 && <p className="text-xs text-amber-300">You have only used one dry compound. You need a second before the flag, unless you switch to wet tyres.</p>}
            </section>
          )}
          {!race.finished && <ControlCard disabled={race.suspended || race.lap < 1} scLaps={scLaps} onScLaps={setScLaps} onSc={() => control(() => race.deploy("sc", scLaps))} onVsc={() => control(() => race.deploy("vsc", 2))} onRed={() => control(() => race.callRedFlag())} />}
          <section aria-label="Race log" className="glass p-5">
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Race log</h3>
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-zinc-200">
              {race.feed.length === 0 && <li className="text-zinc-400">Lights out when you press play.</li>}
              {[...race.feed].reverse().map((e, i) => <li key={i}><span className="font-mono text-xs text-zinc-400">L{e.lap}</span> {e.text}</li>)}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

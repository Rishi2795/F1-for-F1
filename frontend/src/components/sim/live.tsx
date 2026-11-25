import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { chip } from "../ui/chipstyle";
import type { Race } from "../../lib/sim/race";
import { DRY, type Compound, type ModeKey, type SimCircuit, type SimModel } from "../../lib/sim/types";
import { Tyre } from "./bits";
import { NAMES, fmtGap, fmtRace, fmtTime } from "./format";
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
  const pitRef = useRef<Compound | null>(null);
  const modeRef = useRef<ModeKey>("standard");
  useEffect(() => {
    pitRef.current = pit;
    modeRef.current = mode;
  }, [pit, mode]);

  const advance = useCallback(() => {
    if (race.finished) return;
    const out = race.step({ pit: pitRef.current, mode: modeRef.current });
    setPit(null);
    if (out.events.length) setAnnounce(out.events.map((e) => e.text).join(". "));
    redraw();
  }, [race]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-serif text-4xl leading-none text-white" aria-label={`Lap ${race.lap} of ${total}`}>
          {Math.min(race.lap + (race.finished ? 0 : 1), total)}<span className="text-xl text-zinc-400">/{total}</span>
        </p>
        <span className={`rounded-sm border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.25em] ${flag === "sc" ? "border-amber-400 bg-amber-400/15 text-amber-300" : flag === "vsc" ? "border-yellow-300/70 text-yellow-200" : "border-emerald-400/60 text-emerald-300"}`}>
          {race.finished ? "Finished" : flag === "sc" ? "Safety car" : flag === "vsc" ? "Virtual SC" : "Green"}
        </span>
        <span className="rounded-sm border border-white/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-200">
          {wet < 0.08 ? "Dry" : wet < 0.35 ? "Damp" : wet < 0.7 ? "Wet" : "Very wet"}
        </span>
        {rainSoon && !race.finished && <span className="rounded-sm border border-blue-400/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-blue-300">Rain on the radar</span>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!race.finished && (
            <>
              <button type="button" onClick={() => setPlaying((p) => !p)} className={chip(playing)}>{playing ? "Pause" : "Play"}</button>
              <button type="button" onClick={() => { setPlaying(false); advance(); }} className={chip(false)}>Next lap</button>
              <div role="group" aria-label="Speed" className="flex gap-1">
                {SPEEDS.map((s, i) => <button key={s.label} type="button" aria-pressed={speed === i} onClick={() => setSpeed(i)} className={`${chip(speed === i)} !px-2.5`}>{s.label}</button>)}
              </div>
            </>
          )}
          <button type="button" onClick={onExit} className={chip(false)}>Leave</button>
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>

      {results && myResult && (
        <section aria-label="Result" className="glass space-y-4 border-l-2 border-red-500 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-red-400">Chequered flag</p>
          <p className="font-serif text-3xl text-white sm:text-5xl">{myResult.dnf ? "Retired" : myResult.dsq ? "Disqualified" : `P${myResult.position}`}</p>
          <p className="text-zinc-300">
            {myResult.dnf ? `Out on lap ${myResult.dnf}. It happens: retirements are random in this model.` : myResult.dsq ? "A dry race needs two different dry compounds." : `${myResult.gap === 0 ? "You won" : fmtGap(myResult.gap) + " behind the winner"} · ${myResult.stops} ${myResult.stops === 1 ? "stop" : "stops"} · ${fmtRace(myResult.total)}`}
          </p>
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
                <tr key={r.code} className={`border-t border-white/10 ${r.player ? "bg-white/[0.08]" : ""} ${r.out ? "opacity-50" : ""}`} aria-current={r.player ? "true" : undefined}>
                  <td className="py-1.5 pr-2 font-mono tabular-nums text-zinc-200">{i + 1}</td>
                  <td className="py-1.5 pr-2 text-white"><span aria-hidden="true" className="mr-2 inline-block h-3.5 w-1 rounded-full align-middle" style={{ backgroundColor: r.color ?? "#888" }} />{r.code}{r.player && <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-red-400">you</span>}</td>
                  <td className="py-1.5 pr-2">
                    {r.out ? <span className="font-mono text-xs text-zinc-400">OUT</span> : <span className="inline-flex items-center gap-1.5"><Tyre compound={r.compound} size={18} /><span className="sr-only">{NAMES[r.compound]}, </span><span className="font-mono text-xs tabular-nums text-zinc-300">{r.age}</span></span>}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono text-xs tabular-nums text-zinc-300">{i === 0 || r.out ? "" : fmtGap(r.interval)}</td>
                  <td className="py-1.5 pr-2 text-right font-mono text-xs tabular-nums text-zinc-300">{i === 0 || r.out ? "" : fmtGap(r.gap)}</td>
                  <td className="py-1.5 text-right font-mono text-xs tabular-nums text-zinc-300">{r.lastLap && !r.out ? fmtTime(r.lastLap) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="min-w-0 space-y-5">
          {me && !race.finished && mine >= 0 && (
            <section aria-label="Your car" className="glass space-y-4 p-5">
              <div className="flex items-end justify-between">
                <p className="font-serif text-6xl leading-none text-white">P{mine + 1}</p>
                <p className="text-right text-sm text-zinc-300">{me.spec.name}<br /><span className="text-xs text-zinc-400">{me.pits.length} {me.pits.length === 1 ? "stop" : "stops"} so far</span></p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-white"><Tyre compound={me.compound} size={26} /> {NAMES[me.compound]}, {Math.round(me.age)} laps old</div>
                {maxAge && (
                  <>
                    <div className="mt-2 h-2 w-full bg-white/10" role="img" aria-label={`Tyre life used: ${Math.round(wear * 100)}% of the longest run seen at this circuit`}>
                      <div className={`h-full ${wear > 1 ? "bg-red-500" : wear > 0.75 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${Math.min(100, wear * 100)}%` }} />
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
              {!wetUsed && dry.length < 2 && <p className="text-xs text-amber-300">You have only used one dry compound. You need a second before the flag, unless you switch to wet tyres.</p>}
            </section>
          )}
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

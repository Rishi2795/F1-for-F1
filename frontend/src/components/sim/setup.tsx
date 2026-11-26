import { chip } from "../ui/chipstyle";
import type { Allocation, PlayerRules, SimCircuit, SimModel, UserEvent } from "../../lib/sim/types";
import { Field, Slider } from "./bits";
import { Reveal } from "./fx";
import { control, pct0 } from "./format";

export type WeatherKind = "dry" | "rain" | "drying" | "circuit";

export type Setup = {
  slug: string;
  code: string;
  trim: number;
  slot: number | null;
  weather: WeatherKind;
  rainStart: number;
  rainPeak: number;
  rainLength: number;
  trackTemp: number;
  scProb: number;
  /** random events from the circuit's history, or only the ones scheduled below */
  eventMode: "random" | "mine";
  events: UserEvent[];
  rules: PlayerRules;
  alloc: Allocation;
};

const WEATHER: { key: WeatherKind; label: string; note: string }[] = [
  { key: "dry", label: "Dry", note: "No rain all race." },
  { key: "rain", label: "Rain", note: "The track gets wet at the lap you choose." },
  { key: "drying", label: "Drying", note: "A wet track at the start that dries out." },
  { key: "circuit", label: "Circuit odds", note: "Rain is drawn from how often this circuit has seen it." },
];

/** Where, who, and in what conditions. */
export function SetupPanel({ model, circuit, value, onChange }: { model: SimModel; circuit: SimCircuit; value: Setup; onChange: (next: Setup) => void }) {
  const set = (patch: Partial<Setup>) => onChange({ ...value, ...patch });
  const drivers = model.drivers.filter((d) => d.races >= 8);
  const teams = model.teams.filter((t) => drivers.some((d) => d.team === t.name));
  const me = drivers.find((d) => d.code === value.code);
  const teamPace = model.teams.find((t) => t.name === me?.team)?.offset_s ?? 0;
  const note = WEATHER.find((w) => w.key === value.weather)?.note;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Reveal delay={0} className="h-full">
      <section aria-labelledby="sim-circuit" className="glass h-full space-y-5 p-5">
        <h2 id="sim-circuit" className="font-mono text-[11px] uppercase tracking-[0.35em] text-red-400">1 · Circuit</h2>
        <Field label="Grand Prix">
          {(id) => (
            <select id={id} className={control} value={value.slug} onChange={(e) => set({ slug: e.target.value })}>
              {model.circuits.map((c) => <option key={c.slug} value={c.slug}>{c.name} · {c.location}</option>)}
            </select>
          )}
        </Field>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {[
            ["Laps", String(circuit.laps)],
            ["Typical lap", `${circuit.base_lap_s.toFixed(1)} s`],
            ["Pit-lane loss", `${circuit.pit_loss_s.toFixed(1)} s`],
            ["Safety car seen in", pct0(circuit.sc_prob)],
            ["Rain seen in", pct0(circuit.rain_prob)],
            ["Longest soft run", `${circuit.max_age.SOFT} laps`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-zinc-400">{k}</dt>
              <dd className="font-mono tabular-nums text-white">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      </Reveal>

      <Reveal delay={0.08} className="h-full">
      <section aria-labelledby="sim-car" className="glass h-full space-y-5 p-5">
        <h2 id="sim-car" className="font-mono text-[11px] uppercase tracking-[0.35em] text-red-400">2 · Driver and car</h2>
        <Field label="Driver" hint={me ? `${me.team}: ${teamPace <= 0 ? "" : "+"}${teamPace.toFixed(2)} s a lap against the field's average car` : undefined}>
          {(id) => (
            <select id={id} className={control} value={value.code} onChange={(e) => set({ code: e.target.value })}>
              {teams.map((t) => (
                <optgroup key={t.name} label={t.name}>
                  {drivers.filter((d) => d.team === t.name).map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
                </optgroup>
              ))}
            </select>
          )}
        </Field>
        <Slider
          label="Car power"
          value={value.trim}
          min={-1}
          max={1}
          step={0.05}
          onChange={(v) => set({ trim: v })}
          format={(v) => (v === 0 ? "as is" : `${v < 0 ? "" : "+"}${v.toFixed(2)} s`)}
          hint="Upgrades or a weaker package, in seconds a lap. Negative is faster."
        />
        <Field label="Start from" hint="Choose a slot to test strategies from the back or the front.">
          {(id) => (
            <select id={id} className={control} value={value.slot ?? ""} onChange={(e) => set({ slot: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Where the car qualifies</option>
              {Array.from({ length: drivers.length }, (_, i) => <option key={i} value={i + 1}>P{i + 1}</option>)}
            </select>
          )}
        </Field>
      </section>
      </Reveal>

      <Reveal delay={0.16} className="h-full">
      <section aria-labelledby="sim-cond" className="glass h-full space-y-5 p-5">
        <h2 id="sim-cond" className="font-mono text-[11px] uppercase tracking-[0.35em] text-red-400">3 · Conditions</h2>
        <div>
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">Weather</p>
          <div role="group" aria-label="Weather" className="flex flex-wrap gap-2">
            {WEATHER.map((w) => <button key={w.key} type="button" aria-pressed={value.weather === w.key} onClick={() => set({ weather: w.key })} className={`${chip(value.weather === w.key)} !px-3`}>{w.label}</button>)}
          </div>
          <p className="mt-1.5 text-xs text-zinc-400">{note}</p>
        </div>
        {value.weather === "rain" && (
          <>
            <Slider label="Rain starts" value={value.rainStart} min={2} max={Math.max(3, circuit.laps - 8)} step={1} onChange={(v) => set({ rainStart: v })} format={(v) => `lap ${v}`} />
            <Slider label="Intensity" value={value.rainPeak} min={0.25} max={1} step={0.05} onChange={(v) => set({ rainPeak: v })} format={(v) => (v < 0.45 ? "damp" : v < 0.75 ? "wet" : "storm")} />
            <Slider label="Lasts" value={value.rainLength} min={4} max={40} step={1} onChange={(v) => set({ rainLength: v })} format={(v) => `${v} laps`} />
          </>
        )}
        <Slider label="Track temperature" value={value.trackTemp} min={15} max={55} step={1} onChange={(v) => set({ trackTemp: v })} format={(v) => `${v} °C`} hint="Heat wears tyres faster." />
        <Slider
          label="Safety-car chance"
          value={value.scProb}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => set({ scProb: v })}
          format={pct0}
          hint={`${circuit.name} has had one in ${pct0(circuit.sc_prob)} of races.`}
        />
      </section>
      </Reveal>
    </div>
  );
}

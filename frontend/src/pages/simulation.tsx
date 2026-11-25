import { useEffect, useMemo, useRef, useState } from "react";
import { PageHead } from "../components/ui/pagehead";
import { ErrorState, Skeleton } from "../components/ui/states";
import { chip } from "../components/ui/chipstyle";
import { PlanBuilder } from "../components/sim/planner";
import { ResultsPanel, SampleRace, type WhatIf } from "../components/sim/results";
import { SetupPanel, type Setup } from "../components/sim/setup";
import { LiveRace } from "../components/sim/live";
import { ModelCard } from "../components/sim/modelcard";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { monteCarloAsync, runOnce, type Scenario, type Summary } from "../lib/sim/montecarlo";
import { planProblem, suggestPlans } from "../lib/sim/plan";
import type { CarResult, Race } from "../lib/sim/race";
import type { PlanStint, SimModel, Weather } from "../lib/sim/types";
import type { NextForecasts } from "../types/api";

const RUNS = 300;
const WHAT_IF_RUNS = 200;

type Outcome = { signature: string; mine: Summary; reference: Summary | null; referenceLabel: string | null; whatIf: WhatIf[]; sample: CarResult | null };

/** The strategy simulator: fitted tyre, fuel, heat and rain behaviour for every circuit, a full 22-car field, and two ways to
 *  use it: test a plan across hundreds of races, or take the calls yourself lap by lap. */
export default function StrategySim() {
  useDocumentTitle("Strategy simulator");
  const modelApi = useApi<SimModel>("/simulator/model");
  const next = useApi<NextForecasts>("/predictions/next");
  const model = modelApi.data;

  const [edit, setEdit] = useState<Partial<Setup>>({});
  const [planEdit, setPlanEdit] = useState<{ slug: string; plan: PlanStint[] } | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [live, setLive] = useState<Race | null>(null);
  const token = useRef(0);
  useEffect(() => () => { token.current += 1; }, []);

  const defaults = useMemo<Setup | null>(() => {
    if (!model) return null;
    const upcoming = next.data?.races[0]?.event_name;
    const circuit = model.circuits.find((c) => c.name === upcoming) ?? model.circuits.find((c) => c.slug === "silverstone") ?? model.circuits[0];
    return {
      slug: circuit.slug, code: model.drivers.find((d) => d.code === "NOR")?.code ?? model.drivers[0].code, trim: 0, slot: null,
      weather: "dry", rainStart: Math.round(circuit.laps * 0.4), rainPeak: 0.6, rainLength: 14, trackTemp: Math.round(circuit.track_temp_c), scProb: circuit.sc_prob,
    };
  }, [model, next.data]);

  const circuit = model && defaults ? model.circuits.find((c) => c.slug === (edit.slug ?? defaults.slug)) ?? model.circuits[0] : null;
  const setup: Setup | null = defaults && circuit ? { ...defaults, ...edit } : null;
  const suggestions = model && circuit && setup ? suggestPlans(model, circuit, circuit.laps, setup.trackTemp, 6) : []; // memoised inside
  const plan: PlanStint[] = planEdit && circuit && planEdit.slug === circuit.slug ? planEdit.plan : (suggestions[0]?.plan ?? []);

  if (modelApi.loading || !model || !circuit || !setup) {
    return (
      <div className="min-h-screen pb-32 pt-16 text-zinc-300">
        <div className="page space-y-10">
          <Head />
          {modelApi.error ? <ErrorState error={modelApi.error} onRetry={modelApi.reload} subject="simulator model" /> : <Skeleton className="h-96" />}
        </div>
      </div>
    );
  }

  const me = model.drivers.find((d) => d.code === setup.code);
  const carOffset = (model.teams.find((t) => t.name === me?.team)?.offset_s ?? 0) + (me?.offset_s ?? 0) + setup.trim;
  const weather: Weather | "circuit" =
    setup.weather === "dry" ? { kind: "dry" }
    : setup.weather === "rain" ? { kind: "rain", start: setup.rainStart, peak: setup.rainPeak, length: setup.rainLength }
    : setup.weather === "drying" ? { kind: "drying", start: 1, length: 18 }
    : "circuit";
  const scenario = (over: Partial<Scenario> = {}): Scenario => ({
    model, circuit, total: circuit.laps, trackTemp: setup.trackTemp,
    player: { code: setup.code, trim: setup.trim, slot: setup.slot, plan }, weather, events: null, scProb: setup.scProb, ...over,
  });
  const problem = planProblem(plan, circuit.laps);
  const signature = JSON.stringify([setup, plan]);
  const fresh = outcome && outcome.signature === signature ? outcome : null;
  const best = suggestions[0];
  const isBest = best && JSON.stringify(best.plan.map((s) => [s.compound, s.laps])) === JSON.stringify(plan.map((s) => [s.compound, s.laps]));

  const change = (patch: Partial<Setup>) => setEdit((e) => ({ ...e, ...patch }));
  const onSetup = (next: Setup) => {
    const patch: Partial<Setup> = {};
    (Object.keys(next) as (keyof Setup)[]).forEach((k) => { if (next[k] !== setup[k]) (patch as Record<string, unknown>)[k] = next[k]; });
    if (patch.slug) {
      setPlanEdit(null);
      const k = model.circuits.find((c) => c.slug === patch.slug);
      if (k) Object.assign(patch, { rainStart: Math.round(k.laps * 0.4), trackTemp: Math.round(k.track_temp_c), scProb: k.sc_prob });
    }
    change(patch);
  };

  const run = async () => {
    if (problem) return;
    const mine = ++token.current;
    const cancelled = () => token.current !== mine;
    setProgress(0);
    const total = RUNS * (isBest ? 1 : 2) + WHAT_IF_RUNS * 4;
    let base = 0;
    const report = (offset: number) => (done: number) => setProgress((offset + done) / total);
    const sc = (frac: number, laps = 4) => ({ sc: [{ start: Math.max(2, Math.round(circuit.laps * frac)), laps }], vsc: [] });
    const s = scenario();
    const summary = await monteCarloAsync(s, RUNS, plan, 1000, cancelled, report(base));
    base += RUNS;
    if (!summary) return;
    let reference: Summary | null = null;
    if (!isBest && best) {
      reference = await monteCarloAsync(s, RUNS, best.plan, 1000, cancelled, report(base));
      base += RUNS;
      if (!reference) return;
    }
    const cases: { label: string; note: string; over: Partial<Scenario> }[] = [
      { label: "No safety car", note: "A clean race from start to finish.", over: { events: { sc: [], vsc: [] } } },
      { label: "Early safety car", note: `Around lap ${Math.round(circuit.laps * 0.15)}.`, over: { events: sc(0.15) } },
      { label: "Safety car mid-race", note: `Around lap ${Math.round(circuit.laps * 0.5)}.`, over: { events: sc(0.5) } },
      { label: "Late safety car", note: `Around lap ${circuit.laps - 10}.`, over: { events: sc((circuit.laps - 10) / circuit.laps) } },
    ];
    const whatIf: WhatIf[] = [];
    for (const c of cases) {
      const r = await monteCarloAsync({ ...s, ...c.over, weather: s.weather === "circuit" ? { kind: "dry" } : s.weather }, WHAT_IF_RUNS, plan, 1000, cancelled, report(base));
      base += WHAT_IF_RUNS;
      if (!r) return;
      whatIf.push({ label: c.label, note: c.note, summary: r });
    }
    const sample = runOnce(s, 77, plan).runToEnd().find((c) => c.player) ?? null;
    setOutcome({ signature, mine: summary, reference, referenceLabel: reference ? "the fastest plan on pace alone" : null, whatIf, sample });
    setProgress(null);
  };

  const startLive = () => {
    if (problem) return;
    setLive(runOnce(scenario(), Math.floor(Math.random() * 1e6) + 1, plan, true));
  };

  return (
    <div className="min-h-screen pb-32 pt-16 text-zinc-300">
      <div className="page space-y-14">
        <Head />

        {live ? (
          <section aria-label="Live race">
            <LiveRace key={live.cfg.seed} model={model} circuit={circuit} race={live} onExit={() => setLive(null)} onAgain={startLive} />
          </section>
        ) : (
          <>
            <SetupPanel model={model} circuit={circuit} value={setup} onChange={onSetup} />

            <section aria-labelledby="sim-plan" className="glass space-y-6 p-5 md:p-7">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="sim-plan" className="font-mono text-[11px] uppercase tracking-[0.35em] text-red-400">4 · Your strategy</h2>
                {!isBest && best && <button type="button" onClick={() => setPlanEdit(null)} className={chip(false)}>Reset to fastest plan</button>}
              </div>
              <PlanBuilder model={model} circuit={circuit} plan={plan} onChange={(p) => setPlanEdit({ slug: circuit.slug, plan: p })} suggestions={suggestions} car={carOffset} trackTemp={setup.trackTemp} />
              <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
                <button type="button" onClick={run} disabled={!!problem || progress !== null} className="inline-flex items-center gap-2 bg-red-500 px-6 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black hover:bg-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40">
                  {progress !== null ? `Racing… ${Math.round(progress * 100)}%` : `Run ${RUNS} races`}
                </button>
                <button type="button" onClick={startLive} disabled={!!problem} className="inline-flex items-center gap-2 border border-white/25 px-6 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:border-white hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-40">
                  Race it live
                </button>
                <p className="max-w-md text-xs text-zinc-400">Running tests your plan against {RUNS} versions of the same race with different luck: safety cars, retirements, rain and traffic. Racing live lets you make the calls.</p>
              </div>
            </section>

            {outcome && !fresh && progress === null && (
              <p role="status" className="border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-300">The setup or plan has changed since the last run. Run the races again to see its results.</p>
            )}
            {fresh && (
              <section aria-labelledby="sim-results" className="space-y-8">
                <h2 id="sim-results" className="font-mono text-[11px] uppercase tracking-[0.35em] text-red-400">Results · {RUNS} races</h2>
                <ResultsPanel mine={fresh.mine} reference={fresh.reference} referenceLabel={fresh.referenceLabel} whatIf={fresh.whatIf} runs={RUNS} />
                {fresh.sample && <SampleRace result={fresh.sample} total={circuit.laps} />}
              </section>
            )}
          </>
        )}

        <details className="group glass p-5 md:p-7">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.35em] text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">How this simulator works, and what is assumed</summary>
          <div className="mt-6"><ModelCard model={model} /></div>
        </details>
      </div>
    </div>
  );
}

function Head() {
  return <PageHead kicker="STRATEGY SIMULATOR" title="Strategy" accent="lab" intro="Pick a circuit, a driver and the weather, plan the stops, then test the plan across hundreds of races or take the calls yourself. Built on tyre, fuel and heat behaviour fitted from real laps." />;
}

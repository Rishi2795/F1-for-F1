import { useMemo, useState } from "react";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useLocalState } from "../hooks/useLocalState";
import { ErrorState, Skeleton } from "../components/ui/states";
import { PageHead } from "../components/ui/pagehead";
import { chip } from "../components/ui/chipstyle";
import { readableOnDark } from "../lib/color";
import { scorePodium, type Picks } from "../lib/picks";
import { pct } from "../lib/forecast";
import type { NextForecasts, RaceDoc } from "../types/api";

function Result({ id, season, round, picks, model }: { id: string; season: number; round: number; picks: string[]; model: string[] }) {
  const race = useApi<RaceDoc>(`/seasons/${season}/races/${round}`);
  if (race.loading) return <span className="text-zinc-500">checking…</span>;
  if (!race.data) return <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">AWAITING_RESULT</span>;
  const actual = race.data.drivers.filter((d) => d.classified && d.finish !== null && d.finish <= 3).sort((a, b) => (a.finish as number) - (b.finish as number)).map((d) => d.driver_code);
  const you = scorePodium(picks, actual);
  const them = scorePodium(model, actual);
  return (
    <span data-testid={`result-${id}`} className="font-mono text-xs uppercase tracking-widest text-zinc-300">
      {actual.join(" · ")} — YOU <b className="text-white">{you}</b> / MODEL <b className="text-white">{them}</b>{" "}
      <span className={you > them ? "text-white" : you < them ? "text-red-400" : "text-zinc-500"}>{you > them ? "YOU_WIN" : you < them ? "MODEL_WINS" : "DRAW"}</span>
    </span>
  );
}

export default function Play() {
  useDocumentTitle("Predict the podium");
  const next = useApi<NextForecasts>("/predictions/next");
  const [picks, setPicks] = useLocalState<Picks>("f1.picks", {});
  const [which, setWhich] = useState(0);
  const [draft, setDraft] = useState<string[]>([]);
  const race = next.data?.races[Math.min(which, (next.data?.races.length ?? 1) - 1)];
  const key = race ? `${race.season}-${race.round}` : "";
  const saved = key ? picks[key] : undefined;
  const modelTop = useMemo(() => (race ? race.drivers.slice(0, 3).map((d) => d.code) : []), [race]);
  const toggle = (code: string) => setDraft((d) => (d.includes(code) ? d.filter((c) => c !== code) : d.length >= 3 ? d : [...d, code]));
  const save = () => race && draft.length === 3 && setPicks({ ...picks, [key]: { codes: draft, model: modelTop, savedAt: new Date().toISOString(), event: race.event_name, date: race.date } });
  const color = (code: string) => readableOnDark(`#${(race?.drivers.find((d) => d.code === code)?.team_color ?? "888888").replace("#", "")}`);
  const history = Object.entries(picks).sort((a, b) => b[1].date.localeCompare(a[1].date));

  return (
    <div className="min-h-screen pb-32 pt-10 md:pt-12 text-zinc-300">
      <div className="page space-y-10">
        <PageHead align="center" kicker="PLAY" title="Beat the" accent="model" intro="Pick the podium before the race. When the result is in, you are scored against the forecast model. Your picks stay on this device: no account, nothing sent." />
        {next.loading && <Skeleton className="h-72" />}
        {next.error && <ErrorState error={next.error} onRetry={next.reload} subject="forecast" />}
        {race && next.data && (
          <section aria-labelledby="pick-h" className="space-y-6">
            <h2 id="pick-h" className="sr-only">Make your pick</h2>
            {next.data.races.length > 1 && (
              <div role="group" aria-label="Choose a race" className="flex flex-wrap gap-2">
                {next.data.races.map((r, i) => <button key={r.round} type="button" aria-pressed={i === which} onClick={() => { setWhich(i); setDraft([]); }} className={chip(i === which)}>{r.event_name.replace(" Grand Prix", "")} · {r.date}</button>)}
              </div>
            )}
            <div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-3" role="group" aria-label="Your podium">
              {[0, 1, 2].map((i) => {
                const code = saved ? saved.codes[i] : draft[i];
                return (
                  <div key={i} className="glass-cell p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">P{i + 1}</p>
                    <p className="mt-2 min-h-[2.5rem] font-serif text-3xl text-white" style={code ? { borderLeft: `3px solid ${color(code)}`, paddingLeft: "0.75rem" } : undefined}>{code ?? "—"}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">MODEL: {modelTop[i]}</p>
                  </div>
                );
              })}
            </div>
            {saved ? (
              <p className="text-sm text-zinc-300">Locked in for the {race.event_name}. The model chose {modelTop.join(", ")}. Come back after the race to see who scored more. <button type="button" onClick={() => { const { [key]: _gone, ...rest } = picks; void _gone; setPicks(rest); setDraft([]); }} className="ml-2 font-mono text-[10px] uppercase tracking-[0.25em] text-red-400 underline underline-offset-4">CHANGE_MY_PICK</button></p>
            ) : (
              <>
                <div role="group" aria-label="Pick three drivers in finishing order" className="flex flex-wrap gap-2">
                  {race.drivers.map((d) => (
                    <button key={d.code} type="button" aria-pressed={draft.includes(d.code)} onClick={() => toggle(d.code)} className={chip(draft.includes(d.code))}>
                      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: color(d.code) }} />
                      {d.code}<span className="font-normal text-zinc-500">{pct(d.win)}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <button type="button" disabled={draft.length < 3} onClick={save} className="border border-red-600 bg-red-600 px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-transparent disabled:text-zinc-500">LOCK_IN_PODIUM</button>
                  <span className="text-sm text-zinc-500">Tap three drivers in the order you expect them to finish. The percentage is the model's win chance.</span>
                </div>
              </>
            )}
          </section>
        )}
        {history.length > 0 && (
          <section aria-labelledby="hist-h" className="space-y-4">
            <h2 id="hist-h" className="text-2xl font-black uppercase italic tracking-tighter text-white">YOUR_PICKS</h2>
            <ul className="divide-y divide-white/10 glass">
              {history.map(([id, p]) => {
                const [season, round] = id.split("-").map(Number);
                return (
                  <li key={id} className="grid gap-2 px-5 py-4 md:grid-cols-[1fr_auto]">
                    <span><span className="font-semibold text-white">{p.event.replace(" Grand Prix", "")}</span> <span className="font-mono text-xs text-zinc-500">{p.date}</span><span className="block text-sm text-zinc-400">You: {p.codes.join(" · ")} · Model: {p.model.join(" · ")}</span></span>
                    <Result id={id} season={season} round={round} picks={p.codes} model={p.model} />
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-zinc-500">Scoring: 3 points for the right driver in the right place, 1 for a podium finisher in the wrong place. Maximum 9.</p>
          </section>
        )}
      </div>
    </div>
  );
}

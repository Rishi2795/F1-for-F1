import type { SimModel } from "../../lib/sim/types";

/** What the simulator is made of: what was measured from real laps, and what is an explicit assumption. */
export function ModelCard({ model }: { model: SimModel }) {
  const c = model.card;
  const gain = c.circuit_terms_gain_pct;
  return (
    <div className="grid gap-8 text-zinc-300 lg:grid-cols-2">
      <div className="space-y-4">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.35em] text-zinc-300">Measured from real races</h3>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>Fitted on <b className="text-white">{c.laps.toLocaleString()}</b> clean green-flag laps from <b className="text-white">{c.races}</b> dry races ({c.seasons[0]}–{c.seasons[c.seasons.length - 1]}) at <b className="text-white">{c.circuits}</b> circuits.</li>
          <li>Each lap is compared with other cars on the same lap of the same race, so fuel burn, track rubbering-in and the car's own pace cancel out. What remains is the tyre: how much a fresh soft or hard gains or loses against a medium, and how many tenths each lap of age costs. Heat is a separate term.</li>
          <li>Each circuit's tyre numbers are pulled toward the all-circuit average with a ridge penalty, so a track with little data does not chase noise.</li>
          <li>Car and driver pace are the 2026 laps run through the same method. Pit-lane loss, safety-car history, rain history and how hard it is to pass come from every published race at the circuit.</li>
          <li>Tested on {c.holdout_races} races held out of the fit: typical error <b className="text-white">{c.rmse_circuit_s.toFixed(2)} s</b> a lap, against {c.rmse_without_tyre_effects_s.toFixed(2)} s with no tyre effects at all{gain != null && gain > 0 ? `; the circuit-specific terms cut it a further ${gain.toFixed(1)}%` : ""}. The rest is traffic and driver noise, which the race adds back as randomness.</li>
          <li>Calibration: with this randomness the fastest driver wins about four races in ten, close to how often it happened in 2026.</li>
        </ul>
      </div>
      <div className="space-y-4">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.35em] text-amber-300">Assumed, not measured</h3>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li><b className="text-white">Engine modes.</b> Push is {Math.abs(model.modes_assumed.push.pace_s)} s a lap quicker and wears tyres {Math.round((model.modes_assumed.push.wear - 1) * 100)}% faster; Conserve is {model.modes_assumed.conserve.pace_s} s slower and {Math.round((1 - model.modes_assumed.conserve.wear) * 100)}% gentler. Lap times cannot show this.</li>
          <li><b className="text-white">Beyond the longest run ever seen.</b> {model.cliff_assumed.note}.</li>
          <li><b className="text-white">Rain.</b> Intermediates are measured at about +{Math.round((model.wet.intermediate_penalty ?? 0) * 100)}% a lap from {model.wet.intermediate_races} wet races. Full wets, and how fast each tyre fades as the track dries, are assumed.</li>
          <li><b className="text-white">Traffic and safety cars.</b> Following within 1.5 s costs time, more so at circuits where passing is rare. Behind a safety car the field closes to about a second apart, and a stop costs about half as much.</li>
          <li><b className="text-white">Other cars</b> follow sensible plans for the circuit and react to rain and safety cars as teams do. Retirements are random (7% a car).</li>
        </ul>
        <p className="text-sm text-zinc-400">This is a model for learning how strategy trades off, not a prediction of any real race.</p>
      </div>
    </div>
  );
}

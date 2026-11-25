import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ErrorState, Skeleton } from "../components/ui/states";
import { Block } from "../components/race/detail/block";
import { Compare } from "../components/racelab/compare";
import { Evolution } from "../components/racelab/evolution";
import { GapChart } from "../components/racelab/gapchart";
import { Incidents } from "../components/racelab/incidents";
import { PaceBoxes } from "../components/racelab/paceboxes";
import { Replay } from "../components/racelab/replay";
import { TrackReplay } from "../components/racelab/trackreplay";
import { WhereItWentWrong } from "../components/racelab/wrong";
import { slugify } from "../lib/slug";
import { TelemetryLab } from "../components/racelab/telemetrylab";
import { buildEvents } from "../lib/events";
import type { CircuitDoc, IncidentDoc, LapDoc, RaceDoc, ReplayDoc, TelemetryDoc } from "../types/api";

export default function RaceLab() {
  const { year = "", round = "" } = useParams();
  const race = useApi<RaceDoc>(`/seasons/${year}/races/${round}`);
  const laps = useApi<LapDoc>(`/seasons/${year}/races/${round}/laps`);
  // The heavy files load in order of need so the lap data is never held up: laps first, then the real-position replay
  // (about 0.8 MB compressed, newest races only), then the telemetry and the race-control messages. With the browser's
  // data-saver on they are skipped and the replay falls back to lap timing, which it says on screen.
  const saver = typeof navigator !== "undefined" && (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  const base = `/seasons/${year}/races/${round}`;
  const lapsReady = !laps.loading;
  const replayState = useApi<ReplayDoc>(lapsReady && !saver ? `${base}/replay` : null);
  const replay = replayState.data; // absent for older races: the replay falls back to timing
  const afterReplay = lapsReady && !replayState.loading;
  const telemetry = useApi<TelemetryDoc>(afterReplay && !saver ? `${base}/telemetry` : null).data; // absent before 2023: section left out
  const incidents = useApi<IncidentDoc>(afterReplay ? `${base}/incidents` : null).data; // race-control messages, where published
  const circuit = useApi<CircuitDoc>(race.data ? `/circuits/${slugify(race.data.location)}` : null).data;
  const [clock, setClock] = useState(0);
  const outline = circuit?.outline?.points;
  useDocumentTitle(race.data ? `${race.data.event_name} race lab` : "Race lab");

  return (
    <div className="min-h-screen pb-32 pt-10 md:pt-12 text-zinc-300">
      <div className="page space-y-10">
        <header className="f1-rise space-y-4">
          <Link to={`/race/${year}/${round}`} className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400 hover:text-white">← BACK_TO_THE_RACE</Link>
          <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-400"><span aria-hidden="true" className="h-2 w-2 bg-red-600" />REGISTRY // RACE_LAB</p>
          <h1 className="text-4xl font-black uppercase italic leading-[0.95] tracking-tighter text-white md:text-6xl">{race.data ? race.data.event_name : "Race"} <span className="text-red-500">lab</span></h1>
          <p className="max-w-2xl text-lg text-zinc-300">Every lap of the race: the gaps, the pace, the flags, the stops. Replay it, or put two drivers side by side.</p>
        </header>
        {(race.loading || laps.loading) && <Skeleton className="h-[480px]" />}
        {laps.error && <ErrorState error={laps.error} onRetry={laps.reload} subject="lap data" backTo={{ href: `/race/${year}/${round}`, label: "Back to the race" }} />}
        {race.data && laps.data && (
          <>
            <Block id="replay-h" n="01" title="Track" accent="replay" note={outline ? "The race played back on the circuit" : "Scrub through the race lap by lap"}>
              {outline && replayState.loading ? <Skeleton className="h-[480px]" /> : outline ? <TrackReplay doc={laps.data} drivers={race.data.drivers} outline={outline} telemetry={telemetry} replay={replay} incidents={incidents} events={buildEvents(laps.data, race.data.drivers, incidents)} t={clock} setT={setClock} /> : <Replay doc={laps.data} drivers={race.data.drivers} />}
            </Block>
            {outline && telemetry && telemetry.drivers.length > 0 && (
              <Block id="tel-h" n="02" title="Fastest lap" accent="telemetry" note="Zoom in and read the car at any point of the track">
                <TelemetryLab doc={telemetry} drivers={race.data.drivers} outline={outline} />
              </Block>
            )}
            <Block id="wrong-h" n="03" title="Where it" accent="went wrong" note="Pick a driver to see the moments that cost them">
              <WhereItWentWrong doc={laps.data} drivers={race.data.drivers} onJump={(time) => { setClock(time); document.getElementById("replay-h")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
            </Block>
            <Block id="gap-h" n="04" title="Gap to" accent="the leader" note="How the race stretched and bunched"><GapChart doc={laps.data} drivers={race.data.drivers} /></Block>
            <Block id="boxes-h" n="05" title="Pace" accent="distribution" note="Speed and consistency on clean laps"><PaceBoxes doc={laps.data} drivers={race.data.drivers} /></Block>
            <Block id="evo-h" n="06" title="Track" accent="evolution" note="How the pace changed through the race"><Evolution doc={laps.data} drivers={race.data.drivers} /></Block>
            <Block id="cmp-h" n="07" title="Driver" accent="comparison" note="Two drivers, lap by lap"><Compare doc={laps.data} drivers={race.data.drivers} /></Block>
            <Block id="inc-h" n="08" title="Flags and" accent="undercuts" note="What interrupted the race, and which stops worked"><Incidents doc={laps.data} /></Block>
          </>
        )}
      </div>
    </div>
  );
}

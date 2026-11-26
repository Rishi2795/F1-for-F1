import type { RaceDoc } from "../../../types/api";
import { Highlights } from "./highlights";
import { LapChart } from "./lapchart";
import { PaceColumns } from "./pacecolumns";
import { ResultSheet } from "./resultsheet";
import { Block } from "./block";
import { Qualifying } from "./qualifying";
import { StrategyChart } from "./strategychart";
import { TyreLab } from "./tyrelab";

/** Everything the timing data says about one race, in reading order. Section numbers start at 02
 *  because 01 ("How the race went") is the story above it. */
export function RaceDetail({ race }: { race: RaceDoc }) {
  const hasLaps = race.drivers.some((d) => d.lap_positions);
  const hasPace = race.drivers.some((d) => d.pace_rank != null);
  const hasStints = race.drivers.some((d) => d.stints && d.stints.length > 0);
  const hasQuali = race.drivers.filter((d) => d.quali_position != null).length >= 5;
  return (
    <>
      <Highlights race={race} />
      <Block id="classification-h" n="02" title="Race" accent="classification" note="Gaps shown for lead-lap finishers">
        <ResultSheet drivers={race.drivers} />
      </Block>
      {hasQuali && (
        <Block id="quali-h" n="03" title="Qualifying" accent="ladder" note="Gap to pole, and grid versus finish">
          <Qualifying drivers={race.drivers} />
        </Block>
      )}
      {hasLaps && (
        <Block id="lapchart-h" n="04" title="Lap" accent="by lap" note="Grid to flag">
          <LapChart drivers={race.drivers} totalLaps={race.derived.total_laps} />
        </Block>
      )}
      {hasPace && (
        <Block id="pace-h" n="05" title="Race" accent="pace" note="Who was quickest on clean laps">
          <PaceColumns drivers={race.drivers} />
        </Block>
      )}
      {hasStints && (
        <Block id="strategy-h" n="06" title="Tyre" accent="strategy" note="Stints and pit stops, in finishing order">
          <StrategyChart drivers={race.drivers} totalLaps={race.derived.total_laps} />
        </Block>
      )}
      {race.tyre_model && (
        <Block id="tyrelab-h" n="07" title="Tyre model" accent="and what-if" note="Fuel-corrected wear, and other stop plans">
          <TyreLab model={race.tyre_model} lab={race.strategy_lab} drivers={race.drivers} />
        </Block>
      )}
    </>
  );
}

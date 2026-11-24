"""Assemble one published RaceDoc from the sources. Missing data stays missing."""

from __future__ import annotations

import statistics
from collections import Counter
from dataclasses import dataclass, field

from . import metrics
from .logging_setup import get_logger
from .models import (
    Derived,
    DriverRace,
    Quality,
    RaceDoc,
    Stint,
    Weather,
    Winner,
)
from .sources.jolpica import PitStopRow, ResultRow, ScheduleEntry
from .sources.openf1 import OpenF1Stint
from .sources.tracinginsights import DriverLaps, RaceLaps

log = get_logger("build")


@dataclass
class RaceInputs:
    entry: ScheduleEntry
    results: list[ResultRow]
    pit_stops: list[PitStopRow] = field(default_factory=list)
    laps: RaceLaps | None = None
    openf1_stints: dict[int, list[OpenF1Stint]] = field(default_factory=dict)  # by driver number


def _stints_from_openf1(items: list[OpenF1Stint], total_laps: int | None) -> list[Stint]:
    out: list[Stint] = []
    for i, s in enumerate(sorted(items, key=lambda s: s.stint_number), start=1):
        end = s.lap_end if s.lap_end is not None else total_laps
        if end is None or end < s.lap_start:
            continue
        out.append(
            Stint(
                number=i, compound=s.compound, compound_source="openf1" if s.compound else None,
                lap_start=s.lap_start, lap_end=end, laps=end - s.lap_start + 1,
                tyre_age_start=s.tyre_age_at_start, fresh=None,
            )
        )
    return out


def _team_lookup(results: list[ResultRow], laps: RaceLaps | None):
    """Return ``row -> (team name, colour)``.

    Names and colours come from the lap archive. A driver missing from it (no lap data) would otherwise fall
    back to Jolpica's constructor name ("Cadillac F1 Team" next to teammates on "Cadillac") and lose the colour,
    so we borrow both from a teammate in the same race: the same constructor has the same team.
    """
    known: dict[str, Counter[tuple[str, str | None]]] = {}
    if laps:
        for row in results:
            team = laps.team_names.get(row.driver_code)
            if team:
                known.setdefault(row.constructor, Counter())[(team, _hex(laps.team_colors.get(row.driver_code)))] += 1

    def lookup(row: ResultRow) -> tuple[str, str | None]:
        if laps and laps.team_names.get(row.driver_code):
            return laps.team_names[row.driver_code], _hex(laps.team_colors.get(row.driver_code))
        own = _find_laps(row, laps)
        lap_team = next((lap.team for lap in own.laps if lap.team), None) if own else None
        if lap_team:  # the lap rows carry the team name even when drivers.json is missing for the race
            return lap_team, None
        votes = known.get(row.constructor)
        return votes.most_common(1)[0][0] if votes else (row.constructor, None)

    return lookup


def _hex(color: str | None) -> str | None:
    return f"#{color}" if color else None


def _find_laps(row: ResultRow, laps: RaceLaps | None) -> DriverLaps | None:
    if laps is None:
        return None
    if row.driver_code in laps.drivers:
        return laps.drivers[row.driver_code]
    if row.driver_number is not None:
        for candidate in laps.drivers.values():
            if candidate.number == row.driver_number:
                return candidate
    return None


def build_race(inputs: RaceInputs) -> RaceDoc:
    entry, laps = inputs.entry, inputs.laps
    warnings: list[str] = []
    pit_counts: dict[str, int] = {}
    pit_laps: dict[str, list[int]] = {}
    for stop in inputs.pit_stops:
        pit_counts[stop.driver_id] = pit_counts.get(stop.driver_id, 0) + 1
        if stop.lap is not None:
            pit_laps.setdefault(stop.driver_id, []).append(stop.lap)
    have_pit_data = bool(inputs.pit_stops)
    filled_openf1 = filled_continuity = 0
    xcheck_compared = xcheck_agree = 0

    drivers: list[DriverRace] = []
    stints_by_code: dict[str, list[Stint] | None] = {}
    laps_by_code: dict[str, list] = {}
    stints_source = "none"

    for row in inputs.results:
        dl = _find_laps(row, laps)
        stints: list[Stint] | None = None
        reference = inputs.openf1_stints.get(row.driver_number) if row.driver_number is not None else None
        # Trust OpenF1 for this driver only if its stint count agrees with the official pit-stop record;
        # in wet / red-flag races it sometimes splits stints differently and would mislead us.
        official_count = pit_counts.get(row.driver_id, 0) if have_pit_data else None
        if reference and official_count is not None and len(reference) - 1 != official_count:
            reference = None
        total_laps = (laps.total_laps if laps else None) or row.laps
        if dl and dl.laps:
            # Official stop laps let us prove an unlabelled run of laps belongs to a neighbouring stint.
            stints = metrics.build_stints(dl.laps, pit_laps.get(row.driver_id, []) if have_pit_data else None)
            laps_by_code[row.driver_code] = dl.laps
            stints_source = "tracinginsights"
            filled_continuity += sum(1 for st in stints if st.compound_source == "continuity")
            if reference:
                c, a = metrics.crosscheck_with_openf1(stints, reference)
                xcheck_compared += c
                xcheck_agree += a
                if any(st.compound is None for st in stints):
                    stints, n = metrics.fill_compounds_from_openf1(stints, reference)
                    filled_openf1 += n
        elif reference:
            stints = _stints_from_openf1(reference, total_laps)
            if stints_source == "none":
                stints_source = "openf1"
        stints_by_code[row.driver_code] = stints

    stops_known = [len(s) - 1 for s in stints_by_code.values() if s]
    avg_stops = statistics.fmean(stops_known) if stops_known else None
    winner_row = next((r for r in inputs.results if r.finish == 1), None)
    winner_stints = stints_by_code.get(winner_row.driver_code) if winner_row else None
    winner_stops = len(winner_stints) - 1 if winner_stints else None

    team_lookup = _team_lookup(inputs.results, laps)

    for row in inputs.results:
        dl = _find_laps(row, laps)
        stints = stints_by_code[row.driver_code]
        stops = len(stints) - 1 if stints else None
        official = pit_counts.get(row.driver_id, 0) if have_pit_data else None
        if stops is not None and official is not None and stops != official:
            warnings.append(f"stops_mismatch:{row.driver_code}(stints={stops},official={official})")
        gained = (
            row.grid - row.finish
            if row.grid is not None and row.finish is not None and row.classified
            else None
        )
        sequence = [s.compound or "UNKNOWN" for s in stints] if stints else None
        longest = max((s.laps for s in stints), default=None) if stints else None
        team, color = team_lookup(row)
        drivers.append(
            DriverRace(
                driver_code=row.driver_code,
                driver_number=row.driver_number,
                driver_name=row.driver_name,
                team=team,
                team_color=color,
                finish=row.finish,
                classified=row.classified,
                status=row.status,
                points=row.points,
                laps_completed=row.laps,
                grid=row.grid,
                pit_lane_start=row.pit_lane_start,
                positions_gained=gained,
                laps_available=bool(dl and dl.laps),
                stops=stops,
                stops_official=official,
                tyre_sequence=sequence,
                stints=stints,
                longest_stint=longest,
                consistency_index=metrics.consistency_index(dl.laps) if dl else None,
                strategy_risk=metrics.strategy_risk(stops, gained, avg_stops),
                strategy_simulation=metrics.strategy_simulation(stops, gained, winner_stops),
            )
        )
    drivers.sort(key=lambda d: (d.finish is None, d.finish or 0))

    # --- race-level -----------------------------------------------------------
    winner = next((d for d in drivers if d.finish == 1), None)
    top5 = [d.longest_stint for d in drivers[:5] if d.longest_stint is not None]
    recipe, tags = metrics.derive_race_meta(
        winner.tyre_sequence if winner else None,
        winner.stops if winner else None,
        top5,
        [d.stops for d in drivers if d.stops is not None],
        [d.positions_gained for d in drivers if d.positions_gained is not None],
    )
    sc, vsc, red = metrics.track_status_laps(list(laps_by_code.values()))
    total_laps = (laps.total_laps if laps else None) or (winner.laps_completed if winner else None)
    derived = Derived(
        winning_recipe=recipe, style_profile=tags, total_laps=total_laps,
        safety_car_laps=sc, vsc_laps=vsc, red_flag=red,
    )

    weather = _weather(list(laps_by_code.values()))

    # --- quality --------------------------------------------------------------
    missing: list[str] = []
    n = len(drivers)
    with_laps = sum(d.laps_available for d in drivers)
    unknown_compound = any(s.compound is None for st in stints_by_code.values() if st for s in st)
    if not drivers:
        status = "missing"
        missing.append("results")
    else:
        if with_laps == 0:
            missing.append("laps")
        elif with_laps < n * 0.9:
            missing.append("laps(some drivers)")
        if stints_source == "none":
            missing.append("stints")
        elif unknown_compound:
            missing.append("compound(some stints)")
        if weather is None:
            missing.append("weather")
        status = "ok" if not [m for m in missing if m != "weather"] else "partial"
    if len(warnings) > 10:
        warnings = [*warnings[:10], f"...and {len(warnings) - 10} more stops_mismatch"]
    notes: list[str] = []
    if filled_continuity:
        notes.append(f"{filled_continuity} stint(s) joined to a neighbour: no pit stop between them (tyre continuity)")
    if filled_openf1:
        notes.append(f"{filled_openf1} stint compound(s) filled from OpenF1")
    if xcheck_compared:
        notes.append(f"cross-check vs OpenF1: {xcheck_agree}/{xcheck_compared} stint compounds agree")
        disagree = xcheck_compared - xcheck_agree
        if disagree >= max(3, round(xcheck_compared * 0.1)):
            warnings.append(f"compound_sources_disagree:{disagree}/{xcheck_compared}")
    sources_stints = stints_source + ("+openf1" if filled_openf1 and stints_source == "tracinginsights" else "")
    quality = Quality(
        status=status,
        sources={
            "results": "jolpica",
            "pit_stops": "jolpica" if have_pit_data else "none",
            "laps": "tracinginsights" if with_laps else "none",
            "stints": sources_stints,
        },
        missing=missing,
        warnings=warnings,
        notes=notes,
    )
    return RaceDoc(
        season=entry.season,
        round=entry.round,
        event_name=entry.event_name,
        location=entry.location,
        country=entry.country,
        date=entry.date,
        winner=(
            Winner(driver_code=winner.driver_code, driver_name=winner.driver_name, team=winner.team)
            if winner
            else None
        ),
        drivers=drivers,
        derived=derived,
        weather=weather,
        quality=quality,
    )


def _weather(all_laps: list[list]) -> Weather | None:
    flat = [lap for laps in all_laps for lap in laps]
    air = [x.air_temp for x in flat if x.air_temp is not None]
    track = [x.track_temp for x in flat if x.track_temp is not None]
    hum = [x.humidity for x in flat if x.humidity is not None]
    rain = [x.rainfall for x in flat if x.rainfall is not None]
    if not (air or track or hum or rain):
        return None
    return Weather(
        air_temp_c=round(statistics.fmean(air), 1) if air else None,
        track_temp_c=round(statistics.fmean(track), 1) if track else None,
        humidity_pct=round(statistics.fmean(hum), 1) if hum else None,
        rainfall=any(rain) if rain else None,
    )

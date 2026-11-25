"""Race and driver metrics. Pure functions: easy to test, no I/O.

Honesty rule: every metric returns ``None`` when its inputs are missing. The
rule-based ones (``strategy_risk``, ``strategy_simulation``) are labelled
``rule_based_v1`` and are replaced by modelled versions in the ML phase.
"""

from __future__ import annotations

import statistics
from collections import Counter

from .models import Stint, StrategyRisk, StrategySimulation, WinningRecipe
from .sources.tracinginsights import Lap

MIN_CLEAN_LAPS = 5
_GREEN = "1"
_SC, _VSC_A, _VSC_B, _RED = "4", "6", "7", "5"


_STOP_TOLERANCE = 1  # laps: a recorded pit stop this close to a boundary explains the boundary


def _known_compound(laps: list[Lap]) -> str | None:
    known = [lap.compound for lap in laps if lap.compound]
    return Counter(known).most_common(1)[0][0] if known else None


def _group_by_stint(laps: list[Lap]) -> list[list[Lap]]:
    groups: list[list[Lap]] = []
    current_key: int | None = None
    for lap in sorted(laps, key=lambda x: x.lap):
        key = lap.stint if lap.stint is not None else current_key
        if not groups or key != current_key:
            groups.append([])
            current_key = key
        groups[-1].append(lap)
    return groups


def _absorb_unknown_segments(groups: list[list[Lap]], stop_laps: list[int]) -> tuple[list[list[Lap]], set[int]]:
    """Join a compound-less segment to its known neighbour when no pit stop separates them.

    The timing feed sometimes has no tyre data for a run of laps and the tool then reports it as a
    separate stint. A tyre cannot change without a pit stop, so if no official stop is within one
    lap of the boundary (and tyre age, where known, carries on) both segments are one stint and the
    compound is the neighbour's. Returns the new groups and the indices that absorbed laps.
    """
    inferred: set[int] = set()
    merged = True
    while merged:
        merged = False
        for i in range(len(groups) - 1):
            a, b = groups[i], groups[i + 1]
            known_a, known_b = _known_compound(a), _known_compound(b)
            if (known_a is None) == (known_b is None):
                continue  # both known or both unknown: nothing we can prove
            boundary = a[-1].lap
            if any(abs(stop - boundary) <= _STOP_TOLERANCE for stop in stop_laps):
                continue  # a real pit stop sits here
            life_a, life_b = a[-1].tyre_life, b[0].tyre_life
            if life_a is not None and life_b is not None and life_b != life_a + 1:
                continue  # tyre age restarts: it is a different set
            groups[i : i + 2] = [a + b]
            inferred = {(j - 1 if j > i + 1 else j) for j in inferred if j != i + 1} | {i}
            merged = True
            break
    return groups, inferred


def build_stints(laps: list[Lap], official_stop_laps: list[int] | None = None) -> list[Stint]:
    """Group laps into stints. ``official_stop_laps`` (from the official pit-stop record) lets us
    prove that an unlabelled run of laps belongs to a neighbouring stint; without it nothing is inferred."""
    groups = _group_by_stint(laps)
    inferred: set[int] = set()
    if official_stop_laps is not None:
        groups, inferred = _absorb_unknown_segments(groups, official_stop_laps)
    stints: list[Stint] = []
    for index, group in enumerate(groups):
        compound = _known_compound(group)
        first = group[0]
        age = None if first.tyre_life is None else max(0, first.tyre_life - 1)
        stints.append(
            Stint(
                number=index + 1,
                compound=compound,
                compound_source=None if compound is None else ("continuity" if index in inferred else "timing"),
                lap_start=group[0].lap,
                lap_end=group[-1].lap,
                laps=len(group),
                tyre_age_start=age,
                fresh=first.fresh,
            )
        )
    return stints


def _aligned_reference(stints: list[Stint], reference: list) -> list | None:
    """OpenF1's stints in order, if (and only if) they pair one-to-one with ours.

    Lap boundaries differ by a lap or two between sources (especially after red flags), so we
    never match on laps. When both sources agree on how many stints a driver ran, stint i is
    stint i; when they don't, we conclude nothing.
    """
    ordered = sorted(reference, key=lambda r: r.stint_number)
    return ordered if stints and len(ordered) == len(stints) else None


def fill_compounds_from_openf1(stints: list[Stint], reference: list) -> tuple[list[Stint], int]:
    """Fill unknown compounds from the matching OpenF1 stint. Known compounds are never overwritten."""
    ordered = _aligned_reference(stints, reference)
    if ordered is None:
        return stints, 0
    filled = 0
    out: list[Stint] = []
    for stint, ref in zip(stints, ordered, strict=True):
        if stint.compound is None and ref.compound is not None:
            out.append(stint.model_copy(update={"compound": ref.compound, "compound_source": "openf1"}))
            filled += 1
        else:
            out.append(stint)
    return out, filled


def crosscheck_with_openf1(stints: list[Stint], reference: list) -> tuple[int, int]:
    """(compared, agreeing) compounds for stints that came from the timing feed or continuity.
    Purely a check: nothing is changed, and drivers whose stint counts differ are skipped."""
    ordered = _aligned_reference(stints, reference)
    if ordered is None:
        return 0, 0
    compared = agree = 0
    for stint, ref in zip(stints, ordered, strict=True):
        if stint.compound is None or stint.compound_source == "openf1" or ref.compound is None:
            continue
        compared += 1
        agree += ref.compound == stint.compound
    return compared, agree


def clean_lap_times(laps: list[Lap]) -> list[float]:
    """Green-flag, non-pit, non-deleted laps (excluding lap 1) within 107% of the median."""
    times = [
        lap.time_s
        for lap in laps
        if lap.time_s is not None
        and lap.lap > 1
        and lap.track_status == _GREEN
        and not lap.pit_in
        and not lap.pit_out
        and not lap.deleted
    ]
    if len(times) < MIN_CLEAN_LAPS:
        return []
    median = statistics.median(times)
    return [t for t in times if t <= median * 1.07]


def consistency_index(laps: list[Lap]) -> int | None:
    """0-100, higher = steadier clean-lap times (100 - coefficient of variation in % x 10)."""
    times = clean_lap_times(laps)
    if len(times) < MIN_CLEAN_LAPS:
        return None
    mean = statistics.fmean(times)
    if mean <= 0:
        return None
    cv_pct = statistics.pstdev(times) / mean * 100
    return max(0, min(100, round(100 - cv_pct * 10)))


def track_status_laps(all_laps: list[list[Lap]]) -> tuple[int | None, int | None, bool | None]:
    """(safety-car laps, VSC laps, red flag) across the field; None when no lap data."""
    seen = [lap for laps in all_laps for lap in laps if lap.track_status]
    if not seen:
        return None, None, None
    sc = {lap.lap for lap in seen if _SC in (lap.track_status or "")}
    vsc = {lap.lap for lap in seen if _VSC_A in (lap.track_status or "") or _VSC_B in (lap.track_status or "")}
    red = any(_RED in (lap.track_status or "") for lap in seen)
    return len(sc), len(vsc), red


def strategy_risk(stops: int | None, positions_gained: int | None, avg_stops: float | None) -> StrategyRisk | None:
    if stops is None or avg_stops is None:
        return None
    risk = int(abs(stops - avg_stops) * 20)
    if positions_gained is not None and positions_gained < -3:
        risk += 25
    if stops >= 3:
        risk += 20
    risk = min(100, risk)
    label = "High Risk" if risk >= 65 else "Balanced" if risk >= 35 else "Conservative"
    return StrategyRisk(risk_score=risk, risk_label=label)


def strategy_simulation(
    stops: int | None, positions_gained: int | None, winner_stops: int | None
) -> StrategySimulation | None:
    if stops is None or winner_stops is None:
        return None
    delta = 0
    if stops > winner_stops + 1:
        delta += 2
    elif stops > winner_stops:
        delta += 1
    if positions_gained is not None and positions_gained < -2:
        delta += 1
    verdict = {
        0: "Strategy was well-calibrated relative to the race winner; no significant gains identified.",
        1: "Marginal improvements possible through tighter alignment with the winning strategy.",
        2: "A closer mirroring of the race winner's approach could have secured track position.",
    }.get(delta, "Adopting the winning strategy would likely have yielded multiple position gains.")
    return StrategySimulation(verdict=verdict)


def derive_race_meta(
    winner_sequence: list[str] | None,
    winner_stops: int | None,
    top5_longest: list[int],
    all_stops: list[int],
    all_gained: list[int],
) -> tuple[WinningRecipe, list[str]]:
    """Winning recipe + descriptive tags, computed only from what is actually known."""
    avg_longest = round(statistics.fmean(top5_longest)) if top5_longest else None
    recipe = WinningRecipe(
        typical_stops=winner_stops,
        common_tyre_sequence=" → ".join(winner_sequence) if winner_sequence else None,
        avg_longest_stint=avg_longest,
    )
    tags: list[str] = []
    if all_stops:
        avg_stops = statistics.fmean(all_stops)
        tags.append(
            "High Degradation" if avg_stops >= 2.5 else "Low Degradation" if avg_stops <= 1.2 else "Medium Degradation"
        )
        tags.append("Strategy Sensitive" if avg_stops > 2 else "Execution Focused")
    if all_gained:
        tags.append("High Overtaking" if statistics.fmean(all_gained) > 1.0 else "Track Position Circuit")
    if avg_longest is not None:
        if avg_longest >= 30:
            tags.append("Long Stints")
        elif avg_longest <= 15:
            tags.append("Short Stints")
    return recipe, tags


# -- race detail ---------------------------------------------------------------
def best_lap(laps: list[Lap]) -> float | None:
    """Quickest valid lap (not deleted, not a pit lap, lap 1 excluded). None when there is none."""
    times = [
        lap.time_s
        for lap in laps
        if lap.time_s is not None and lap.lap > 1 and not lap.deleted and not lap.pit_in and not lap.pit_out
    ]
    return min(times) if times else None


def median_clean_lap(laps: list[Lap]) -> float | None:
    times = clean_lap_times(laps)
    return round(statistics.median(times), 3) if len(times) >= MIN_CLEAN_LAPS else None


def lap_positions(laps: list[Lap], total_laps: int | None) -> list[int | None] | None:
    """Position at the end of every lap, index 0 = lap 1. A lap without a position stays None."""
    by_lap = {lap.lap: lap.position for lap in laps if lap.position}
    if not by_lap:
        return None
    last = max(by_lap.keys() | {total_laps or 0})
    return [by_lap.get(n) for n in range(1, last + 1)]


def lead_changes(positions: list[list[int | None]]) -> int | None:
    """How many times the race leader changed hands between consecutive laps (pit-cycle swaps count)."""
    if not positions:
        return None
    laps = max(len(p) for p in positions)
    leaders: list[int] = []
    for n in range(laps):
        for index, p in enumerate(positions):
            if n < len(p) and p[n] == 1:
                leaders.append(index)
                break
    return sum(1 for a, b in zip(leaders, leaders[1:], strict=False) if a != b) if len(leaders) > 1 else None


def _slope(points: list[tuple[int, float]]) -> float:
    xs, ys = [p[0] for p in points], [p[1] for p in points]
    mx, my = statistics.fmean(xs), statistics.fmean(ys)
    var = sum((x - mx) ** 2 for x in xs)
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys, strict=True)) / var if var else 0.0


def tyre_wear(all_laps: list[list[Lap]], min_clean: int = 8, min_stints: int = 3):
    """Median lap-time slope against tyre age per compound, from clean laps of whole stints.

    Net of fuel burn (cars get lighter), hence a lower bound on real wear. Compounds seen in fewer
    than ``min_stints`` stints are left out rather than estimated from noise.
    """
    slopes: dict[str, list[float]] = {}
    for laps in all_laps:
        by_stint: dict[tuple[int | None, str | None], list[Lap]] = {}
        for lap in laps:
            if lap.compound and lap.tyre_life is not None and lap.stint is not None:
                by_stint.setdefault((lap.stint, lap.compound), []).append(lap)
        for (_, compound), stint_laps in by_stint.items():
            clean = clean_lap_times(stint_laps)
            if len(clean) < min_clean:
                continue
            keep = {t for t in clean}
            points = [
                (lap.tyre_life, lap.time_s)
                for lap in stint_laps
                if lap.time_s in keep
                and lap.lap > 1
                and lap.track_status == _GREEN
                and not lap.pit_in
                and not lap.pit_out
                and not lap.deleted
            ]
            if len(points) >= min_clean:
                slopes.setdefault(compound, []).append(_slope(points))
    return [
        (compound, round(statistics.median(values), 3), len(values))
        for compound, values in sorted(slopes.items())
        if len(values) >= min_stints and compound in {"SOFT", "MEDIUM", "HARD"}
    ]

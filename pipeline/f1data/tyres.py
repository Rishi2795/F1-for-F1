"""Fuel-corrected tyre behaviour and a strategy what-if, from one race's lap times.

Model, per driver d, lap L on compound c at tyre age a:
    lap time = base_d + offset_c + wear_c x a + fuel x L
`base_d` is removed by demeaning within each driver, so only differences between a driver's own laps drive the
fit. Fuel burn (`fuel`, seconds per lap, negative) is estimated from the data rather than assumed: drivers pit at
different times, so lap number and tyre age separate. A fit that is not physically sensible is dropped, not shown.

The what-if prices alternative stop plans with the same model. Fuel and base pace cancel when two plans of the
same length are compared, so only compound offsets, wear and pit loss matter. It ignores traffic, safety cars
and weather: it says what the tyres alone would have cost, not what would have happened.
"""

from __future__ import annotations

import itertools
import statistics

from .models import DriverStrategy, Stint, StrategyOption, TyreCompound, TyreModel
from .ratings.evaluate import _solve
from .sources.tracinginsights import Lap

_GREEN = "1"
MIN_LAPS = 150
MIN_STINTS = 3
MIN_COMPOUND_LAPS = 40
STEP = 2  # candidate stop laps are tried every STEP laps
MIN_STINT = 6
ALT_COUNT = 3


def _clean(laps: list[Lap]) -> list[Lap]:
    rows = [
        lap
        for lap in laps
        if lap.time_s is not None
        and lap.lap > 1
        and lap.track_status == _GREEN
        and not lap.pit_in
        and not lap.pit_out
        and not lap.deleted
        and lap.compound
        and lap.tyre_life is not None
    ]
    if len(rows) < 8:
        return []
    median = statistics.median(lap.time_s for lap in rows)  # type: ignore[misc]
    return [lap for lap in rows if lap.time_s <= median * 1.07]  # type: ignore[operator]


def fit(laps_by_code: dict[str, list[Lap]]) -> tuple[TyreModel, dict[str, float]] | None:
    """Fit the model for a race. Returns it with each compound's longest observed tyre age, or None."""
    rows: list[tuple[str, str, int, int, float]] = []  # driver, compound, age, lap, time
    stints: dict[str, set[tuple[str, int | None]]] = {}
    for code, laps in laps_by_code.items():
        for lap in _clean(laps):
            rows.append((code, lap.compound, lap.tyre_life, lap.lap, lap.time_s))  # type: ignore[arg-type]
            stints.setdefault(lap.compound, set()).add((code, lap.stint))  # type: ignore[arg-type]
    if len(rows) < MIN_LAPS:
        return None
    count = {c: sum(1 for r in rows if r[1] == c) for c in stints}
    compounds = sorted(
        (c for c in stints if len(stints[c]) >= MIN_STINTS and count[c] >= MIN_COMPOUND_LAPS), key=lambda c: -count[c]
    )
    if len(compounds) < 1:
        return None
    ref = compounds[0]
    others = compounds[1:]
    rows = [r for r in rows if r[1] in compounds]
    names = [f"wear:{c}" for c in compounds] + [f"offset:{c}" for c in others] + ["fuel"]

    def features(r: tuple[str, str, int, int, float]) -> list[float]:
        _, c, age, lap, _t = r
        return (
            [float(age) if c == k else 0.0 for k in compounds] + [1.0 if c == k else 0.0 for k in others] + [float(lap)]
        )

    by_driver: dict[str, list[tuple[list[float], float]]] = {}
    for r in rows:
        by_driver.setdefault(r[0], []).append((features(r), r[4]))
    k = len(names)
    xtx = [[0.0] * k for _ in range(k)]
    xty = [0.0] * k
    used = 0
    for items in by_driver.values():
        if len(items) < 8:
            continue
        mean_x = [sum(f[j] for f, _ in items) / len(items) for j in range(k)]
        mean_y = sum(t for _, t in items) / len(items)
        for f, t in items:
            d = [f[j] - mean_x[j] for j in range(k)]
            for a in range(k):
                xty[a] += d[a] * (t - mean_y)
                for b in range(k):
                    xtx[a][b] += d[a] * d[b]
        used += len(items)
    if used < MIN_LAPS:
        return None
    for a in range(k):
        xtx[a][a] += 1e-6  # keeps a compound that was barely used from making the system singular
    beta = _solve(xtx, xty)
    coef = dict(zip(names, beta, strict=True))
    fuel = coef["fuel"]
    if not -0.12 <= fuel <= 0.0:
        return None  # not physically sensible: cars get lighter, so laps cannot get slower with fuel burn
    if any(not -0.05 <= coef[f"wear:{c}"] <= 0.5 for c in compounds):
        return None
    if _order_is_wrong({c: (0.0 if c == ref else coef[f"offset:{c}"]) for c in compounds}):
        return None  # softer tyres must not come out slower than harder ones
    pit_loss = _pit_loss(laps_by_code)
    if pit_loss is None:
        return None
    model = TyreModel(
        fuel_s_per_lap=round(fuel, 4),
        pit_loss_s=round(pit_loss, 2),
        laps_fitted=used,
        compounds=[
            TyreCompound(
                compound=c,
                pace_offset_s=round(0.0 if c == ref else coef[f"offset:{c}"], 3),
                wear_s_per_lap=round(coef[f"wear:{c}"], 4),
                stints=len(stints[c]),
            )
            for c in compounds
        ],
    )
    max_age = {c: float(max(r[2] for r in rows if r[1] == c)) for c in compounds}
    return model, max_age


_HARDNESS = {"SOFT": 0, "MEDIUM": 1, "HARD": 2}


def _order_is_wrong(offsets: dict[str, float]) -> bool:
    """True if a softer dry compound is priced slower than a harder one, or a wet tyre is in the mix."""
    if any(c not in _HARDNESS for c in offsets):
        return True
    return any(offsets[a] > offsets[b] + 0.05 for a in offsets for b in offsets if _HARDNESS[a] < _HARDNESS[b])


def _pit_loss(laps_by_code: dict[str, list[Lap]]) -> float | None:
    """Seconds lost to a stop: the in-lap and out-lap against the driver's normal clean lap."""
    losses: list[float] = []
    for laps in laps_by_code.values():
        clean = [lap.time_s for lap in _clean(laps)]
        if len(clean) < 8:
            continue
        typical = statistics.median(clean)  # type: ignore[type-var]
        by_lap = {lap.lap: lap for lap in laps}
        for lap in laps:
            nxt = by_lap.get(lap.lap + 1)
            if lap.pit_in and nxt and nxt.pit_out and lap.time_s and nxt.time_s and lap.track_status == _GREEN:
                losses.append(lap.time_s + nxt.time_s - 2 * typical)
    losses = [x for x in losses if 5 < x < 45]
    return statistics.median(losses) if len(losses) >= 5 else None


def _cost(plan: list[tuple[str, int]], model: TyreModel) -> float:
    """What the tyres cost over the plan, in seconds. Constant terms (base pace, fuel) cancel between plans."""
    by = {c.compound: c for c in model.compounds}
    total = model.pit_loss_s * (len(plan) - 1)
    for compound, laps in plan:
        c = by[compound]
        total += laps * c.pace_offset_s + c.wear_s_per_lap * laps * (laps + 1) / 2  # tyre age 1..laps
    return total


def _label(plan: list[tuple[str, int]]) -> str:
    return " > ".join(f"{c} {n}" for c, n in plan)


def _plans(model: TyreModel, max_age: dict[str, float], total: int) -> list[tuple[float, list[tuple[str, int]]]]:
    compounds = [c.compound for c in model.compounds]
    plans: list[tuple[float, list[tuple[str, int]]]] = []
    for stops in (1, 2, 3):
        for seq in itertools.product(compounds, repeat=stops + 1):
            if len(set(seq)) < 2:
                continue  # the rules require two different dry compounds
            if stops == 1:
                splits = [(a,) for a in range(MIN_STINT, total - MIN_STINT + 1, STEP)]
            elif stops == 2:
                splits = [
                    (a, b)
                    for a in range(MIN_STINT, total, STEP)
                    for b in range(a + MIN_STINT, total - MIN_STINT + 1, STEP)
                ]
            else:
                splits = [
                    (a, b, c)
                    for a in range(MIN_STINT, total, 4)
                    for b in range(a + MIN_STINT, total, 4)
                    for c in range(b + MIN_STINT, total - MIN_STINT + 1, 4)
                ]
            for cuts in splits:
                edges = [0, *cuts, total]
                lengths = [edges[i + 1] - edges[i] for i in range(len(seq))]
                if any(length > max_age[c] * 1.1 for c, length in zip(seq, lengths, strict=True)):
                    continue  # longer than anyone ran that tyre: the model would be extrapolating
                plan = list(zip(seq, lengths, strict=True))
                plans.append((_cost(plan, model), plan))
    plans.sort(key=lambda p: p[0])
    return plans


def strategy_lab(
    model: TyreModel, max_age: dict[str, float], drivers: list[tuple[str, list[Stint]]], total: int
) -> list[DriverStrategy]:
    """For each driver who ran the distance on known tyres: the best alternative per stop count, if it beats theirs."""
    plans = _plans(model, max_age, total)
    if not plans:
        return []
    out: list[DriverStrategy] = []
    for code, stints in drivers:
        if not stints or any(s.compound is None or s.compound not in max_age for s in stints):
            continue
        if sum(s.laps for s in stints) < total - 1:
            continue  # did not finish the distance, or was lapped
        actual = [(s.compound, s.laps) for s in stints]  # type: ignore[misc]
        actual_cost = _cost(actual, model)
        best: dict[int, tuple[float, list[tuple[str, int]]]] = {}
        for cost, plan in plans:  # plans are sorted cheapest first
            stops = len(plan) - 1
            if stops not in best and cost < actual_cost - 0.05:
                best[stops] = (cost, plan)
        options = [
            StrategyOption(label=_label(plan), stops=stops, delta_s=round(cost - actual_cost, 1))
            for stops, (cost, plan) in sorted(best.items())
        ]
        out.append(DriverStrategy(driver_code=code, actual=_label(actual), options=options))
    return out

"""Fastest-lap car data for each driver, laid along the circuit.

For every driver we take their quickest clean lap of the race from OpenF1 (2023 onward), put the car's position and
its sensors (speed, throttle, brake, gear, RPM, DRS) on a common clock, work out how far round the lap the car was at
each moment from its position data, and resample every channel to ``N`` points evenly spaced round the lap. Those are
the same points as the circuit outline, so a point on the track maps straight to a reading. Nothing is invented: a
lap with too few samples, an impossible speed, or no movement is dropped, not repaired.
"""

from __future__ import annotations

import math
from bisect import bisect_left, bisect_right
from datetime import datetime

from .export import Publisher, dumps, write_if_changed
from .logging_setup import get_logger
from .models import TelemetryDoc, TelemetryDriver
from .sources.openf1 import OpenF1Source

log = get_logger("telemetry")
N = 240  # same as the outline
MIN_SAMPLES = 120  # about half a minute of data at ~3.7 Hz; a full lap has 300+
MAX_SPEED = 400
DRS_OPEN = {10, 12, 14}


def _seconds(rows: list[dict], start: datetime) -> list[float]:
    return [(datetime.fromisoformat(str(r["date"])) - start).total_seconds() for r in rows]


def _lerp(xs: list[float], ys: list[float], x: float) -> float:
    """Linear interpolation of ys over increasing xs, held flat outside the range."""
    if x <= xs[0]:
        return ys[0]
    if x >= xs[-1]:
        return ys[-1]
    i = bisect_right(xs, x) - 1
    span = xs[i + 1] - xs[i]
    return ys[i] if span <= 0 else ys[i] + (ys[i + 1] - ys[i]) * (x - xs[i]) / span


def _nearest(xs: list[float], ys: list[float], x: float) -> float:
    i = min(max(bisect_right(xs, x) - 1, 0), len(xs) - 1)
    if i + 1 < len(xs) and abs(xs[i + 1] - x) < abs(x - xs[i]):
        i += 1
    return ys[i]


def resample_lap(
    location: list[dict], car: list[dict], start: datetime, duration: float, n: int = N
) -> dict[str, list[int]] | None:
    """One lap's sensors at ``n`` evenly spaced points, or None when the data is not good enough.

    ``t_ms`` is scaled so the points add up to the official lap time ``duration``."""
    loc = [r for r in location if r.get("x") is not None and r.get("y") is not None and r.get("date")]
    sens = [r for r in car if r.get("speed") is not None and r.get("date")]
    if len(loc) < MIN_SAMPLES or len(sens) < MIN_SAMPLES:
        return None
    lt, ct = _seconds(loc, start), _seconds(sens, start)
    if any(b < a for a, b in zip(lt, lt[1:], strict=False)) or any(b < a for a, b in zip(ct, ct[1:], strict=False)):
        return None
    cum = [0.0]
    for a, b in zip(loc, loc[1:], strict=False):
        cum.append(cum[-1] + math.hypot(float(b["x"]) - float(a["x"]), float(b["y"]) - float(a["y"])))
    if cum[-1] <= 0:
        return None
    frac = [d / cum[-1] for d in cum]
    # The time at which the car was k/n of the way round. A car that sits still has repeated fractions: take the last.
    times: list[float] = []
    for k in range(n):
        target = k / n
        j = max(0, min(bisect_right(frac, target) - 1, len(frac) - 2))
        span = frac[j + 1] - frac[j]
        times.append(lt[j] + (lt[j + 1] - lt[j]) * ((target - frac[j]) / span if span > 0 else 0.0))
    ys = {
        "speed": [float(r["speed"]) for r in sens],
        "throttle": [float(r.get("throttle") or 0) for r in sens],
        "brake": [1.0 if (r.get("brake") or 0) > 0 else 0.0 for r in sens],
        "gear": [float(r.get("n_gear") or 0) for r in sens],
        "rpm": [float(r.get("rpm") or 0) for r in sens],
        "drs": [1.0 if (r.get("drs") or 0) in DRS_OPEN else 0.0 for r in sens],
    }
    out = {
        "speed": [round(_lerp(ct, ys["speed"], t)) for t in times],
        "throttle": [round(_lerp(ct, ys["throttle"], t)) for t in times],
        "brake": [round(_nearest(ct, ys["brake"], t)) for t in times],
        "gear": [round(_nearest(ct, ys["gear"], t)) for t in times],
        "rpm": [round(_lerp(ct, ys["rpm"], t)) for t in times],
        "drs": [round(_nearest(ct, ys["drs"], t)) for t in times],
    }
    if max(out["speed"]) > MAX_SPEED or max(out["speed"]) < 100 or min(out["speed"]) < 0:
        return None
    if max(out["throttle"]) > 100 or max(out["rpm"]) > 20000:
        return None
    # Scale the sampled clock to the official lap time so the points add up to the real lap.
    t0, span = times[0], max(lt[-1] - times[0], 1e-6)
    out["t_ms"] = [round((t - t0) / span * duration * 1000) for t in times]
    return out


def sector_fractions(t_ms: list[int], s1: float | None, s2: float | None) -> list[float] | None:
    """Where on the lap (0 to 1) sector 1 and sector 2 end, from the sector times of one lap."""
    if s1 is None or s2 is None:
        return None
    out = []
    for cut in (s1, s1 + s2):
        k = bisect_left(t_ms, cut * 1000)
        out.append(round(k / len(t_ms), 3))
    return out if 0 < out[0] < out[1] < 1 else None


def fastest_clean_lap(laps: list[dict], number: int) -> dict | None:
    mine = [
        lap for lap in laps
        if lap.get("driver_number") == number and lap.get("lap_duration") and not lap.get("is_pit_out_lap")
        and lap.get("date_start")
    ]
    return min(mine, key=lambda lap: lap["lap_duration"], default=None)


def build_race_telemetry(
    openf1: OpenF1Source, season: int, rnd: int, date: str, numbers: dict[str, int]
) -> TelemetryDoc | None:
    """Telemetry for one race. ``numbers`` maps driver code to car number."""
    key = openf1.race_session_key(season, date)
    if key is None:
        return None
    laps = openf1.session_laps(key)
    if not laps:
        return None
    drivers: list[TelemetryDriver] = []
    best: tuple[float, dict] | None = None
    for code, number in sorted(numbers.items()):
        lap = fastest_clean_lap(laps, number)
        if lap is None:
            continue
        start = datetime.fromisoformat(str(lap["date_start"]))
        duration = float(lap["lap_duration"])
        location, car = openf1.lap_samples(key, number, start, duration)
        built = resample_lap(location, car, start, duration)
        if built is None:
            log.warning("%d R%d %s: no usable telemetry for lap %s", season, rnd, code, lap.get("lap_number"))
            continue
        drivers.append(TelemetryDriver(code=code, lap=int(lap["lap_number"]), time_s=round(duration, 3), **built))
        if best is None or duration < best[0]:
            best = (duration, lap)
    if not drivers or best is None:
        return None
    fastest = next(d for d in drivers if d.time_s == round(best[0], 3))
    sectors = sector_fractions(fastest.t_ms, best[1].get("duration_sector_1"), best[1].get("duration_sector_2"))
    return TelemetryDoc(season=season, round=rnd, n=N, source="openf1", sectors=sectors, drivers=drivers)


def run_telemetry(
    publisher: Publisher, seasons: list[int], openf1: OpenF1Source | None = None, limit: int | None = None
) -> int:
    """Build telemetry for published races (2023 onward) that do not have it yet. Returns how many files were written.

    ``limit`` caps the races per run so a scheduled refresh stays quick; the newest races go first."""
    openf1 = openf1 or OpenF1Source()
    written = 0
    for season in sorted((s for s in seasons if s >= 2023), reverse=True):
        rounds = [int(p.stem.split("_")[1]) for p in (publisher.root / "seasons" / str(season)).glob("race_*.json")]
        for rnd in sorted(rounds, reverse=True):  # by round number: file names sort "9" after "21"
            if limit is not None and written >= limit:
                return written
            target = publisher.root / "telemetry" / str(season) / f"{rnd}.json"
            if target.exists():
                continue
            doc = publisher.load_race(season, rnd)
            if doc is None or not doc.drivers:
                continue
            numbers = {d.driver_code: d.driver_number for d in doc.drivers if d.driver_number is not None}
            built = build_race_telemetry(openf1, season, rnd, doc.date, numbers)
            if built is None or len(built.drivers) < 10:
                log.info("%d R%d: telemetry not available yet", season, rnd)
                continue
            if write_if_changed(target, dumps(built)):
                written += 1
                log.info("telemetry: %d R%d, %d drivers", season, rnd, len(built.drivers))
    return written

"""Circuit outlines from real position data.

For each circuit we take one clean lap (green flag, no pit stop) of the race winner from the most recent race since
2023 (OpenF1 has car positions from then on), and turn it into a closed loop of evenly spaced points. That loop is
the track map; the cars are then moved along it using the exact lap timing.
"""

from __future__ import annotations

import json
import math

from .derive import slugify
from .export import Publisher, dumps, write_if_changed
from .logging_setup import get_logger
from .models import CircuitOutline, LapDoc
from .sources.openf1 import OpenF1Source

log = get_logger("maps")
POINTS = 240
BOX = 1000
PAD = 40
MIN_SAMPLES = 120


def outline_from_samples(samples: list[tuple[float, float]], n: int = POINTS) -> tuple[list[list[int]], int] | None:
    """Resample a lap of (x, y) positions to n points evenly spaced by distance, scaled into the box.

    Also returns the lap length in metres."""
    pts: list[tuple[float, float]] = []
    for p in samples:
        if not pts or math.dist(p, pts[-1]) > 1e-6:
            pts.append(p)
    if len(pts) < MIN_SAMPLES:
        return None
    pts.append(pts[0])  # close the loop: a lap starts and ends at the line
    cumulative = [0.0]
    for a, b in zip(pts, pts[1:], strict=False):
        cumulative.append(cumulative[-1] + math.dist(a, b))
    total = cumulative[-1]
    if total <= 0:
        return None
    resampled: list[tuple[float, float]] = []
    j = 0
    for k in range(n):
        target = total * k / n
        while j < len(cumulative) - 2 and cumulative[j + 1] < target:
            j += 1
        span = cumulative[j + 1] - cumulative[j] or 1.0
        f = (target - cumulative[j]) / span
        resampled.append((pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f))
    xs, ys = [p[0] for p in resampled], [p[1] for p in resampled]
    scale = (BOX - 2 * PAD) / max(max(xs) - min(xs), max(ys) - min(ys), 1e-9)
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    # The y axis is flipped so the circuit is not mirrored on screen.
    points = [[round(BOX / 2 + (x - cx) * scale), round(BOX / 2 - (y - cy) * scale)] for x, y in resampled]
    return points, round(total / 10)  # position units are tenths of a metre


def pick_lap(doc: LapDoc, stints_by_code: dict[str, list[tuple[int, int]]], order: list[str]) -> tuple[str, int] | None:
    """A representative lap: green flag, not around a pit stop, from the front-runners, early in the race."""
    for code in order:
        driver = next((d for d in doc.drivers if d.code == code), None)
        if driver is None:
            continue
        pits = {lap for _, end in stints_by_code.get(code, [])[:-1] for lap in (end, end + 1)}
        start = max(2, doc.laps // 4)
        for lap in range(start, min(doc.laps, start + 25)):
            if doc.status[lap - 1] == "G" and lap not in pits and driver.lap_times[lap - 1] is not None:
                return code, lap
    return None


def build_outlines(publisher: Publisher, openf1: OpenF1Source | None = None) -> int:
    """Draw every circuit that has a race since 2023 and no outline yet. Needs the network; results are cached."""
    openf1 = openf1 or OpenF1Source()
    path = publisher.root / "circuits" / "outlines.json"
    done: dict[str, dict] = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    added = 0
    for season in sorted((s for s in publisher.published_seasons() if s >= 2023), reverse=True):
        for race_path in sorted((publisher.root / "seasons" / str(season)).glob("race_*.json"), reverse=True):
            rnd = int(race_path.stem.split("_")[1])
            doc = publisher.load_race(season, rnd)
            if doc is None or not doc.drivers:
                continue
            slug = slugify(doc.location)
            laps_path = publisher.root / "laps" / str(season) / f"{rnd}.json"
            if slug in done or not laps_path.exists():
                continue
            lap_doc = LapDoc.model_validate_json(laps_path.read_text(encoding="utf-8"))
            order = [d.driver_code for d in sorted(doc.drivers, key=lambda d: d.finish or 99)]
            stints = {d.driver_code: [(s.lap_start, s.lap_end) for s in (d.stints or [])] for d in doc.drivers}
            pick = pick_lap(lap_doc, stints, order)
            number = next((d.driver_number for d in doc.drivers if pick and d.driver_code == pick[0]), None)
            if pick is None or number is None:
                continue
            key = openf1.race_session_key(season, doc.date)
            if key is None:
                continue
            built = outline_from_samples(openf1.lap_positions(key, number, pick[1]))
            if built is None:
                log.warning("%s %d R%d: no usable position data for lap %d", slug, season, rnd, pick[1])
                continue
            points, length = built
            done[slug] = CircuitOutline(points=points, length_m=length, source=f"{season} R{rnd}").model_dump(
                mode="json"
            )
            added += 1
            log.info("outline: %s from %d R%d (%d m)", slug, season, rnd, length)
    write_if_changed(path, dumps(done))
    return added

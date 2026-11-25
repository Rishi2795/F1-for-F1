"""Qualifying and sprint results, added to published races without rebuilding them.

Kept separate from the race build on purpose: the build works offline from cached lap data, while this needs
Jolpica. Running it never lowers a race's data quality; it only fills fields that were empty.
"""

from __future__ import annotations

from .export import Publisher, dumps, write_if_changed
from .logging_setup import get_logger
from .models import DriverRace, RaceDoc
from .sources.jolpica import QualiRow, SprintRow

log = get_logger("extras")


def apply_qualifying(doc: RaceDoc, rows: list[QualiRow]) -> RaceDoc:
    """Attach each driver's qualifying position and how far off the pole lap they were."""
    # Upstream occasionally lists two drivers in the same position; a tie is broken by the faster best lap.
    ranked = sorted(
        rows, key=lambda r: (r.position if r.position is not None else 99, r.best_s if r.best_s is not None else 1e9)
    )
    unique = {r.code: i + 1 for i, r in enumerate(ranked) if r.position is not None}
    by_code = {r.code: r for r in rows}
    pole = min((r.best_s for r in rows if r.best_s is not None), default=None)
    drivers: list[DriverRace] = []
    for d in doc.drivers:
        q = by_code.get(d.driver_code)
        gap = round((q.best_s / pole - 1) * 100, 3) if q and q.best_s is not None and pole else None
        drivers.append(d.model_copy(update={"quali_position": unique.get(q.code) if q else None, "quali_gap_pct": gap}))
    return doc.model_copy(update={"drivers": drivers})


def apply_sprint(doc: RaceDoc, rows: list[SprintRow]) -> RaceDoc:
    by_code = {r.code: r for r in rows}
    drivers = [
        d.model_copy(
            update={
                "sprint_position": by_code[d.driver_code].position if d.driver_code in by_code else None,
                "sprint_points": by_code[d.driver_code].points if d.driver_code in by_code else None,
            }
        )
        for d in doc.drivers
    ]
    return doc.model_copy(update={"drivers": drivers})


def write_grid(publisher: Publisher, season: int, rnd: int, rows: list[QualiRow]) -> None:
    """The starting grid of a race that has not been run yet: what the post-qualifying forecast reads."""
    pole = min((r.best_s for r in rows if r.best_s is not None), default=None)
    ordered = sorted(rows, key=lambda r: (r.position if r.position is not None else 99, r.best_s or 1e9))
    grid = [
        {
            "code": r.code,
            "position": i + 1,
            "gap_pct": round((r.best_s / pole - 1) * 100, 3) if r.best_s is not None and pole else None,
        }
        for i, r in enumerate(ordered)
    ]
    document = dumps({"season": season, "round": rnd, "grid": grid})
    write_if_changed(publisher.root / "grids" / f"{season}_{rnd}.json", document)
    log.info("%d R%d: qualifying is in, race to come: grid saved", season, rnd)


def enrich_season(
    publisher: Publisher, season: int, quali: dict[int, list[QualiRow]], sprint: dict[int, list[SprintRow]]
) -> int:
    changed = 0
    for rnd in sorted(set(quali) | set(sprint)):
        doc = publisher.load_race(season, rnd)
        if doc is None or not doc.drivers:
            if rnd in quali and quali[rnd]:
                write_grid(publisher, season, rnd, quali[rnd])
            continue
        new = apply_qualifying(doc, quali[rnd]) if rnd in quali else doc
        if rnd in sprint:
            new = apply_sprint(new, sprint[rnd])
        if publisher.write_race(new):
            changed += 1
    log.info(
        "season %d: qualifying for %d rounds, sprints for %d; %d race file(s) updated",
        season, len(quali), len(sprint), changed,
    )
    return changed

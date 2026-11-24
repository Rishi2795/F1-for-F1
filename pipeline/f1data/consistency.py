"""Season-wide clean-up that needs more than one race at a time."""

from __future__ import annotations

from collections import Counter

from .export import Publisher
from .logging_setup import get_logger

log = get_logger("consistency")


def fill_team_colors(publisher: Publisher, season: int) -> int:
    """Give every driver a team colour.

    A few races have no driver file in the lap archive, so their drivers have no colour. A team's colour does
    not change within a season: use the most common colour that team has in the season's other races.
    Returns how many driver entries were filled.
    """
    docs = {}
    for path in sorted((publisher.root / "seasons" / str(season)).glob("race_*.json")):
        rnd = int(path.stem.split("_")[1])
        doc = publisher.load_race(season, rnd)
        if doc:
            docs[rnd] = doc
    palette: dict[str, Counter[str]] = {}
    for doc in docs.values():
        for drv in doc.drivers:
            if drv.team_color:
                palette.setdefault(drv.team, Counter())[drv.team_color] += 1
    filled = 0
    for doc in docs.values():
        changed = False
        for drv in doc.drivers:
            if not drv.team_color and drv.team in palette:
                drv.team_color = palette[drv.team].most_common(1)[0][0]
                filled += 1
                changed = True
        if changed:
            publisher.write_race(doc)
    if filled:
        log.info("season %d: filled %d missing team colours from the team's other races", season, filled)
    return filled

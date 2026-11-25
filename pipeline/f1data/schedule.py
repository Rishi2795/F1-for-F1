"""The weekend timetable (practice, qualifying, sprint, race) for each round, merged into the season's race index."""

from __future__ import annotations

from .errors import F1DataError
from .export import Publisher
from .logging_setup import get_logger
from .models import WeekendSession
from .sources.jolpica import JolpicaSource

log = get_logger("schedule")


def refresh_sessions(publisher: Publisher, jolpica: JolpicaSource, season: int, *, ttl: float | None = None) -> int:
    """Add each round's session times to races.json. Nothing else in the index is touched. Returns rounds updated."""
    index = publisher.load_index(season)
    if index is None:
        return 0
    try:
        timetable = jolpica.weekend_sessions(season, ttl=ttl)
    except F1DataError as exc:
        log.warning("%d: session times unavailable (%s): keeping what is published", season, exc)
        return 0
    changed = 0
    for entry in index.races:
        rows = timetable.get(entry.round)
        if not rows:
            continue
        sessions = [WeekendSession(name=n, starts=t) for n, t in rows]
        if entry.sessions != sessions:
            entry.sessions = sessions
            changed += 1
    if changed:
        publisher.publish_index(index)
    return changed

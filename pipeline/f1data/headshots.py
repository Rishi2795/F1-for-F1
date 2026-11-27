"""Links to the official driver portraits.

OpenF1 lists, for each driver of a session, the address of the portrait Formula 1 publishes on formula1.com: a standard
studio shot in team kit on a transparent background. We record only the *address* (never the picture), so the site shows
the image straight from Formula 1's server. The pictures belong to Formula 1; the site credits them and can switch them
off (VITE_DRIVER_HEADSHOTS=off). Only https links on Formula 1's own hosts are accepted.
"""

from __future__ import annotations

import json
from collections.abc import Iterable
from datetime import UTC, datetime
from urllib.parse import urlparse

from .errors import F1DataError
from .export import Publisher, dumps, write_if_changed
from .logging_setup import get_logger
from .sources.openf1 import OpenF1Source

log = get_logger("headshots")
HOSTS = ("media.formula1.com", "www.formula1.com")  # both are Formula 1's own; the older portraits are served from www
FIRST_SEASON = 2023  # OpenF1 has drivers from here; earlier drivers simply have no portrait


def acceptable(url: object) -> bool:
    """An https link to a png on one of F1's own hosts, and nothing else."""
    if not isinstance(url, str):
        return False
    u = urlparse(url)
    return u.scheme == "https" and u.hostname in HOSTS and u.path.lower().endswith(".png")


def collect(openf1: OpenF1Source, today: datetime | None = None, wanted: Iterable[str] = ()) -> dict[str, str]:
    """code -> portrait link, newest season last so a driver's current portrait wins.

    The season sweep only looks at each season's last session, so a driver who left mid-season (or raced only part of a
    year) is missed by it. Every code in `wanted` that is still without a portrait is therefore asked for by name,
    across all sessions.
    """
    now = (today or datetime.now(UTC)).date().isoformat()
    found: dict[str, str] = {}
    for season in range(FIRST_SEASON, (today or datetime.now(UTC)).year + 1):
        past = [r for r in openf1.race_sessions(season) if str(r.get("date_start", ""))[:10] <= now]
        if not past:
            continue
        for d in openf1.session_drivers(int(past[-1]["session_key"])):
            code, url = str(d.get("name_acronym") or "").upper(), d.get("headshot_url")
            if len(code) == 3 and acceptable(url):
                found[code] = url  # type: ignore[assignment]
    for code in sorted({str(c).upper() for c in wanted} - set(found)):
        for record in reversed(openf1.driver_records(code)):  # newest record first
            if acceptable(record.get("headshot_url")):
                found[code] = record["headshot_url"]
                break
    return found


def _published_codes(publisher: Publisher) -> list[str]:
    path = publisher.root / "drivers" / "index.json"
    try:
        return [str(d["code"]) for d in json.loads(path.read_text(encoding="utf-8"))]
    except (OSError, ValueError, KeyError, TypeError):
        return []


def refresh_headshots(publisher: Publisher, openf1: OpenF1Source | None = None) -> int:
    """Write drivers/headshots.json. A source outage keeps what is already published."""
    try:
        found = collect(openf1 or OpenF1Source(), wanted=_published_codes(publisher))
    except F1DataError as exc:
        log.warning("headshots unavailable (%s): keeping the published list", exc)
        return 0
    if not found:
        return 0
    doc = {"source": "openf1", "owner": "Formula 1", "headshots": dict(sorted(found.items()))}
    write_if_changed(publisher.root / "drivers" / "headshots.json", dumps(doc))
    log.info("headshots: %d drivers", len(found))
    return len(found)

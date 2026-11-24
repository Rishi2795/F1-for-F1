"""Coverage matrix: for every expected race, which kinds of data we actually have."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from .models import RaceDoc

RANK = {"scheduled": 0, "missing": 0, "partial": 1, "ok": 2}


def _kind(doc: RaceDoc | None, kind: str) -> str:
    if doc is None or not doc.drivers:
        return "missing"
    missing = " ".join(doc.quality.missing)
    sources = doc.quality.sources
    if kind == "results":
        return "ok"
    if kind == "laps":
        if sources.get("laps") == "none":
            return "missing"
        return "partial" if "laps(some" in missing else "ok"
    if kind == "stints":
        if sources.get("stints") == "none":
            return "missing"
        return "partial" if "compound" in missing or "laps(some" in missing else "ok"
    if kind == "weather":
        return "missing" if doc.weather is None else "ok"
    return "missing"


def race_row(season: int, rnd: int, event_name: str, status: str, doc: RaceDoc | None) -> dict[str, Any]:
    return {
        "round": rnd,
        "event_name": event_name,
        "status": status,
        "results": _kind(doc, "results"),
        "laps": _kind(doc, "laps"),
        "stints": _kind(doc, "stints"),
        "weather": _kind(doc, "weather"),
        "missing": list(doc.quality.missing) if doc else ["results"],
        "warnings": len(doc.quality.warnings) if doc else 0,
    }


def season_block(rows: list[dict[str, Any]]) -> dict[str, Any]:
    counts = {"ok": 0, "partial": 0, "missing": 0, "scheduled": 0}
    for row in rows:
        counts[row["status"]] += 1
    played = counts["ok"] + counts["partial"] + counts["missing"]
    return {"expected_rounds": len(rows), "played": played, **counts, "races": rows}


def build_coverage(blocks: dict[int, dict[str, Any]]) -> dict[str, Any]:
    return {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "seasons": {str(season): block for season, block in sorted(blocks.items())},
    }


def regressions(previous: dict[str, Any] | None, current: dict[str, Any]) -> list[dict[str, Any]]:
    """Races whose status got worse than the last published coverage."""
    if not previous:
        return []
    found: list[dict[str, Any]] = []
    for season, block in current.get("seasons", {}).items():
        old_rows = {r["round"]: r for r in previous.get("seasons", {}).get(season, {}).get("races", [])}
        for row in block["races"]:
            old = old_rows.get(row["round"])
            if old and RANK[row["status"]] < RANK[old["status"]]:
                found.append(
                    {"season": int(season), "round": row["round"], "from": old["status"], "to": row["status"]}
                )
    return found

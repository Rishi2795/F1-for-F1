"""Write the rating files the website reads."""

from __future__ import annotations

from ..export import Publisher, dumps, write_if_changed
from ..models import RatingEntry, RatingHistory, RatingsCurrent


def _latest_colors(publisher: Publisher, codes: set[str], season: int, round_number: int) -> dict[str, str]:
    """Each driver's team colour from the most recent published race they appear in (searching back)."""
    found: dict[str, str] = {}
    for year in sorted((s for s in publisher.published_seasons() if s <= season), reverse=True):
        last = round_number if year == season else 99
        for rnd in range(last, 0, -1):
            doc = publisher.load_race(year, rnd)
            if doc is None:
                continue
            for drv in doc.drivers:
                if drv.driver_code in codes and drv.team_color and drv.driver_code not in found:
                    found[drv.driver_code] = drv.team_color
            if codes <= found.keys():
                return found
    return found


def publish_ratings(publisher: Publisher, report: dict) -> int:
    """Publish current ratings, the model card and per-driver history. Returns how many drivers were rated."""
    card = report["card"]
    season, round_number = card["as_of"]["season"], card["as_of"]["round"]
    colors = _latest_colors(publisher, {row["code"] for row in report["current"]}, season, round_number)
    current = RatingsCurrent(
        version=card["version"],
        season=season,
        round=round_number,
        ratings=[RatingEntry(**row, team_color=colors.get(row["code"])) for row in report["current"]],
    )
    root = publisher.root / "ratings"
    write_if_changed(root / "current.json", dumps(current))
    write_if_changed(root / "model.json", dumps(card))
    for row in current.ratings:
        history = RatingHistory(code=row.code, history=report["history"].get(row.code, []))
        write_if_changed(root / "history" / f"{row.code}.json", dumps(history))
    return len(current.ratings)

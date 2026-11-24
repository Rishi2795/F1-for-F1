"""Write the rating files the website reads."""

from __future__ import annotations

from ..export import Publisher, dumps, write_if_changed
from ..models import RatingEntry, RatingHistory, RatingsCurrent


def publish_ratings(publisher: Publisher, report: dict) -> int:
    """Publish current ratings, the model card and per-driver history. Returns how many drivers were rated."""
    card = report["card"]
    current = RatingsCurrent(
        version=card["version"],
        season=card["as_of"]["season"],
        round=card["as_of"]["round"],
        ratings=[RatingEntry(**row) for row in report["current"]],
    )
    root = publisher.root / "ratings"
    write_if_changed(root / "current.json", dumps(current))
    write_if_changed(root / "model.json", dumps(card))
    for row in current.ratings:
        history = RatingHistory(code=row.code, history=report["history"].get(row.code, []))
        write_if_changed(root / "history" / f"{row.code}.json", dumps(history))
    return len(current.ratings)

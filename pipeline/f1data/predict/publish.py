"""Write the forecast files the website reads."""

from __future__ import annotations

from ..export import Publisher, dumps, write_if_changed


def publish_forecasts(publisher: Publisher, built: dict) -> dict[str, int]:
    root = publisher.root / "predictions"
    next_doc, title, review, card = built["next"], built["title"], built["review"], built["card"]
    write_if_changed(root / "next.json", dumps(next_doc))
    if title is not None:
        write_if_changed(root / "championship.json", dumps(title))
    write_if_changed(root / "review.json", dumps([r.model_dump(mode="json") for r in review]))
    write_if_changed(root / "model.json", dumps(card))
    return {"races": len(next_doc.races), "title_drivers": len(title.drivers) if title else 0}

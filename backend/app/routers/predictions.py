"""Race and championship forecasts (published by the pipeline's forecast model)."""

from __future__ import annotations

from app.core.deps import get_store, json_response, not_available
from app.core.store import PublishedStore
from fastapi import APIRouter, Depends, Request

router = APIRouter(prefix="/predictions", tags=["predictions"])

_FILES = {
    "next": ("next.json", "Race forecasts", "Win, podium and points chances for each race still to come."),
    "championship": ("championship.json", "Championship forecast", "Title odds for drivers and constructors."),
    "review": ("review.json", "Forecast track record", "What the model said before recent races vs what happened."),
    "model": ("model.json", "Forecast model card", "How the forecasts are built and how accurate they were."),
}


def _serve(name: str):
    filename, label, doc = _FILES[name]

    def endpoint(request: Request, store: PublishedStore = Depends(get_store)):
        blob = store.get("predictions", filename)
        if blob is None:
            raise not_available(label)
        return json_response(request, blob)

    endpoint.__doc__ = doc
    endpoint.__name__ = f"forecast_{name}"
    return endpoint


for _name in _FILES:
    router.add_api_route(f"/{_name}", _serve(_name), methods=["GET", "HEAD"])

"""Driver and car ratings (published by the pipeline's rating model)."""

from __future__ import annotations

from typing import Annotated

from app.core.deps import get_store, json_response, not_available
from app.core.store import PublishedStore
from fastapi import APIRouter, Depends, Path, Request

router = APIRouter(prefix="/ratings", tags=["ratings"])

Code = Annotated[str, Path(pattern=r"^[A-Za-z]{3}$", description="Three-letter driver code")]


@router.api_route("", methods=["GET", "HEAD"])
def current(request: Request, store: PublishedStore = Depends(get_store)):
    """Current rating of every driver who raced in the latest season, best first."""
    blob = store.get("ratings", "current.json")
    if blob is None:
        raise not_available("Ratings")
    return json_response(request, blob)


@router.api_route("/model", methods=["GET", "HEAD"])
def model_card(request: Request, store: PublishedStore = Depends(get_store)):
    """How the ratings are built and how accurate they are on seasons the model never saw."""
    blob = store.get("ratings", "model.json")
    if blob is None:
        raise not_available("Model card")
    return json_response(request, blob)


@router.api_route("/{code}", methods=["GET", "HEAD"])
def history(request: Request, code: Code, store: PublishedStore = Depends(get_store)):
    """One driver's rating after every race: [season, round, driver rating, car rating]."""
    blob = store.get("ratings", "history", f"{code.upper()}.json")
    if blob is None:
        raise not_available(f"Rating history for {code.upper()}")
    return json_response(request, blob)

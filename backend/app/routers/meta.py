"""Health, data coverage and bundle metadata."""

from __future__ import annotations

from app.core.deps import get_store, json_response, not_available
from app.core.store import PublishedStore
from fastapi import APIRouter, Depends, Request

router = APIRouter(tags=["meta"])


@router.api_route("/coverage", methods=["GET", "HEAD"])
def coverage(request: Request, store: PublishedStore = Depends(get_store)):
    blob = store.get("coverage.json")
    if blob is None:
        raise not_available("Coverage report")
    return json_response(request, blob)


@router.api_route("/meta", methods=["GET", "HEAD"])
def meta(request: Request, store: PublishedStore = Depends(get_store)):
    blob = store.get("manifest.json")
    if blob is None:
        raise not_available("Bundle manifest")
    return json_response(request, blob)


@router.api_route("/news", methods=["GET", "HEAD"])
def news(request: Request, store: PublishedStore = Depends(get_store)):
    """Motorsport headlines that link back to the publishers: teasers only, never article text or pictures."""
    blob = store.get("news.json")
    if blob is None:
        raise not_available("News")
    return json_response(request, blob)


@router.api_route("/simulator/model", methods=["GET", "HEAD"])
def simulator_model(request: Request, store: PublishedStore = Depends(get_store)):
    """The strategy simulator's fitted model: tyres, fuel, heat and rain per circuit, and car and driver pace."""
    blob = store.get("simulator/model.json")
    if blob is None:
        raise not_available("Simulator model")
    return json_response(request, blob)

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

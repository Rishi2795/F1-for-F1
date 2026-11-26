"""Circuit profiles: what has happened at each track since 2020."""

from __future__ import annotations

from typing import Annotated

from app.core.deps import get_store, json_response, not_available
from app.core.store import PublishedStore
from fastapi import APIRouter, Depends, Path, Request

router = APIRouter(prefix="/circuits", tags=["circuits"])

Slug = Annotated[str, Path(pattern=r"^[a-z0-9-]{2,60}$", description="Circuit slug, e.g. monte-carlo")]


@router.api_route("", methods=["GET", "HEAD"])
def index(request: Request, store: PublishedStore = Depends(get_store)):
    """Every circuit raced since 2020, with its average excitement score."""
    blob = store.get("circuits", "index.json")
    if blob is None:
        raise not_available("Circuits")
    return json_response(request, blob)


@router.api_route("/{slug}", methods=["GET", "HEAD"])
def profile(request: Request, slug: Slug, store: PublishedStore = Depends(get_store)):
    blob = store.get("circuits", f"{slug}.json")
    if blob is None:
        raise not_available(f"Circuit {slug}")
    return json_response(request, blob)

"""Driver endpoints (aggregated from published races)."""

from __future__ import annotations

from typing import Annotated

from app.core.deps import get_store, json_response, not_available
from app.core.errors import ApiError
from app.core.store import PublishedStore
from fastapi import APIRouter, Depends, Path, Request

router = APIRouter(tags=["drivers"])

Code = Annotated[str, Path(pattern=r"^[A-Za-z]{3}$", description="Three-letter driver code")]


@router.api_route("/drivers", methods=["GET", "HEAD"])
def list_drivers(request: Request, store: PublishedStore = Depends(get_store)):
    blob = store.get("drivers", "index.json")
    if blob is None:
        raise not_available("Driver list")
    return json_response(request, blob)


@router.api_route("/drivers/{code}", methods=["GET", "HEAD"])
def get_driver(request: Request, code: Code, store: PublishedStore = Depends(get_store)):
    blob = store.get("drivers", f"{code.upper()}.json")
    if blob is None:
        raise not_available(f"Driver {code.upper()}")
    return json_response(request, blob)


@router.api_route("/drivers/{code}/dna", methods=["GET", "HEAD"])
def get_driver_dna(code: Code):
    raise ApiError(404, "not_available", "Driver DNA ships with the ratings model (planned).", feature="driver_dna")


@router.api_route("/ai/driver/{code}", methods=["GET", "HEAD"])
def get_driver_insight(code: Code):
    raise ApiError(404, "not_available", "Driver insights ship with the ratings model (planned).", feature="driver_ai")

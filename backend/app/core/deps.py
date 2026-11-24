"""Shared FastAPI dependencies and response helpers."""

from __future__ import annotations

from fastapi import Request
from fastapi.responses import Response

from app.core.errors import ApiError
from app.core.store import Blob, PublishedStore

CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600"


def get_store(request: Request) -> PublishedStore:
    return request.app.state.store


def json_response(request: Request, blob: Blob) -> Response:
    """Serve pre-built JSON bytes with ETag / conditional GET support."""
    headers = {"ETag": blob.etag, "Cache-Control": CACHE_CONTROL}
    if request.headers.get("if-none-match") == blob.etag:
        return Response(status_code=304, headers=headers)
    return Response(content=blob.content, media_type="application/json", headers=headers)


def not_available(what: str) -> ApiError:
    return ApiError(404, "not_available", f"{what} is not available.")

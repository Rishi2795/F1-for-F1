"""Shared FastAPI dependencies and response helpers."""

from __future__ import annotations

from fastapi import Request
from fastapi.responses import Response

from app.core.errors import ApiError
from app.core.store import Blob, PublishedStore

CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600"


def get_store(request: Request) -> PublishedStore:
    return request.app.state.store


def etag_matches(if_none_match: str | None, etag: str) -> bool:
    """RFC 9110 weak comparison for If-None-Match: `*`, a list of tags, and W/ prefixes all count.

    Proxies and CDNs (Render's included) often turn a strong ETag into a weak one when they compress
    the response, so an exact string comparison never matches and clients re-download every time.
    """
    if not if_none_match:
        return False
    if if_none_match.strip() == "*":
        return True
    wanted = etag.removeprefix("W/")
    return any(tag.strip().removeprefix("W/") == wanted for tag in if_none_match.split(","))


def json_response(request: Request, blob: Blob) -> Response:
    """Serve pre-built JSON bytes with ETag / conditional GET support."""
    headers = {"ETag": blob.etag, "Cache-Control": CACHE_CONTROL}
    if etag_matches(request.headers.get("if-none-match"), blob.etag):
        return Response(status_code=304, headers=headers)
    return Response(content=blob.content, media_type="application/json", headers=headers)


def not_available(what: str) -> ApiError:
    return ApiError(404, "not_available", f"{what} is not available.")

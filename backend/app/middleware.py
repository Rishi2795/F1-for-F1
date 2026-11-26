"""Request id, structured access log, security headers and a small rate limiter."""

from __future__ import annotations

import hashlib
import hmac
import logging
import re
import secrets
import time
import uuid
from collections import deque

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

log = logging.getLogger("app.access")
_REQUEST_ID = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
_MAX_TRACKED_CLIENTS = 10_000


class RateLimiter:
    """Sliding one-minute window per client. In-memory: fine for a single stateless instance."""

    def __init__(self, per_minute: int) -> None:
        self.per_minute = per_minute
        self._hits: dict[str, deque[float]] = {}

    def check(self, key: str, now: float | None = None) -> float | None:
        """Return None if allowed, else seconds until the client may retry."""
        if self.per_minute <= 0:
            return None
        now = time.monotonic() if now is None else now
        if len(self._hits) > _MAX_TRACKED_CLIENTS:
            self._hits = {k: v for k, v in self._hits.items() if v and now - v[-1] < 60}
        window = self._hits.setdefault(key, deque())
        while window and now - window[0] >= 60:
            window.popleft()
        if len(window) >= self.per_minute:
            return max(1.0, 60 - (now - window[0]))
        window.append(now)
        return None


class RequestContextMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,  # noqa: ANN001
        *,
        is_production: bool,
        per_minute: int,
        ip_salt: str | None,
        docs_enabled: bool,
        trust_proxy: bool = False,
    ) -> None:
        super().__init__(app)
        self.trust_proxy = trust_proxy
        self.is_production = is_production
        self.limiter = RateLimiter(per_minute)
        self.salt = (ip_salt or secrets.token_hex(16)).encode()
        self.docs_enabled = docs_enabled

    def _client_hash(self, request: Request) -> str:
        host = request.client.host if request.client else "unknown"
        if self.trust_proxy:
            # The proxy appends the real peer address last, so the right-most entry is the one
            # we can trust; anything a client put earlier in the header is ignored.
            forwarded = request.headers.get("x-forwarded-for", "").split(",")[-1].strip()
            host = forwarded or host
        return hmac.new(self.salt, host.encode(), hashlib.sha256).hexdigest()[:10]

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        incoming = request.headers.get("x-request-id", "")
        request_id = incoming if _REQUEST_ID.match(incoming) else uuid.uuid4().hex
        request.state.request_id = request_id
        client = self._client_hash(request)
        started = time.perf_counter()

        retry_after = None if request.url.path == "/health" else self.limiter.check(client)
        if retry_after is not None:
            response: Response = JSONResponse(
                {"error": "rate_limited", "message": "Too many requests.", "request_id": request_id},
                status_code=429,
                headers={"Retry-After": str(int(retry_after))},
            )
        else:
            try:
                response = await call_next(request)
            except Exception:
                log.exception("unhandled error", extra={"ctx": {"request_id": request_id, "path": request.url.path}})
                response = JSONResponse(
                    {"error": "internal_error", "message": "Something went wrong.", "request_id": request_id},
                    status_code=500,
                )

        self._decorate(request, response, request_id)
        route = request.scope.get("route")
        duration_ms = round((time.perf_counter() - started) * 1000, 1)
        level = logging.WARNING if response.status_code >= 500 else logging.INFO
        log.log(
            level,
            "request",
            extra={"ctx": {
                "request_id": request_id,
                "method": request.method,
                "route": getattr(route, "path", "unmatched"),
                "status": response.status_code,
                "duration_ms": duration_ms,
                "bytes": response.headers.get("content-length"),
                "client": client,
                "legacy_path": _is_legacy_path(request.url.path),
            }},
        )
        return response

    def _decorate(self, request: Request, response: Response, request_id: str) -> None:
        h = response.headers
        h["X-Request-ID"] = request_id
        h["X-Content-Type-Options"] = "nosniff"
        h["Referrer-Policy"] = "no-referrer"
        h["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if not (self.docs_enabled and request.url.path.startswith(("/docs", "/redoc", "/openapi"))):
            h["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        if self.is_production:
            h["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        if _is_legacy_path(request.url.path):
            # Root-level routes only exist for the old frontend base URL; flag them for removal.
            h["Deprecation"] = "true"


def _is_legacy_path(path: str) -> bool:
    """Root-level (no /api) data routes exist only for old frontend builds; logged so we know when to delete them."""
    return not path.startswith(("/api", "/docs", "/openapi")) and path not in ("/", "/health")

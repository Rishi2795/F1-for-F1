"""F1 for F1 API: a small, read-only service over precomputed, validated data.

No upstream (FastF1, Jolpica, ...) is ever called at request time; the pipeline publishes
JSON files and this app serves them. See plan.md.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import Settings, get_settings
from app.core.errors import install_error_handlers
from app.core.logging_setup import setup_logging
from app.core.store import PublishedStore
from app.middleware import RequestContextMiddleware
from app.routers import drivers, meta, seasons

log = logging.getLogger("app")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    setup_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        store: PublishedStore = app.state.store
        log.info(
            "api starting",
            extra={"ctx": {"env": settings.env, "seasons": store.seasons(), "docs": settings.docs_enabled}},
        )
        if settings.fallback_origin_regex:
            log.warning("ALLOWED_ORIGINS is not set; allowing localhost and *.vercel.app. Set it in production.")
        yield

    app = FastAPI(
        title="F1 for F1 API",
        description="Read-only Formula 1 strategy analytics over precomputed data.",
        version="2.0.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.docs_enabled else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.docs_enabled else None,
    )
    app.state.store = PublishedStore(settings.data_dir)
    install_error_handlers(app)

    # Middleware runs bottom-to-top: CORS outermost so even errors carry CORS headers.
    app.add_middleware(GZipMiddleware, minimum_size=500)
    app.add_middleware(
        RequestContextMiddleware,
        is_production=settings.is_production,
        per_minute=settings.rate_limit_per_minute,
        ip_salt=settings.log_ip_salt,
        docs_enabled=settings.docs_enabled,
        trust_proxy=settings.trust_proxy,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_origin_regex=settings.fallback_origin_regex,
        allow_credentials=False,
        allow_methods=["GET", "HEAD", "OPTIONS"],
        allow_headers=["Content-Type", "If-None-Match", "X-Request-ID"],
        expose_headers=["ETag", "X-Request-ID"],
        max_age=3600,
    )

    @app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
    def root():
        return {"status": "online", "service": "f1-for-f1-api"}

    @app.api_route("/health", methods=["GET", "HEAD"], include_in_schema=False)
    def health():
        store: PublishedStore = app.state.store
        seasons_available = store.seasons()
        return {"status": "ok" if seasons_available else "degraded", "seasons": seasons_available}

    for router in (seasons.router, drivers.router, meta.router):
        app.include_router(router, prefix="/api")
        # Old frontend builds used a base URL without /api; keep until Vercel env is confirmed.
        app.include_router(router, include_in_schema=False)
    return app


app = create_app()

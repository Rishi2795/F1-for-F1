"""Runtime settings, read from environment variables. No secrets are needed or stored."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

_DEV_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
)


def _csv(name: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, "").split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    env: str
    data_dir: Path
    log_level: str
    allowed_origins: tuple[str, ...]
    # Used only when ALLOWED_ORIGINS is unset, so an unconfigured deploy keeps working.
    fallback_origin_regex: str | None
    docs_enabled: bool
    rate_limit_per_minute: int
    log_ip_salt: str | None
    # True only when exactly one trusted reverse proxy (e.g. Render) sits in front of the app.
    trust_proxy: bool

    @property
    def is_production(self) -> bool:
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    env = os.getenv("APP_ENV", "development").lower()
    explicit = tuple(_csv("ALLOWED_ORIGINS"))
    default_data = Path(__file__).resolve().parents[2] / "data" / "published"
    return Settings(
        env=env,
        data_dir=Path(os.getenv("DATA_DIR", default_data)),
        log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
        allowed_origins=explicit or _DEV_ORIGINS,
        fallback_origin_regex=None if explicit else r"https://.*\.vercel\.app",
        docs_enabled=os.getenv("DOCS_ENABLED", "false" if env == "production" else "true").lower() == "true",
        rate_limit_per_minute=int(os.getenv("RATE_LIMIT_PER_MINUTE", "240")),
        log_ip_salt=os.getenv("LOG_IP_SALT"),
        trust_proxy=os.getenv("TRUST_PROXY", "false").lower() == "true",
    )

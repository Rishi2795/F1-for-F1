"""The single HTTP client every JSON source uses: throttle, retry, timeout, disk cache."""

from __future__ import annotations

import hashlib
import json
import os
import random
import time
from pathlib import Path
from typing import Any

import requests

from . import config
from .errors import SourceFormatError, SourceUnavailable
from .logging_setup import get_logger

log = get_logger("http")

_RETRY_STATUS = {429, 500, 502, 503, 504}


class HttpClient:
    """Polite client for free community APIs. Historical responses are cached forever."""

    def __init__(
        self,
        source: str,
        base_url: str,
        *,
        min_interval: float = 0.6,
        timeout: float = 30.0,
        max_retries: int = 5,
        cache_dir: Path | None = None,
    ) -> None:
        self.source = source
        self.base_url = base_url.rstrip("/")
        self.min_interval = min_interval
        self.timeout = timeout
        self.max_retries = max_retries
        self.cache_dir = (cache_dir or config.CACHE_DIR) / "http" / source
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": config.USER_AGENT, "Accept": "application/json"})
        self._last_request = 0.0

    # -- cache -----------------------------------------------------------------
    def _cache_path(self, url: str, params: dict[str, Any] | None) -> Path:
        key = json.dumps([url, sorted((params or {}).items())], sort_keys=True)
        return self.cache_dir / f"{hashlib.sha256(key.encode()).hexdigest()[:32]}.json"

    def _read_cache(self, path: Path, ttl: float | None) -> Any | None:
        if not path.exists():
            return None
        if ttl is not None and time.time() - path.stat().st_mtime > ttl:
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            log.warning("discarding unreadable cache entry %s", path.name)
            return None

    # -- request ---------------------------------------------------------------
    def get_json(
        self,
        path: str,
        params: dict[str, Any] | None = None,
        *,
        ttl: float | None = None,
        refresh: bool = False,
    ) -> Any:
        url = f"{self.base_url}/{path.lstrip('/')}"
        cache_path = self._cache_path(url, params)
        if not refresh:
            cached = self._read_cache(cache_path, ttl)
            if cached is not None:
                return cached

        last_error: str = "unknown"
        for attempt in range(1, self.max_retries + 1):
            wait = self.min_interval - (time.monotonic() - self._last_request)
            if wait > 0:
                time.sleep(wait)
            self._last_request = time.monotonic()
            try:
                response = self._session.get(url, params=params, timeout=self.timeout)
            except requests.RequestException as exc:
                last_error = type(exc).__name__
                log.warning("%s request failed (%s), attempt %d/%d", self.source, last_error, attempt, self.max_retries)
            else:
                if response.status_code in _RETRY_STATUS:
                    last_error = f"HTTP {response.status_code}"
                    if response.status_code == 429:
                        # Be a better citizen: space later requests further apart (capped).
                        self.min_interval = min(self.min_interval * 1.5, 4.0)
                    delay = _retry_after(response) or min(60.0, 2.0**attempt)
                    log.warning(
                        "%s returned %s, retrying in %.1fs (attempt %d/%d)",
                        self.source, response.status_code, delay, attempt, self.max_retries,
                    )
                    time.sleep(delay + random.uniform(0, 0.5))  # noqa: S311 - jitter, not security
                    continue
                if response.status_code == 404:
                    raise SourceUnavailable(f"{self.source}: 404 for {path}")
                if not response.ok:
                    raise SourceUnavailable(f"{self.source}: HTTP {response.status_code} for {path}")
                try:
                    data = response.json()
                except ValueError as exc:
                    raise SourceFormatError(f"{self.source}: invalid JSON for {path}") from exc
                _atomic_write(cache_path, data)
                return data
            time.sleep(min(30.0, 2.0**attempt))
        raise SourceUnavailable(f"{self.source}: gave up on {path} after {self.max_retries} attempts ({last_error})")


def _retry_after(response: requests.Response) -> float | None:
    value = response.headers.get("Retry-After")
    try:
        return min(120.0, float(value)) if value else None
    except ValueError:
        return None


def _atomic_write(path: Path, data: Any) -> None:
    tmp = path.with_suffix(f".{os.getpid()}.tmp")
    tmp.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    tmp.replace(path)

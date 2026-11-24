"""Read-only access to the published JSON bundle (written by the pipeline).

Files are served as raw bytes (no re-serialisation) with an ETag, and re-read only when
their mtime changes. Paths are built from validated ints / fixed patterns only.
"""

from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger("app.store")


@dataclass(frozen=True)
class Blob:
    content: bytes
    etag: str


class PublishedStore:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self._cache: dict[Path, tuple[float, Blob]] = {}
        if not self.root.exists():
            log.warning("published data directory does not exist: %s", self.root)

    def _safe(self, *parts: str) -> Path | None:
        path = self.root.joinpath(*parts).resolve()
        return path if path.is_relative_to(self.root) else None

    def get(self, *parts: str) -> Blob | None:
        path = self._safe(*parts)
        if path is None:
            return None
        try:
            mtime = path.stat().st_mtime
        except OSError:
            return None
        cached = self._cache.get(path)
        if cached and cached[0] == mtime:
            return cached[1]
        try:
            content = path.read_bytes()
        except OSError:
            return None
        blob = Blob(content=content, etag=f'"{hashlib.sha256(content).hexdigest()[:20]}"')
        if len(self._cache) > 600:
            self._cache.clear()
        self._cache[path] = (mtime, blob)
        return blob

    def json(self, *parts: str) -> object | None:
        blob = self.get(*parts)
        return json.loads(blob.content) if blob else None

    def seasons(self) -> list[int]:
        data = self.json("seasons.json")
        return [int(s) for s in data["seasons"]] if isinstance(data, dict) else []

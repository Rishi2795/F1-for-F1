"""Append-only, hash-chained audit log (JSON Lines).

Answers "who changed which data, when, with what result". Separate from application logs.
Each entry stores the hash of the previous entry, so any edit or deletion breaks the chain
and ``verify`` reports where. Entries hold counts and hashes, never payloads or secrets.
"""

from __future__ import annotations

import hashlib
import json
import os
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from . import config
from .logging_setup import get_logger

log = get_logger("audit")

GENESIS = "0" * 64


def _canonical(entry: dict[str, Any]) -> str:
    return json.dumps(entry, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _digest(entry_without_hash: dict[str, Any]) -> str:
    return hashlib.sha256(_canonical(entry_without_hash).encode("utf-8")).hexdigest()


class AuditLog:
    def __init__(self, directory: Path | None = None) -> None:
        self.directory = directory or config.AUDIT_DIR
        self.directory.mkdir(parents=True, exist_ok=True)

    def _files(self) -> list[Path]:
        return sorted(self.directory.glob("audit-*.jsonl"))

    def _last_hash(self) -> str:
        for path in reversed(self._files()):
            lines = [ln for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()]
            if lines:
                return json.loads(lines[-1])["hash"]
        return GENESIS

    def record(
        self,
        action: str,
        resource: str,
        outcome: str,
        details: dict[str, Any] | None = None,
        reason: str | None = None,
    ) -> dict[str, Any]:
        """Append one entry. ``outcome`` is success | failure | partial."""
        now = datetime.now(UTC)
        entry: dict[str, Any] = {
            "ts": now.isoformat(timespec="seconds"),
            "event_id": str(uuid.uuid4()),
            # CI actor if present; deliberately NOT the local OS user name.
            "actor": os.getenv("GITHUB_ACTOR", "local"),
            "run_id": os.getenv("GITHUB_RUN_ID", "local"),
            "action": action,
            "resource": resource,
            "outcome": outcome,
            "reason": reason,
            "details": details or {},
            "prev_hash": self._last_hash(),
        }
        entry["hash"] = _digest(entry)
        path = self.directory / f"audit-{now:%Y-%m}.jsonl"
        with path.open("a", encoding="utf-8") as handle:
            handle.write(_canonical(entry) + "\n")
        log.info("audit %s %s -> %s", action, resource, outcome)
        return entry

    def verify(self) -> tuple[bool, int, str | None]:
        """Return (ok, entries_checked, problem). Walks every file in order."""
        previous = GENESIS
        count = 0
        for path in self._files():
            for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
                if not line.strip():
                    continue
                where = f"{path.name}:{number}"
                try:
                    entry = json.loads(line)
                except ValueError:
                    return False, count, f"{where} is not valid JSON"
                claimed = entry.pop("hash", None)
                if entry.get("prev_hash") != previous:
                    return False, count, f"{where} breaks the chain (prev_hash mismatch)"
                if claimed != _digest(entry):
                    return False, count, f"{where} was modified (hash mismatch)"
                previous = claimed
                count += 1
        return True, count, None

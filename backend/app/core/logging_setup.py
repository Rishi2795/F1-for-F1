"""Structured JSON logging with secret redaction. Nothing in this app calls print()."""

from __future__ import annotations

import json
import logging
import re
import sys
from datetime import UTC, datetime

_PATTERNS = [
    # Bearer first: otherwise the key=value rule below would eat the word "Bearer" and leave the token.
    (re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._\-]+"), "Bearer <redacted>"),
    (re.compile(r"(mongodb(?:\+srv)?://)[^\s\"']+", re.I), r"\1<redacted>"),
    (re.compile(r"(?i)\b(password|passwd|token|secret|authorization|api[_-]?key)(\s*[=:]\s*)[^\s,;\"']+"), r"\1\2<redacted>"),
]


def redact(text: str) -> str:
    for pattern, replacement in _PATTERNS:
        text = pattern.sub(replacement, text)
    return text


class _RedactFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = redact(record.getMessage())
        record.args = ()
        if record.exc_info:
            record.exc_text = redact(logging.Formatter().formatException(record.exc_info))
            record.exc_info = None
        return True


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.fromtimestamp(record.created, tz=UTC).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        ctx = getattr(record, "ctx", None)
        if isinstance(ctx, dict):
            payload.update(ctx)
        if record.exc_text:
            payload["exc"] = record.exc_text
        return json.dumps(payload, ensure_ascii=False, default=str)


def setup_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(_RedactFilter())
    handler.setFormatter(_JsonFormatter())
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(level)
    # uvicorn's own access log is replaced by our request log (one structured line per request).
    logging.getLogger("uvicorn.access").disabled = True
    for name in ("uvicorn", "uvicorn.error", "fastapi"):
        logging.getLogger(name).handlers[:] = []
        logging.getLogger(name).propagate = True

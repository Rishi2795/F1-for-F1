"""Structured logging for the pipeline. One setup function; nobody calls print()."""

from __future__ import annotations

import json
import logging
import os
import re
import sys
from datetime import UTC, datetime

_SECRET_PATTERNS = [
    # Bearer first: otherwise the key=value rule would eat the word "Bearer" and leave the token.
    (re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._\-]+"), "Bearer <redacted>"),
    (re.compile(r"(mongodb(?:\+srv)?://)[^\s\"']+", re.I), r"\1<redacted>"),
    (
        re.compile(r"(?i)\b(password|passwd|token|secret|authorization|api[_-]?key)(\s*[=:]\s*)[^\s,;\"']+"),
        r"\1\2<redacted>",
    ),
]


def redact(text: str) -> str:
    """Mask anything that looks like a credential before it is written anywhere."""
    for pattern, replacement in _SECRET_PATTERNS:
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
        extra = getattr(record, "ctx", None)
        if isinstance(extra, dict):
            payload.update(extra)
        if record.exc_text:
            payload["exc"] = record.exc_text
        return json.dumps(payload, ensure_ascii=False, default=str)


def setup_logging(level: str | None = None, json_output: bool | None = None) -> None:
    level = (level or os.getenv("LOG_LEVEL", "INFO")).upper()
    if json_output is None:
        json_output = os.getenv("LOG_FORMAT", "").lower() == "json" or not sys.stderr.isatty()
    handler = logging.StreamHandler(sys.stderr)
    handler.addFilter(_RedactFilter())
    handler.setFormatter(
        _JsonFormatter() if json_output else logging.Formatter("%(asctime)s %(levelname)-7s %(name)s: %(message)s")
    )
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(level)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"f1data.{name}")

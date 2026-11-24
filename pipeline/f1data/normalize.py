"""The one place that turns messy upstream values (NaN, 'None', '') into real None.

Rule for the whole project: a missing value is ``None``. We never invent a default.
"""

from __future__ import annotations

import math
from typing import Any

_NULL_STRINGS = {"", "none", "nan", "null", "n/a", "-"}


def clean(value: Any) -> Any:
    """Return None for anything that means "no value"; otherwise the value unchanged."""
    if value is None:
        return None
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if isinstance(value, str) and value.strip().lower() in _NULL_STRINGS:
        return None
    return value


def to_int(value: Any) -> int | None:
    value = clean(value)
    if value is None or isinstance(value, bool):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def to_float(value: Any) -> float | None:
    value = clean(value)
    if value is None or isinstance(value, bool):
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(result) or math.isinf(result) else result


def to_str(value: Any) -> str | None:
    value = clean(value)
    return None if value is None else str(value).strip() or None


def to_bool(value: Any) -> bool | None:
    value = clean(value)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        low = value.strip().lower()
        if low in {"true", "1", "yes"}:
            return True
        if low in {"false", "0", "no"}:
            return False
    return None

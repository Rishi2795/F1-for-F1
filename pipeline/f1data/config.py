"""Paths and settings. Everything is overridable by environment variable; no secrets here."""

from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

CACHE_DIR = Path(os.getenv("F1_CACHE_DIR", REPO_ROOT / "pipeline" / ".cache"))
PUBLISHED_DIR = Path(os.getenv("F1_PUBLISHED_DIR", REPO_ROOT / "backend" / "data" / "published"))
AUDIT_DIR = Path(os.getenv("F1_AUDIT_DIR", REPO_ROOT / "audit"))

# Seasons published by default. Sources cover 2018+ so this can be widened later.
DEFAULT_FIRST_SEASON = 2020
DEFAULT_LAST_SEASON = int(os.getenv("F1_LAST_SEASON", "2026"))

# Generic client name on purpose: no project, person or repo details leave this machine.
USER_AGENT = "f1-data-pipeline/0.1"

JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1"
OPENF1_BASE = "https://api.openf1.org/v1"
TRACINGINSIGHTS_BASE = "https://github.com/TracingInsights"

# How long cached responses for a still-running season stay fresh (seconds).
CURRENT_SEASON_TTL = 12 * 3600

import json
from pathlib import Path

import pytest
from app.core.config import Settings
from app.main import create_app
from fastapi.testclient import TestClient


def _write(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf-8")


@pytest.fixture
def data_dir(tmp_path: Path) -> Path:
    _write(tmp_path / "seasons.json", {"seasons": [2024]})
    _write(
        tmp_path / "seasons" / "2024" / "races.json",
        {"season": 2024, "races": [
            {"season": 2024, "round": 1, "event_name": "Bahrain Grand Prix", "location": "Sakhir",
             "country": "Bahrain", "date": "2024-03-02", "data_status": "ok"},
            {"season": 2024, "round": 2, "event_name": "Future GP", "location": "Nowhere",
             "country": None, "date": "2099-01-01", "data_status": "scheduled"},
            {"season": 2024, "round": 3, "event_name": "Gap GP", "location": "Somewhere",
             "country": None, "date": "2024-04-01", "data_status": "missing"},
        ]},
    )
    _write(tmp_path / "seasons" / "2024" / "race_1.json", {"season": 2024, "round": 1, "drivers": []})
    _write(
        tmp_path / "seasons" / "2024" / "standings.json",
        {"season": 2024, "rounds": [{"round": 1, "event_name": "Bahrain Grand Prix", "drivers": [], "constructors": []}]},
    )
    _write(tmp_path / "drivers" / "index.json", [{"code": "VER", "name": "Max Verstappen"}])
    _write(tmp_path / "drivers" / "VER.json", {"code": "VER", "name": "Max Verstappen"})
    _write(tmp_path / "ratings" / "current.json", {"version": "ratings-v1", "ratings": [{"code": "VER", "overall": 1900}]})
    _write(tmp_path / "ratings" / "model.json", {"version": "ratings-v1", "metrics": {}})
    _write(tmp_path / "ratings" / "history" / "VER.json", {"code": "VER", "history": [[2024, 1, 1500, 1500]]})
    _write(tmp_path / "coverage.json", {"seasons": {}})
    _write(tmp_path / "manifest.json", {"schema_version": 1})
    return tmp_path


def make_settings(data_dir: Path, **overrides) -> Settings:
    base = dict(
        env="development", data_dir=data_dir, log_level="WARNING",
        allowed_origins=("http://localhost:5173",), fallback_origin_regex=None,
        docs_enabled=False, rate_limit_per_minute=1000, log_ip_salt="test", trust_proxy=False,
    )
    return Settings(**{**base, **overrides})


@pytest.fixture
def client(data_dir: Path) -> TestClient:
    return TestClient(create_app(make_settings(data_dir)), raise_server_exceptions=False)

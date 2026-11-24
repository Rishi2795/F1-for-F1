import json

import pytest
from f1data.audit import AuditLog
from f1data.build import RaceInputs, build_race
from f1data.coverage import regressions
from f1data.export import Publisher, dumps

from tests.helpers import ENTRY, result


def test_audit_chain_verifies_and_detects_tampering(tmp_path):
    audit = AuditLog(tmp_path)
    for i in range(3):
        audit.record("ingest.season", f"season/{2020 + i}", "success", {"ok": i})
    assert audit.verify() == (True, 3, None)

    file = next(tmp_path.glob("audit-*.jsonl"))
    lines = file.read_text().splitlines()
    entry = json.loads(lines[1])
    entry["details"]["ok"] = 999  # edit history
    lines[1] = json.dumps(entry, sort_keys=True, separators=(",", ":"))
    file.write_text("\n".join(lines) + "\n")
    ok, _, problem = audit.verify()
    assert not ok and "modified" in problem


def test_audit_detects_deleted_entry(tmp_path):
    audit = AuditLog(tmp_path)
    for i in range(3):
        audit.record("a", f"r{i}", "success")
    file = next(tmp_path.glob("audit-*.jsonl"))
    lines = file.read_text().splitlines()
    file.write_text("\n".join([lines[0], lines[2]]) + "\n")
    ok, _, problem = audit.verify()
    assert not ok and "chain" in problem


def test_audit_never_records_local_username(tmp_path, monkeypatch):
    monkeypatch.delenv("GITHUB_ACTOR", raising=False)
    entry = AuditLog(tmp_path).record("x", "y", "success")
    assert entry["actor"] == "local"


def test_published_json_can_never_contain_nan():
    with pytest.raises(ValueError):
        dumps({"x": float("nan")})


def test_publisher_never_replaces_good_data_with_worse(tmp_path):
    pub = Publisher(tmp_path)
    good = build_race(RaceInputs(ENTRY, [result("VER")], [], None))
    good.quality.status = "ok"
    assert pub.publish_race(good) == "written"
    assert pub.publish_race(good) == "unchanged"
    worse = good.model_copy(deep=True)
    worse.quality.status = "partial"
    assert pub.publish_race(worse) == "kept_previous"
    empty = build_race(RaceInputs(ENTRY, [], [], None))
    assert pub.publish_race(empty) == "kept_previous"
    assert pub.load_race(2024, 1).quality.status == "ok"


def test_coverage_regression_detected():
    prev = {"seasons": {"2024": {"races": [{"round": 1, "status": "ok"}, {"round": 2, "status": "partial"}]}}}
    cur = {"seasons": {"2024": {"races": [{"round": 1, "status": "missing"}, {"round": 2, "status": "ok"}]}}}
    assert regressions(prev, cur) == [{"season": 2024, "round": 1, "from": "ok", "to": "missing"}]
    assert regressions(None, cur) == []


def test_validate_catches_tampering_and_missing_files(tmp_path):
    from f1data.models import RaceIndex, RaceIndexEntry

    pub = Publisher(tmp_path)
    rows = [result(f"D{i:02d}", finish=i + 1, grid=i + 1, number=i + 1) for i in range(12)]
    doc = build_race(RaceInputs(ENTRY, rows, [], None))
    doc.quality.status = "partial"
    pub.publish_race(doc)
    entry = RaceIndexEntry(season=2024, round=1, event_name="Test GP", location="X", country=None,
                           date="2024-03-02", data_status="partial")
    pub.publish_index(RaceIndex(season=2024, races=[entry]))
    pub.publish_manifest({})
    assert pub.validate() == []

    path = pub.race_path(2024, 1)
    path.write_text(path.read_text().replace("Test GP", "Edited GP"))  # edited behind the pipeline's back
    assert any("manifest" in p for p in pub.validate())
    path.unlink()
    assert any("race file is missing" in p for p in pub.validate())

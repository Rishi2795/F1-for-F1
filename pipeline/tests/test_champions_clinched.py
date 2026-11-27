import json

from f1data.export import Publisher
from f1data.models import Champion, Champions


def setup(tmp_path, clinched, champions=(), season=2026):
    (tmp_path / "predictions").mkdir()
    (tmp_path / "drivers").mkdir()
    (tmp_path / "predictions" / "championship.json").write_text(json.dumps({"season": season, "clinched_driver": clinched}))
    (tmp_path / "drivers" / "index.json").write_text(json.dumps([{"code": "ANT", "name": "Kimi Antonelli"}, {"code": "VER", "name": "Max Verstappen"}]))
    pub = Publisher(tmp_path)
    pub.publish_champions(Champions(champions=[Champion(season=s, code=c, name=n) for s, c, n in champions]))
    return pub


def seasons(pub):
    return [(c.season, c.code) for c in pub.load_champions().champions]


def test_a_decided_title_makes_that_driver_the_seasons_champion(tmp_path):
    pub = setup(tmp_path, "ANT", champions=[(2025, "NOR", "Lando Norris")])
    assert pub.record_clinched_champion() is True
    assert seasons(pub) == [(2025, "NOR"), (2026, "ANT")]
    assert pub.record_clinched_champion() is False  # recording twice changes nothing


def test_nothing_is_recorded_when_no_title_is_decided_or_the_season_already_has_its_champion(tmp_path):
    assert setup(tmp_path, None).record_clinched_champion() is False
    pub = setup(tmp_path / "x", "ANT", champions=[(2026, "VER", "Max Verstappen")]) if (tmp_path / "x").mkdir() is None else None
    assert pub.record_clinched_champion() is False and seasons(pub) == [(2026, "VER")]  # the official record is never overwritten


def test_an_unknown_driver_or_missing_files_record_nothing(tmp_path):
    assert setup(tmp_path, "ZZZ").record_clinched_champion() is False  # not in the driver list: no name to record
    assert Publisher(tmp_path / "empty").record_clinched_champion() is False

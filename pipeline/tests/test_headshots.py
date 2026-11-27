from datetime import UTC, datetime

from f1data.export import Publisher
from f1data.headshots import acceptable, collect

OK = "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png.transform/1col/image.png"


class FakeOpenF1:
    def __init__(self, sessions, drivers):
        self._s, self._d = sessions, drivers

    def race_sessions(self, season):
        return self._s.get(season, [])

    def session_drivers(self, key):
        return self._d.get(key, [])

    def driver_records(self, code):
        return self._by_code.get(code, [])

    _by_code: dict = {}


def test_only_https_pngs_on_the_f1_media_host_are_accepted():
    assert acceptable(OK)
    assert acceptable("https://www.formula1.com/content/dam/fom-website/drivers/N/NYCDEV01_Nyck_De%20Vries/nycdev01.png.transform/1col/image.png")
    assert not acceptable("https://www.formula1.com.evil.example/x.png")
    assert not acceptable(OK.replace("https://", "http://"))
    assert not acceptable(OK.replace("media.formula1.com", "evil.example.com"))
    assert not acceptable("https://media.formula1.com.evil.example/x.png")
    assert not acceptable("https://media.formula1.com/x.svg")
    assert not acceptable(None)
    assert not acceptable("javascript:alert(1)")


def test_the_newest_season_wins_and_bad_links_are_dropped():
    s = {2025: [{"session_key": 1, "date_start": "2025-12-07T13:00:00"}], 2026: [{"session_key": 2, "date_start": "2026-03-08T04:00:00"}, {"session_key": 3, "date_start": "2099-01-01T00:00:00"}]}
    d = {1: [{"name_acronym": "NOR", "headshot_url": OK.replace("1col", "2col")}, {"name_acronym": "XXX", "headshot_url": "https://evil.example/x.png"}],
         2: [{"name_acronym": "NOR", "headshot_url": OK}, {"name_acronym": "ab", "headshot_url": OK}], 3: [{"name_acronym": "FUT", "headshot_url": OK}]}
    got = collect(FakeOpenF1(s, d), today=datetime(2026, 11, 1, tzinfo=UTC))
    assert got == {"NOR": OK}  # the 2026 link, not 2025's; not a driver of a session that has not happened; no bad link


def test_the_data_gate_rejects_a_foreign_link(tmp_path):
    (tmp_path / "drivers").mkdir()
    (tmp_path / "drivers" / "headshots.json").write_text('{"headshots": {"NOR": "https://evil.example/x.png"}}')
    problems = Publisher(tmp_path)._headshot_problems()
    assert problems and "NOR" in problems[0]


def test_a_driver_the_season_sweep_missed_is_asked_for_by_name():
    """Someone who left mid-season is not in a season's last session, so the codes still without a portrait are looked up directly."""
    s = {2025: [{"session_key": 1, "date_start": "2025-12-07T13:00:00"}]}
    d = {1: [{"name_acronym": "NOR", "headshot_url": OK}]}
    src = FakeOpenF1(s, d)
    src._by_code = {
        "RIC": [{"headshot_url": "https://evil.example/old.png"}, {"headshot_url": OK.replace("LANNOR01_Lando_Norris/lannor01", "DANRIC01_Daniel_Ricciardo/danric01")}, {"headshot_url": None}],
        "NOP": [{"headshot_url": None}],  # nothing usable: stays without a portrait, never a made-up link
    }
    got = collect(src, today=datetime(2026, 11, 1, tzinfo=UTC), wanted=["NOR", "RIC", "NOP"])
    assert set(got) == {"NOR", "RIC"} and "danric01" in got["RIC"]

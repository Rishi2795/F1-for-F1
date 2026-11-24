from datetime import date

from f1data.cli import _match_event, _parse_seasons
from f1data.logging_setup import redact
from f1data.sources.jolpica import JolpicaSource

from tests.helpers import ENTRY


class FakeHttp:
    """Two pages that split one race's results across the page boundary."""

    def __init__(self):
        self.calls = []

    def get_json(self, path, params=None, **_):
        self.calls.append(params["offset"])
        driver = lambda c: {"driverId": c.lower(), "code": c, "givenName": "A", "familyName": c, "permanentNumber": "1"}  # noqa: E731
        item = lambda c, pos: {"Driver": driver(c), "Constructor": {"name": "T"}, "grid": "0", "position": str(pos),  # noqa: E731
                               "positionText": str(pos), "status": "Finished", "points": "1", "laps": "50"}
        pages = {0: [item("AAA", 1)], 100: [item("BBB", 2)]}
        return {"MRData": {"total": "101", "RaceTable": {"Races": [
            {"round": "1", "raceName": "X", "date": "2024-01-01", "Results": pages[params["offset"]]}]}}}


def test_jolpica_merges_a_race_split_across_pages_and_flags_pit_lane_start():
    http = FakeHttp()
    rows = JolpicaSource(http).results(2024)[1]
    assert http.calls == [0, 100]
    assert [r.driver_code for r in rows] == ["AAA", "BBB"]
    assert rows[0].grid is None and rows[0].pit_lane_start is True


def test_event_matching_tolerates_utc_vs_local_date():
    # Night races (e.g. Las Vegas) start the next UTC day
    assert _match_event(ENTRY, {"2024-03-03": "Folder"}) == "Folder"
    assert _match_event(ENTRY, {"2024-03-09": "Other"}) is None


def test_parse_seasons():
    assert _parse_seasons("2020-2022") == [2020, 2021, 2022]
    assert _parse_seasons("2020,2024") == [2020, 2024]
    assert date.fromisoformat(ENTRY.date)


def test_redaction_catches_bearer_tokens_and_connection_strings():
    out = redact("Authorization: Bearer abc.def-1 and mongodb+srv://u:p@h/db and password=hunter2")
    assert "abc.def-1" not in out and "u:p@h" not in out and "hunter2" not in out


def test_driver_number_is_the_number_raced_with_not_the_current_permanent_number():
    # Real example: Verstappen raced 2023 as #1 (champion) but Jolpica's permanentNumber is his current number.
    from f1data.sources.jolpica import _parse_result

    row = _parse_result({
        "number": "1", "position": "1", "positionText": "1", "grid": "1", "points": "25", "laps": "57",
        "status": "Finished", "Constructor": {"name": "Red Bull"},
        "Driver": {"driverId": "max_verstappen", "code": "VER", "givenName": "Max", "familyName": "Verstappen",
                   "permanentNumber": "3"},
    })
    assert row.driver_number == 1

import dataclasses

from f1data import metrics
from f1data.build import RaceInputs, build_race
from f1data.sources.jolpica import _lap_seconds, _parse_result
from f1data.sources.tracinginsights import DriverLaps, RaceLaps

from tests.helpers import ENTRY, STOP, lap, result


def test_lap_seconds_parses_official_format_and_refuses_junk():
    assert _lap_seconds("1:31.488") == 91.488
    assert _lap_seconds("59.9") == 59.9
    assert _lap_seconds("n/a") is None and _lap_seconds(None) is None


def test_result_row_carries_gap_and_fastest_lap():
    item = {
        "number": "33", "position": "2", "positionText": "2", "points": "18", "grid": "3", "laps": "50", "status": "Finished",
        "Driver": {"driverId": "max_verstappen", "code": "VER", "givenName": "Max", "familyName": "Verstappen"},
        "Constructor": {"name": "Red Bull"},
        "Time": {"millis": "7586943", "time": "+11.825"},
        "FastestLap": {"rank": "3", "lap": "35", "Time": {"time": "1:31.488"}, "AverageSpeed": {"speed": "242.943"}},
    }
    row = _parse_result(item)
    assert (row.race_time_ms, row.fastest_rank, row.fastest_lap, row.fastest_time_s, row.fastest_speed_kph) == (7586943, 3, 35, 91.488, 242.943)
    bare = _parse_result({**item, "Time": None, "FastestLap": None})
    assert bare.race_time_ms is None and bare.fastest_time_s is None  # lapped / no time: blank, not zero


def test_best_lap_ignores_pit_laps_and_lap_one():
    laps = [lap(1, 80.0), lap(2, 91.0), lap(3, 89.5), lap(4, 70.0, pin=True), lap(5, 90.0)]
    assert metrics.best_lap(laps) == 89.5
    assert metrics.best_lap([]) is None


def test_lap_positions_leave_gaps_as_none():
    laps = [dataclasses.replace(lap(n), position=p) for n, p in [(1, 3), (2, 2), (4, 1)]]
    assert metrics.lap_positions(laps, 5) == [3, 2, None, 1, None]
    assert metrics.lap_positions([dataclasses.replace(lap(1), position=None)], 5) is None


def test_lead_changes_counts_handovers_not_pit_blips():
    a = [1, 1, 2, 2, 1, 1]
    b = [2, 2, 1, 1, 2, 2]
    assert metrics.lead_changes([a, b]) == 2
    assert metrics.lead_changes([[1, 1, 1], [2, 2, 2]]) == 0
    assert metrics.lead_changes([]) is None


def test_tyre_wear_needs_enough_stints_and_whole_clean_laps():
    def stint_laps(slope):
        return [lap(n, 90.0 + slope * n, compound="MEDIUM", stint=1) for n in range(2, 20)]
    wear = metrics.tyre_wear([stint_laps(0.1), stint_laps(0.12), stint_laps(0.08)])
    assert wear == [("MEDIUM", 0.1, 3)]
    assert metrics.tyre_wear([stint_laps(0.1)]) == []  # one stint is not evidence


def test_build_adds_pace_gap_pit_log_and_analysis():
    ver = [lap(n, 90.0 + (0.0 if n != 20 else 30), pin=(n == 20)) for n in range(1, 31)]
    ham = [lap(n, 90.5) for n in range(1, 31)]
    laps = RaceLaps("e", "2024-03-02", 30, {"VER": DriverLaps("VER", 1, ver), "HAM": DriverLaps("HAM", 44, ham)}, {}, {})
    rows = [
        dataclasses.replace(result("VER", 1, 1, laps=30), race_time_ms=5_000_000, fastest_rank=1, fastest_lap=12, fastest_time_s=89.0),
        dataclasses.replace(result("HAM", 2, 2, laps=30, number=44), race_time_ms=5_004_200, fastest_rank=2, fastest_lap=9, fastest_time_s=89.9),
    ]
    doc = build_race(RaceInputs(ENTRY, rows, [STOP], laps))
    ver_d, ham_d = doc.drivers
    assert ham_d.gap_to_winner_s == 4.2 and ver_d.gap_to_winner_s is None
    lapped = dataclasses.replace(result("GAS", 3, 3, laps=29, number=10), race_time_ms=5_001_000)
    doc2 = build_race(RaceInputs(ENTRY, [*rows, lapped], [], laps))
    assert next(d for d in doc2.drivers if d.driver_code == "GAS").gap_to_winner_s is None  # lapped: not comparable
    assert (ver_d.pace_rank, ham_d.pace_rank, ham_d.pace_gap_s) == (1, 2, 0.5)
    assert ver_d.pit_stops[0].duration_s == 22.5 and ham_d.pit_stops is None or ham_d.pit_stops == []
    assert doc.analysis.fastest_lap.driver_code == "VER" and doc.analysis.fastest_pit.value_s == 22.5


def test_a_race_with_no_laps_has_no_invented_detail():
    doc = build_race(RaceInputs(ENTRY, [result("VER", 1, 1)], [], None))
    d = doc.drivers[0]
    assert d.median_lap_s is None and d.lap_positions is None and d.pace_rank is None and doc.analysis is None

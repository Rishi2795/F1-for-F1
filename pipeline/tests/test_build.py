from f1data.build import RaceInputs, build_race
from f1data.sources.tracinginsights import DriverLaps, RaceLaps

from tests.helpers import ENTRY, STOP, lap, result


def _laps(code="VER", n=40):
    stint1 = [lap(i, 90.0 + (i % 3) * 0.02, "SOFT", 1) for i in range(1, 21)]
    stint2 = [lap(i, 90.0 + (i % 3) * 0.02, "HARD", 2, life=i - 19) for i in range(21, n + 1)]
    return DriverLaps(code=code, number=1, laps=stint1 + stint2)


def _race_laps(*codes):
    return RaceLaps(event_folder="Test", race_date="2024-03-02", total_laps=40,
                    drivers={c: _laps(c) for c in codes}, team_colors={"VER": "1E41FF"}, team_names={"VER": "Red Bull Racing"})


def test_full_data_race_is_ok():
    doc = build_race(RaceInputs(ENTRY, [result("VER")], [STOP], _race_laps("VER")))
    d = doc.drivers[0]
    assert doc.quality.status == "ok" and doc.quality.missing == []
    assert d.tyre_sequence == ["SOFT", "HARD"] and d.stops == 1 and d.stops_official == 1
    assert d.team == "Red Bull Racing" and d.team_color == "#1E41FF"
    assert doc.winner.driver_code == "VER" and doc.derived.winning_recipe.common_tyre_sequence == "SOFT → HARD"


def test_missing_lap_data_is_null_not_invented():
    doc = build_race(RaceInputs(ENTRY, [result("VER")], [STOP], None))
    d = doc.drivers[0]
    assert doc.quality.status == "partial" and "laps" in doc.quality.missing
    assert d.laps_available is False
    assert d.stops is None and d.tyre_sequence is None and d.stints is None  # old code said 1 stop / UNKNOWN / 50
    assert d.strategy_risk is None and d.consistency_index is None
    assert d.finish == 1 and d.grid == 1  # official results are still there


def test_null_grid_and_position_do_not_drop_the_round():
    # 2021 Abu Dhabi had a driver with null Position/GridPosition: int(NaN) crashed the old script
    rows = [result("VER", 1), result("MAZ", finish=None, grid=None, classified=False, status="Did not start")]
    doc = build_race(RaceInputs(ENTRY, rows, [], None))
    maz = next(d for d in doc.drivers if d.driver_code == "MAZ")
    assert maz.finish is None and maz.grid is None and maz.positions_gained is None
    assert doc.drivers[-1].driver_code == "MAZ"  # unknown finishers sort last, not first


def test_pit_lane_start_is_explicit_not_zero():
    doc = build_race(RaceInputs(ENTRY, [result("VER", 1), result("HAM", 5, pit_lane=True)], [], None))
    ham = next(d for d in doc.drivers if d.driver_code == "HAM")
    assert ham.grid is None and ham.pit_lane_start is True and ham.positions_gained is None


def test_retirement_has_no_positions_gained():
    doc = build_race(RaceInputs(ENTRY, [result("VER", 1), result("HAM", 18, 3, classified=False, status="Engine")], [], None))
    assert next(d for d in doc.drivers if d.driver_code == "HAM").positions_gained is None


def test_race_with_no_finishers_and_no_data_builds():
    doc = build_race(RaceInputs(ENTRY, [], [], None))
    assert doc.quality.status == "missing" and doc.winner is None and doc.drivers == []


def test_stop_count_mismatch_is_reported_not_hidden():
    doc = build_race(RaceInputs(ENTRY, [result("VER")], [STOP, STOP.__class__("ver", 2, 30, 20.0)], _race_laps("VER")))
    assert any(w.startswith("stops_mismatch:VER") for w in doc.quality.warnings)


def test_driver_matched_by_number_when_codes_differ():
    laps = _race_laps("XXX")
    laps.drivers["XXX"].number = 1
    doc = build_race(RaceInputs(ENTRY, [result("VER", number=1)], [STOP], laps))
    assert doc.drivers[0].laps_available is True


def test_driver_without_lap_data_borrows_team_name_and_colour_from_teammate():
    # 2026 Brazil: BOT had no lap data, so he showed as "Cadillac F1 Team" with no colour beside PER on "Cadillac"
    rows = [result("PER", 8, 9, number=11), result("BOT", 12, 10, number=77)]
    rows = [r.__class__(**{**r.__dict__, "constructor": "Cadillac F1 Team"}) for r in rows]
    laps = RaceLaps("T", "2024-03-02", 40, {"PER": _laps("PER").__class__("PER", 11, _laps("PER").laps)}, {"PER": "FFFFFF"}, {"PER": "Cadillac"})
    doc = build_race(RaceInputs(ENTRY, rows, [], laps))
    by = {d.driver_code: d for d in doc.drivers}
    assert by["BOT"].laps_available is False
    assert (by["BOT"].team, by["BOT"].team_color) == ("Cadillac", "#FFFFFF") == (by["PER"].team, by["PER"].team_color)


def test_without_any_lap_archive_the_jolpica_constructor_name_is_used():
    doc = build_race(RaceInputs(ENTRY, [result("VER")], [], None))
    assert doc.drivers[0].team == "Team" and doc.drivers[0].team_color is None


def test_a_car_that_retires_in_the_pits_is_a_note_not_a_stop_mismatch():
    # one tyre stint (it never went back out) but the pit log has a stop on its last lap
    one_stint = DriverLaps(code="HAM", number=44, laps=[lap(i, 90.0, "SOFT", 1) for i in range(1, 11)])
    rows = [result("VER", 1, laps=40), result("HAM", 20, classified=False, status="Retired", laps=10, number=44)]
    stop = type(STOP)(**{**STOP.__dict__, "driver_id": rows[1].driver_id, "lap": 10}) if hasattr(STOP, "__dict__") else STOP
    laps = _race_laps("VER")
    laps.drivers["HAM"] = one_stint
    doc = build_race(RaceInputs(ENTRY, rows, [stop], laps))
    assert not any("stops_mismatch:HAM" in w for w in doc.quality.warnings)
    assert any("retired in the pits" in n and "HAM" in n for n in doc.quality.notes)

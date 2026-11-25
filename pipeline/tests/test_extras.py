import json

from f1data.build import RaceInputs, build_race
from f1data.export import Publisher
from f1data.extras import apply_qualifying, apply_sprint, enrich_season, write_grid
from f1data.predict.report import _grid_for
from f1data.predict.state import Config, PStarter, Tracker
from f1data.ratings.evaluate import START
from f1data.sources.jolpica import QualiRow, SprintRow

from tests.helpers import ENTRY, result


def doc():
    return build_race(RaceInputs(ENTRY, [result("VER", 1, 1), result("HAM", 2, 2, number=44), result("LEC", 3, 3, number=16)], [], None))


def test_qualifying_gap_is_measured_from_the_pole_lap_and_ties_are_broken_by_time():
    rows = [QualiRow("VER", 1, 90.0), QualiRow("HAM", 2, 90.9), QualiRow("LEC", 2, 90.6)]  # upstream tie for 2nd
    by = {d.driver_code: d for d in apply_qualifying(doc(), rows).drivers}
    assert by["VER"].quali_position == 1 and by["VER"].quali_gap_pct == 0.0
    assert by["LEC"].quali_position == 2 and by["HAM"].quali_position == 3  # LEC's lap was quicker
    assert by["HAM"].quali_gap_pct == 1.0  # 0.9 s on 90 s


def test_sprint_points_are_attached_only_to_drivers_who_raced_the_sprint():
    by = {d.driver_code: d for d in apply_sprint(doc(), [SprintRow("VER", 1, 8.0, 1), SprintRow("HAM", 2, 7.0, 2)]).drivers}
    assert by["VER"].sprint_points == 8.0 and by["HAM"].sprint_position == 2 and by["LEC"].sprint_points is None


def test_a_rebuild_keeps_qualifying_and_excitement(tmp_path):
    pub = Publisher(tmp_path)
    pub.publish_race(doc())
    enrich_season(pub, 2024, {1: [QualiRow("VER", 1, 90.0), QualiRow("HAM", 2, 90.5), QualiRow("LEC", 3, 91.0)]}, {})
    assert pub.load_race(2024, 1).drivers[0].quali_position == 1
    pub.publish_race(doc())  # the build knows nothing about qualifying
    assert pub.load_race(2024, 1).drivers[0].quali_position == 1


def lineup():
    return tuple(PStarter(c, c, "T" + c, "T" + c, "#fff", None, None, False, None) for c in ("AAA", "BBB", "CCC", "DDD"))


def test_a_grid_for_a_race_to_come_is_only_used_when_it_matches_the_lineup(tmp_path):
    pub = Publisher(tmp_path)
    assert _grid_for(pub, 2026, 22, lineup()) is None  # qualifying has not happened
    write_grid(pub, 2026, 22, [QualiRow("AAA", 1, 80.0), QualiRow("BBB", 2, 80.4), QualiRow("CCC", 3, 80.9), QualiRow("DDD", 4, 81.0)])
    grid = _grid_for(pub, 2026, 22, lineup())
    assert [(s.code, s.grid) for s in grid] == [("AAA", 1), ("BBB", 2), ("CCC", 3), ("DDD", 4)]
    assert grid[1].quali_gap == 0.5
    path = tmp_path / "grids" / "2026_22.json"
    path.write_text(json.dumps({"season": 2026, "round": 22, "grid": [{"code": "ZZZ", "position": 1, "gap_pct": 0.0}]}))
    assert _grid_for(pub, 2026, 22, lineup()) is None  # unrelated drivers: do not guess


def test_the_qualifying_feature_only_exists_once_the_grid_is_known():
    tracker = Tracker(START, Config())
    starters = tuple(
        PStarter(c, c, "T", "T", None, i + 1, None, False, None, 0.3 * i) for i, c in enumerate(("AAA", "BBB", "CCC"))
    )
    pre = tracker.features(starters, grid_known=False)
    post = tracker.features(starters, grid_known=True)
    assert all(f.quali == 0.0 and f.grid == 0.0 for f in pre)
    assert post[0].quali > post[1].quali > post[2].quali  # the driver closest to pole scores highest
    assert len(pre[0].vector(False)) == 3 and len(post[0].vector(True)) == 5


def test_memory_lengths_change_what_the_tracker_remembers():
    from tests.predict_helpers import simulate_races

    races, *_ = simulate_races(seasons=(2020,), rounds=10)
    short, long_ = Tracker(START, Config(form_window=2)), Tracker(START, Config(form_window=8))
    for race in races:
        for t in (short, long_):
            t.start_season(race.season)
            t.learn(race)
    assert len(short.finishes["D00"]) == 2 and len(long_.finishes["D00"]) == 8

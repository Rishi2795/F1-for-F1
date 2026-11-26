import dataclasses

from f1data.lapdoc import build_lap_doc, lap_status
from f1data.sources.tracinginsights import DriverLaps

from tests.helpers import lap


def driver(code, ends, positions, pits=(), times=None, status="1"):
    rows = []
    for n, (end, pos) in enumerate(zip(ends, positions, strict=True), start=1):
        rows.append(
            dataclasses.replace(
                lap(n, time=(times or [90.0] * len(ends))[n - 1], pin=n in pits), position=pos, session_end=end, track_status=status,
                sectors=(30.0 + n * 0.01, 30.0, 30.0), top_speed=300.0 + n,
            )
        )
    return DriverLaps(code, 1, rows)


def test_track_status_picks_the_worst_flag_on_the_lap():
    assert lap_status({"1"}) == "G" and lap_status({"1", "2"}) == "Y" and lap_status({"1", "24"}) == "SC"
    assert lap_status({"67"}) == "VSC" and lap_status({"1", "5"}) == "R"


def test_gap_to_the_leader_comes_from_when_each_car_crossed_the_line():
    drivers = {"AAA": driver("AAA", [100, 200, 300], [1, 1, 1]), "BBB": driver("BBB", [103, 204, 306], [2, 2, 2])}
    doc = build_lap_doc(2024, 1, drivers, 3)
    by = {d.code: d for d in doc.drivers}
    assert by["AAA"].gap == [0.0, 0.0, 0.0] and by["BBB"].gap == [3.0, 4.0, 6.0]
    assert by["AAA"].best_sectors[0] == 30.01 and by["BBB"].top_speed_kph == 303.0
    assert doc.laps == 3 and doc.status == ["G", "G", "G"] and doc.incidents == []


def test_a_safety_car_period_becomes_one_incident():
    sc = {"AAA": driver("AAA", [100, 200, 300, 400, 500], [1] * 5)}
    for i in (1, 2):
        sc["AAA"].laps[i] = dataclasses.replace(sc["AAA"].laps[i], track_status="4")
    doc = build_lap_doc(2024, 1, sc, 5)
    assert [(i.kind, i.from_lap, i.to_lap) for i in doc.incidents] == [("SC", 2, 3)]


def test_an_undercut_counts_when_the_car_behind_stops_first_and_comes_out_ahead():
    # BBB is second, stops on lap 5; AAA (leader) stops on lap 7. After both stops BBB is ahead: success.
    a = driver("AAA", list(range(100, 1100, 100)), [1] * 6 + [2] * 4, pits=(7,))
    b = driver("BBB", list(range(103, 1103, 100)), [2] * 6 + [1] * 4, pits=(5,))
    doc = build_lap_doc(2024, 1, {"AAA": a, "BBB": b}, 10)
    assert [(u.attacker, u.defender, u.attacker_lap, u.defender_lap, u.success) for u in doc.undercuts] == [("BBB", "AAA", 5, 7, True)]


def test_a_stop_under_the_safety_car_is_not_an_undercut():
    a = driver("AAA", list(range(100, 1100, 100)), [1] * 10, pits=(7,))
    b = driver("BBB", list(range(103, 1103, 100)), [2] * 10, pits=(5,))
    for n in (4, 5, 6):
        for d in (a, b):
            d.laps[n] = dataclasses.replace(d.laps[n], track_status="4")
    assert build_lap_doc(2024, 1, {"AAA": a, "BBB": b}, 10).undercuts == []


def test_no_laps_means_no_document():
    assert build_lap_doc(2024, 1, {}, None) is None


def test_a_retired_cars_untimed_laps_are_not_driven_laps():
    from f1data.lapdoc import trim_untimed_tail

    times = [90.0, 90.0, 90.0, None, None, None]
    ends = [90.0, 180.0, 270.0, 360.0, 450.0, None]  # stamps for laps 4 and 5 that nobody drove
    assert trim_untimed_tail(times, ends) == [90.0, 180.0, 270.0, None, None, None]
    # a car that crossed the line on the last lap is untouched, even if one lap time is missing
    assert trim_untimed_tail([90.0, None, 90.0], [90.0, 180.0, 270.0]) == [90.0, 180.0, 270.0]
    assert trim_untimed_tail([None, None], [None, None]) == [None, None]


def test_a_retired_cars_laps_are_cut_back_to_the_official_count():
    from f1data.lapdoc import trim_to_official
    from f1data.models import LapDoc, LapDriver

    def driver(code):
        return LapDriver(code=code, lap_times=[90.0] * 5, gap=[0.0] * 5, best_sectors=[], top_speed_kph=None, end=[90.0, 180.0, 270.0, 360.0, 450.0])

    doc = LapDoc(season=2026, round=1, laps=5, status=["G"] * 5, incidents=[], undercuts=[], drivers=[driver("AAA"), driver("BBB")])
    trim_to_official(doc, {"AAA": 3})
    assert doc.drivers[0].end == [90.0, 180.0, 270.0, None, None]
    assert doc.drivers[1].end == [90.0, 180.0, 270.0, 360.0, 450.0]  # a car that is not retired is untouched

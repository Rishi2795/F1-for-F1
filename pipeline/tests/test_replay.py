import math
from datetime import UTC, datetime, timedelta

from f1data.models import LapDoc, LapDriver
from f1data.replay import Track, align, grid_fraction, grid_sensors, resample_closed

T0 = datetime(2026, 3, 1, 14, 0, 0, tzinfo=UTC)


def circle(n=600, r=1000.0):
    return [(r * math.cos(2 * math.pi * k / n), r * math.sin(2 * math.pi * k / n)) for k in range(n)]


def test_a_point_is_placed_by_how_far_round_the_lap_it_is():
    t = Track(circle())
    f, d = t.project(0, 1000)  # a quarter of the way round
    assert abs(f - 0.25) < 0.002 and d < 1
    f, d = t.project(1100, 0)  # just outside the start: 100 from the track, still at the line
    assert f < 0.002 or f > 0.998
    assert abs(d - 100) < 2


def test_a_nearby_stretch_cannot_steal_the_car():
    # Two arms of a hairpin 30 units apart: a car on one arm must not snap to the other when we know where it was.
    arm = [(x * 10.0, 0.0) for x in range(0, 100)] + [(990.0 - x * 10.0, 30.0) for x in range(0, 100)]
    t = Track(arm)
    on_return, _ = t.project(500, 25, near=0.75)
    on_out, _ = t.project(500, 25, near=0.25)
    assert on_return > 0.5 > on_out


def test_a_lap_is_resampled_to_even_points_and_too_little_is_refused():
    pts = resample_closed(circle(400))
    assert len(pts) == 600
    steps = [math.dist(pts[i], pts[(i + 1) % 600]) for i in range(600)]
    assert max(steps) - min(steps) < 1
    assert resample_closed(circle(50)) is None


def test_the_grid_goes_round_the_line_the_short_way_and_leaves_holes_empty():
    secs = [0.0, 1.0, 2.0, 10.0, 11.0]
    fracs = [0.98, 0.02, 0.06, 0.5, 0.52]
    out = grid_fraction(secs, fracs, 12)
    assert out[0] == 9800
    assert out[1] in (200, 199)  # through the line, not backwards across the lap
    assert out[2] == 600
    assert out[5] is None and out[9] is None  # an 8-second hole is not bridged
    assert out[10] == 5000


def test_sensors_land_on_the_grid_and_holes_are_empty():
    def row(t, speed, brake):
        return {"date": (T0 + timedelta(seconds=t)).isoformat(), "speed": speed, "throttle": 50, "brake": brake, "n_gear": 4, "rpm": 9000, "drs": 12}
    rows = [row(0, 100, 0), row(1, 200, 100), row(2, 300, 0), row(20, 300, 0), row(21, 300, 0)]
    c = grid_sensors(rows, T0, 22)
    assert c["speed"][0] == 100 and c["speed"][1] == 200 and c["speed"][2] == 300
    assert c["brake"][1] == 1 and c["drs"][1] == 1 and c["gear"][1] == 4
    assert c["speed"][10] is None and c["gear"][10] is None
    assert c["speed"][20] == 300


def test_the_two_clocks_are_lined_up_from_lap_starts_and_a_mismatch_is_visible():
    lap_ends = [90.0 * k for k in range(1, 61)]
    doc = LapDoc(season=2026, round=1, laps=60, status=["G"] * 60, incidents=[], undercuts=[],
                 drivers=[LapDriver(code="AAA", lap_times=[90.0] * 60, gap=[0.0] * 60, best_sectors=[], top_speed_kph=None, end=lap_ends)])

    def laps(shift, jitter=0.0):
        return [{"driver_number": 1, "lap_number": n + 1, "date_start": (T0 + timedelta(seconds=lap_ends[n - 1] + shift + (jitter if n % 2 else 0))).isoformat()} for n in range(1, 60)]
    off, spread = align(doc, laps(25.0), {"AAA": 1}, T0)
    assert abs(off - 25.0) < 1e-6 and spread < 1e-6
    _, bad = align(doc, laps(25.0, 20.0), {"AAA": 1}, T0)
    assert bad > 3  # the build would refuse this
    assert align(doc, laps(25.0)[:10], {"AAA": 1}, T0) is None  # too few laps to trust


def test_the_newest_races_are_chosen_by_round_number_not_file_name(tmp_path):
    from f1data.export import Publisher
    from f1data.replay import run_replay

    pub = Publisher(tmp_path)
    for rnd in (2, 9, 10, 21):
        (tmp_path / "seasons" / "2026").mkdir(parents=True, exist_ok=True)
        (tmp_path / "seasons" / "2026" / f"race_{rnd}.json").write_text("{}")
    asked: list[int] = []
    pub.load_race = lambda season, rnd: asked.append(rnd)  # records which rounds were looked at, in order
    run_replay(pub, [2026], openf1=object(), limit=2)
    assert asked == [21, 10]


def test_only_the_messages_that_explain_the_race_are_kept():
    from f1data.replay import classify

    assert classify("COLLISION INVOLVING CARS 4 (NOR) AND 81 (PIA)") == "collision"
    assert classify("CAR 14 (ALO) OFF TRACK AND STOPPED") == "stopped"
    assert classify("5 SECOND TIME PENALTY FOR CAR 1 (VER)") == "penalty"
    assert classify("SAFETY CAR DEPLOYED") == "safety_car"
    assert classify("VIRTUAL SAFETY CAR DEPLOYED") == "vsc"
    assert classify("RED FLAG") == "red_flag"
    assert classify("TURN 17 INCIDENT INVOLVING CARS 55 (SAI) NOTED - LEAVING THE TRACK") == "incident"
    assert classify("CAR 55 (SAI) TIME 1:33.932 DELETED - TRACK LIMITS AT TURN 17 LAP 25") is None
    assert classify("WAVED BLUE FLAG FOR CAR 18 (STR)") is None
    assert classify("FIA STEWARDS: INCIDENT INVOLVING CAR 55 (SAI) REVIEWED NO FURTHER INVESTIGATION") is None
    assert classify("PIT EXIT CLOSED") is None


def test_the_chequered_flag_is_not_a_red_flag_and_served_penalties_are_noise():
    from f1data.replay import classify

    assert classify("CHEQUERED FLAG") is None
    assert classify("RED FLAG") == "red_flag"
    assert classify("FIA STEWARDS: PENALTY SERVED - 10 SECOND TIME PENALTY FOR CAR 23 (ALB)") is None

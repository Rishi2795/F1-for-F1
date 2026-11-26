from f1data.build import RaceInputs, build_race
from f1data.consistency import fill_team_colors
from f1data.export import Publisher
from f1data.sources.tracinginsights import DriverLaps, RaceLaps

from tests.helpers import ENTRY, lap, result


def doc(rnd: int, color: str | None):
    rows = [result("VER", 1, 1, number=1), result("PER", 2, 2, number=11)]
    laps = RaceLaps("T", "2024-03-02", 10, {c: DriverLaps(c, n, [lap(1, team="Red Bull Racing")]) for c, n in (("VER", 1), ("PER", 11))},
                    {"VER": color, "PER": color} if color else {}, {"VER": "Red Bull Racing", "PER": "Red Bull Racing"} if color else {})
    entry = ENTRY.__class__(2024, rnd, f"GP {rnd}", "X", None, f"2024-03-{rnd:02d}")
    return build_race(RaceInputs(entry, rows, [], laps))


def test_team_name_comes_from_lap_rows_when_the_driver_file_is_missing():
    d = doc(2, None)  # no drivers.json for this race
    assert {x.team for x in d.drivers} == {"Red Bull Racing"}
    assert all(x.team_color is None for x in d.drivers)


def test_missing_colours_are_filled_from_the_teams_other_races(tmp_path):
    pub = Publisher(tmp_path)
    for rnd, color in ((1, "3671C6"), (2, None), (3, "3671C6")):
        d = doc(rnd, color)
        d.quality.status = "ok"
        pub.publish_race(d)
    assert fill_team_colors(pub, 2024) == 2  # both drivers of round 2
    assert {x.team_color for x in pub.load_race(2024, 2).drivers} == {"#3671C6"}
    assert fill_team_colors(pub, 2024) == 0  # idempotent

from f1data.build import RaceInputs, build_race
from f1data.export import Publisher
from f1data.models import SeasonStandings
from f1data.sources.jolpica import (
    ConstructorStandingRow,
    DriverStandingRow,
    _parse_constructor_standing,
    _parse_driver_standing,
)
from f1data.standings import build_season_standings

from tests.helpers import ENTRY, result


def drv(code, pos, pts, wins=0, team="Red Bull"):
    return DriverStandingRow(code, f"Driver {code}", pos, pts, wins, (team,))


def race_doc(rnd=1, points=25.0):
    rows = [result("VER", 1, 1), result("HAM", 2, 2)]
    doc = build_race(RaceInputs(ENTRY.__class__(2024, rnd, f"GP {rnd}", "X", None, "2024-03-02"), rows, [], None))
    doc.drivers[0].points = points
    doc.drivers[0].team, doc.drivers[0].team_color = "Red Bull Racing", "#3671C6"
    return doc


def test_parse_driver_standing_handles_missing_code_and_string_numbers():
    row = _parse_driver_standing({"position": "1", "points": "437", "wins": "9",
                                  "Driver": {"givenName": "Max", "familyName": "Verstappen", "code": "VER"},
                                  "Constructors": [{"name": "Red Bull"}]})
    assert (row.driver_code, row.position, row.points, row.wins, row.constructors) == ("VER", 1, 437.0, 9, ("Red Bull",))
    old = _parse_driver_standing({"position": "3", "points": "10", "wins": "0", "Driver": {"familyName": "Senna"}})
    assert old.driver_code == "SEN"
    assert _parse_driver_standing({"Driver": {}}) is None
    assert _parse_constructor_standing({"Constructor": {}}) is None


def test_constructor_names_are_mapped_to_our_team_names_and_colours():
    standings = build_season_standings(
        2024,
        {1: ("GP 1", [drv("VER", 1, 25)], [ConstructorStandingRow("Red Bull", 1, 25, 1)])},
        {1: race_doc()},
    )
    rnd = standings.rounds[0]
    assert rnd.drivers[0].team == "Red Bull Racing" and rnd.drivers[0].team_color == "#3671C6"
    assert rnd.drivers[0].number == 1  # the number raced with, not the driver's current permanent number
    assert rnd.constructors[0].name == "Red Bull Racing" and rnd.constructors[0].team_color == "#3671C6"


def test_unknown_driver_or_constructor_falls_back_without_crashing():
    standings = build_season_standings(2024, {1: ("GP 1", [drv("XXX", 1, 5, team="Mystery")], [ConstructorStandingRow("Mystery", 1, 5, 0)])}, {})
    assert standings.rounds[0].drivers[0].team == "Mystery" and standings.rounds[0].constructors[0].name == "Mystery"


def make(pub: Publisher, rounds_points: list[float], race_points: float = 25.0):
    pub.publish_race(race_doc(1, race_points))
    standings = build_season_standings(
        2024,
        {i + 1: (f"GP {i + 1}", [drv("VER", 1, p)], [ConstructorStandingRow("Red Bull", 1, p, 0)]) for i, p in enumerate(rounds_points)},
        {1: race_doc(1, race_points)},
    )
    return pub.publish_standings(standings)


def test_publisher_never_replaces_longer_standings_history_with_shorter(tmp_path):
    pub = Publisher(tmp_path)
    assert make(pub, [25, 50, 75]) == "written"
    assert make(pub, [25, 50, 75]) == "unchanged"
    shorter = SeasonStandings(season=2024, rounds=pub.load_standings(2024).rounds[:1])
    assert pub.publish_standings(shorter) == "kept_previous"
    assert len(pub.load_standings(2024).rounds) == 3


def test_validate_flags_standings_that_contradict_the_race_data(tmp_path):
    pub = Publisher(tmp_path)
    make(pub, [25, 50])
    assert not [p for p in pub._standings_problems(2024)]  # official points >= race points: fine (sprints add on)
    make(pub, [25, 50, 40])  # round 3 points went DOWN
    assert any("points went down" in p for p in pub._standings_problems(2024))
    pub2 = Publisher(tmp_path / "other")
    make(pub2, [10], race_points=25.0)  # official 10 < race points 25: impossible
    assert any("< race points" in p for p in pub2._standings_problems(2024))

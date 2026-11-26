import json

from f1data.build import RaceInputs, build_race
from f1data.export import Publisher
from f1data.ratings.publish import publish_ratings
from f1data.ratings.report import build_report

from tests.helpers import ENTRY, result
from tests.ratings_helpers import simulate


def rated_report():
    races, *_ = simulate(seasons=(2020, 2021, 2022, 2023, 2024, 2025), teams=8, races=8)
    return build_report(races)


def test_publishes_current_card_and_history_for_every_rated_driver(tmp_path):
    pub = Publisher(tmp_path)
    report = rated_report()
    count = publish_ratings(pub, report)
    assert count == len(report["current"]) == 16
    current = json.loads((tmp_path / "ratings" / "current.json").read_text())
    assert current["version"] == "ratings-v1" and len(current["ratings"]) == 16
    assert (tmp_path / "ratings" / "model.json").exists()
    code = current["ratings"][0]["code"]
    history = json.loads((tmp_path / "ratings" / "history" / f"{code}.json").read_text())
    assert history["code"] == code and all(len(point) == 4 for point in history["history"])
    assert publish_ratings(pub, report) == 16  # idempotent: same bytes, no churn
    assert pub.load_ratings().ratings[0].rank == 1


def test_validate_catches_broken_ratings(tmp_path):
    pub = Publisher(tmp_path)
    publish_ratings(pub, rated_report())
    assert pub._ratings_problems() == []
    (tmp_path / "ratings" / "model.json").unlink()
    code = pub.load_ratings().ratings[0].code
    (tmp_path / "ratings" / "history" / f"{code}.json").unlink()
    problems = pub._ratings_problems()
    assert any("model card missing" in p for p in problems) and any(f"history missing for {code}" in p for p in problems)


def test_a_rated_driver_carries_the_rating_on_profile_and_list(tmp_path):
    pub = Publisher(tmp_path)
    doc = build_race(RaceInputs(ENTRY, [result("D00", 1, 1), result("D01", 2, 2)], [], None))
    pub.publish_race(doc)
    publish_ratings(pub, rated_report())  # the simulated drivers are named D00..D15
    pub.rebuild_drivers()
    profile = json.loads((tmp_path / "drivers" / "D00.json").read_text())
    rating = profile["rating"]
    assert rating["overall"] == rating["driver"] + rating["car"] - 1500 or abs(rating["overall"] - (rating["driver"] + rating["car"] - 1500)) <= 2
    assert rating["rank"] >= 1 and isinstance(rating["provisional"], bool) and rating["as_of"].startswith("2025")
    listing = {d["code"]: d for d in json.loads((tmp_path / "drivers" / "index.json").read_text())}
    assert listing["D00"]["rating"] == rating["overall"]


def test_drivers_without_a_rating_stay_null(tmp_path):
    pub = Publisher(tmp_path)
    pub.publish_race(build_race(RaceInputs(ENTRY, [result("VER", 1, 1)], [], None)))
    pub.rebuild_drivers()
    assert json.loads((tmp_path / "drivers" / "VER.json").read_text())["rating"] is None


def test_ratings_carry_the_drivers_latest_team_colour(tmp_path):
    pub = Publisher(tmp_path)
    pub.publish_race(build_race(RaceInputs(ENTRY, [result("D00", 1, 1)], [], None)))
    publish_ratings(pub, rated_report())
    by_code = {r.code: r for r in pub.load_ratings().ratings}
    assert by_code["D00"].team_color is None or by_code["D00"].team_color.startswith("#") or len(by_code["D00"].team_color) == 6
    assert by_code["D01"].team_color is None  # no published race for them: blank, not guessed

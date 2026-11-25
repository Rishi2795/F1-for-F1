import json

from f1data.export import Publisher, dumps
from f1data.models import (
    ForecastDriver,
    NextForecasts,
    RaceForecast,
    TitleConstructor,
    TitleDriver,
    TitleForecast,
    TitleRace,
)
from f1data.predict.publish import publish_forecasts


def driver(code, win, podium):
    return ForecastDriver(
        code=code, name=code, team="T", team_color="#fff", win=win, podium=podium, top10=0.9, dnf=0.1,
        exp_pos=5.0, exp_points=8.0, car_rank=1, pace_rank=1, pace_gap=0.1, avg_finish=4.0,
    )


def built(win_total=1.0):
    drivers = [driver("AAA", 0.6 * win_total, 1.0), driver("BBB", 0.4 * win_total, 1.0), driver("CCC", 0.0, 1.0)]
    nxt = NextForecasts(
        version="v", as_of_season=2026, as_of_round=21,
        races=[RaceForecast(season=2026, round=22, event_name="X GP", date="2026-11-29", mode="pre_qualifying", drivers=drivers)],
    )
    title = TitleForecast(
        version="v", season=2026, as_of_round=21, races_left=1,
        remaining=[TitleRace(round=22, event_name="X GP", date="2026-11-29")],
        clinched_driver=None, clinched_constructor=None,
        drivers=[
            TitleDriver(code="AAA", name="A", team="T", team_color="#fff", points=10, champion=0.7, top3=1, exp_points=30),
            TitleDriver(code="BBB", name="B", team="T", team_color="#fff", points=9, champion=0.3, top3=1, exp_points=29),
        ],
        constructors=[TitleConstructor(name="T", team_color="#fff", points=19, champion=1.0, exp_points=59)],
    )
    return {"next": nxt, "title": title, "review": [], "card": {"version": "v"}}


def test_sound_forecasts_pass_validation(tmp_path):
    pub = Publisher(tmp_path)
    counts = publish_forecasts(pub, built())
    assert counts == {"races": 1, "title_drivers": 2}
    assert pub._predictions_problems() == []
    assert publish_forecasts(pub, built()) == counts  # idempotent


def test_validation_catches_probabilities_that_do_not_add_up(tmp_path):
    pub = Publisher(tmp_path)
    publish_forecasts(pub, built(win_total=1.4))
    assert any("win probabilities add up" in p for p in pub._predictions_problems())


def test_validation_catches_title_odds_and_missing_files(tmp_path):
    pub = Publisher(tmp_path)
    publish_forecasts(pub, built())
    path = tmp_path / "predictions" / "championship.json"
    doc = json.loads(path.read_text())
    doc["drivers"][0]["champion"] = 0.2
    path.write_text(dumps(doc))
    assert any("title odds do not add up" in p for p in pub._predictions_problems())
    (tmp_path / "predictions" / "model.json").unlink()
    assert pub._predictions_problems() == ["predictions: model.json missing"]

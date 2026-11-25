from f1data.export import Publisher
from f1data.models import RaceIndex, RaceIndexEntry, WeekendSession
from f1data.schedule import refresh_sessions


def entry(rnd, sessions=()):
    return RaceIndexEntry(season=2026, round=rnd, event_name=f"GP {rnd}", location="X", country="Y", date="2026-11-29",
                          data_status="scheduled", sessions=list(sessions))


class FakeJolpica:
    def weekend_sessions(self, season, ttl=None):
        return {22: [("Practice 1", "2026-11-27T13:30:00Z"), ("Qualifying", "2026-11-28T18:00:00Z"), ("Race", "2026-11-29T16:00:00Z")]}


def test_session_times_are_added_to_the_index_and_nothing_else_changes(tmp_path):
    pub = Publisher(tmp_path)
    pub.publish_index(RaceIndex(season=2026, races=[entry(21), entry(22)]))
    assert refresh_sessions(pub, FakeJolpica(), 2026) == 1
    race = pub.load_index(2026).races[1]
    assert [s.name for s in race.sessions] == ["Practice 1", "Qualifying", "Race"]
    assert pub.load_index(2026).races[0].sessions == []  # a round with no timetable stays empty, never invented
    assert refresh_sessions(pub, FakeJolpica(), 2026) == 0  # nothing new: no rewrite


def test_rebuilding_the_index_keeps_the_timetables(tmp_path):
    pub = Publisher(tmp_path)
    pub.publish_index(RaceIndex(season=2026, races=[entry(22, [WeekendSession(name="Race", starts="2026-11-29T16:00:00Z")])]))
    pub.publish_index(RaceIndex(season=2026, races=[entry(22)]))  # an ingest builds entries without sessions
    assert pub.load_index(2026).races[0].sessions[0].starts == "2026-11-29T16:00:00Z"

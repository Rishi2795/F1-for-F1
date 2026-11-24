"""Load the published race documents as light records for the rating model."""

from __future__ import annotations

from dataclasses import dataclass

from ..export import Publisher
from ..models import RaceDoc
from .lineage import lineage


@dataclass(frozen=True)
class Starter:
    code: str
    name: str
    team: str
    key: str  # team lineage key
    finish: int | None
    classified: bool
    grid: int | None  # None = pit-lane start / unknown


@dataclass(frozen=True)
class RaceRecord:
    season: int
    round: int
    starters: tuple[Starter, ...]

    @property
    def winner(self) -> str | None:
        return next((s.code for s in self.starters if s.finish == 1 and s.classified), None)


def to_record(doc: RaceDoc) -> RaceRecord:
    return RaceRecord(
        season=doc.season,
        round=doc.round,
        starters=tuple(
            Starter(d.driver_code, d.driver_name, d.team, lineage(d.team), d.finish, d.classified, d.grid)
            for d in doc.drivers
        ),
    )


def load_races(publisher: Publisher, min_starters: int = 10) -> list[RaceRecord]:
    records: list[RaceRecord] = []
    for season in sorted(publisher.published_seasons()):
        for path in (publisher.root / "seasons" / str(season)).glob("race_*.json"):
            doc = publisher.load_race(season, int(path.stem.split("_")[1]))
            if doc and len(doc.drivers) >= min_starters:
                records.append(to_record(doc))
    return sorted(records, key=lambda r: (r.season, r.round))

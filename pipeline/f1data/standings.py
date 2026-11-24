"""Build a season's championship standings document from official standings plus our race data.

Team names and colours come from the race documents (so they match the rest of the site);
Jolpica's constructor names are mapped to ours by which of our drivers raced for them.
"""

from __future__ import annotations

from collections import Counter

from .models import RaceDoc, SeasonStandings, StandingsConstructor, StandingsDriver, StandingsRound
from .sources.jolpica import ConstructorStandingRow, DriverStandingRow

Directory = dict[str, tuple[str, str | None, int | None]]


def _team_directory(race_docs: dict[int, RaceDoc], up_to_round: int) -> Directory:
    """driver code -> (team, colour, race number) from their most recent race on or before ``up_to_round``."""
    directory: Directory = {}
    for rnd in sorted(r for r in race_docs if r <= up_to_round):
        for drv in race_docs[rnd].drivers:
            directory[drv.driver_code] = (drv.team, drv.team_color, drv.driver_number)
    return directory


def _constructor_names(drivers: list[DriverStandingRow], directory: Directory) -> dict[str, tuple[str, str | None]]:
    """Jolpica constructor name -> (our team name, colour), by majority vote of the drivers who raced for it."""
    votes: dict[str, Counter[tuple[str, str | None]]] = {}
    for row in drivers:
        if row.driver_code in directory and row.constructors:
            team, color, _ = directory[row.driver_code]
            votes.setdefault(row.constructors[-1], Counter())[(team, color)] += 1
    return {name: counter.most_common(1)[0][0] for name, counter in votes.items()}


def build_season_standings(
    season: int,
    per_round: dict[int, tuple[str, list[DriverStandingRow], list[ConstructorStandingRow]]],
    race_docs: dict[int, RaceDoc],
) -> SeasonStandings:
    """``per_round``: round -> (event name, driver standings, constructor standings)."""
    rounds: list[StandingsRound] = []
    for rnd in sorted(per_round):
        event_name, driver_rows, constructor_rows = per_round[rnd]
        directory = _team_directory(race_docs, rnd)
        names = _constructor_names(driver_rows, directory)
        drivers = []
        for row in driver_rows:
            team, color, number = directory.get(row.driver_code, (None, None, None))
            fallback_team = row.constructors[-1] if row.constructors else None
            drivers.append(
                StandingsDriver(
                    code=row.driver_code, name=row.driver_name, number=number, team=team or fallback_team,
                    team_color=color, position=row.position, points=row.points, wins=row.wins,
                )
            )
        constructors = [
            StandingsConstructor(
                name=names.get(row.name, (row.name, None))[0], team_color=names.get(row.name, (row.name, None))[1],
                position=row.position, points=row.points, wins=row.wins,
            )
            for row in constructor_rows
        ]
        rounds.append(StandingsRound(round=rnd, event_name=event_name, drivers=drivers, constructors=constructors))
    return SeasonStandings(season=season, rounds=rounds)

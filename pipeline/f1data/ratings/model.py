"""The rating model.

Every driver has a *skill* d and every car programme a *strength* c. A driver's pace is s = d + c, and the
chance that driver i finishes ahead of driver j is the logistic of (s_i - s_j).

Identification comes from teammates. Two drivers in the same car share c, so a duel between them can only
move their *skill* ratings; results against other teams move the *car* ratings. A driver who changes team
carries their skill with them, which is what ties the whole network together.

Ratings update after every race (an online gradient step on the pairwise log-loss) and shrink toward zero at
each season boundary, harder when the regulations change.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from .data import RaceRecord, Starter
from .lineage import REGULATION_CHANGES

# Elo points per unit of log-odds, so that a 400-point gap means 10:1 odds, as in chess.
SCALE = 400 / math.log(10)
BASE = 1500


def sigmoid(z: float) -> float:
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    e = math.exp(z)
    return e / (1.0 + e)


@dataclass(frozen=True)
class Params:
    k_driver: float  # learning rate for driver skill
    k_car: float  # learning rate for car strength
    driver_carry: float  # share of driver skill kept into a new season
    car_carry: float  # share of car strength kept into a new season
    reg_carry: float  # ... when the regulations changed


class RatingModel:
    def __init__(self, params: Params) -> None:
        self.params = params
        self.driver: dict[str, float] = {}
        self.car: dict[str, float] = {}
        self.season: int | None = None

    # -- state ----------------------------------------------------------------
    def strength(self, s: Starter) -> float:
        return self.driver.get(s.code, 0.0) + self.car.get(s.key, 0.0)

    def start_season(self, season: int) -> None:
        """Shrink ratings toward zero at a season boundary (harder after a regulation change)."""
        if self.season is not None and season != self.season:
            car_keep = self.params.reg_carry if season in REGULATION_CHANGES else self.params.car_carry
            self.car = {k: v * car_keep for k, v in self.car.items()}
            self.driver = {k: v * self.params.driver_carry for k, v in self.driver.items()}
        self.season = season

    def field_mean_car(self, starters: tuple[Starter, ...]) -> float:
        keys = {s.key for s in starters}
        return sum(self.car.get(k, 0.0) for k in keys) / len(keys) if keys else 0.0

    # -- update ---------------------------------------------------------------
    def update(self, race: RaceRecord) -> None:
        """Learn from one race. Only classified finishers count: a retirement's position says little about pace."""
        field = [s for s in race.starters if s.classified and s.finish is not None]
        n = len(field)
        if n < 4:
            return
        s = {x.code: self.strength(x) for x in field}  # strengths BEFORE this race: no peeking
        driver_step: dict[str, float] = {}
        team_members: dict[str, list[Starter]] = {}
        for x in field:
            team_members.setdefault(x.key, []).append(x)

        car_error: dict[str, float] = {k: 0.0 for k in team_members}
        for x in field:
            mates = [m for m in team_members[x.key] if m.code != x.code]
            others = n - len(team_members[x.key])
            mate_err = other_err = 0.0
            for y in field:
                if y.code == x.code:
                    continue
                outcome = 1.0 if x.finish < y.finish else 0.0  # type: ignore[operator]
                err = outcome - sigmoid(s[x.code] - s[y.code])
                if y.key == x.key:
                    mate_err += err
                else:
                    other_err += err
            if mates:
                driver_step[x.code] = self.params.k_driver * mate_err / len(mates)
            if others:
                car_error[x.key] += other_err / others / len(team_members[x.key])

        for code, step in driver_step.items():
            self.driver[code] = self.driver.get(code, 0.0) + step
        for key, err in car_error.items():
            self.car[key] = self.car.get(key, 0.0) + self.params.k_car * err

    # -- display --------------------------------------------------------------
    def elo(self, value: float) -> int:
        return round(BASE + SCALE * value)

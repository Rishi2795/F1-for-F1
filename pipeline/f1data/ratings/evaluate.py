"""Walk-forward evaluation engine for the rating model.

Rules that keep the numbers trustworthy:
- A race is predicted from ratings learned from EARLIER races only (ratings update after the prediction).
- Hyperparameters are tuned on the TUNE seasons only; the TEST seasons are scored once, after tuning.
- Baselines get the same data and the same fitting budget (weights fitted on the TUNE seasons too).
- Only pairs of classified finishers are scored; a retirement's position says little about pace.
"""

from __future__ import annotations

import itertools
import math
from collections.abc import Callable
from dataclasses import dataclass

from .data import RaceRecord
from .model import Params, RatingModel, sigmoid

WARMUP_BEFORE = 2021  # seasons before this only train the model
TUNE_SEASONS = (2021, 2022, 2023)
TEST_SEASONS = (2024, 2025, 2026)
FORM_WINDOW = 5
NEUTRAL_FORM = 10.5

# Hyperparameters are found by coordinate search (below): step each one up and down, keep what helps, shrink the
# step when nothing does. A fixed grid kept returning edge values, i.e. the optimum lay outside it.
START = Params(k_driver=0.10, k_car=0.50, driver_carry=1.0, car_carry=0.70, reg_carry=0.30)
BOUNDS = {
    "k_driver": (0.005, 1.0),
    "k_car": (0.05, 3.0),
    "driver_carry": (0.5, 1.0),
    "car_carry": (0.0, 1.0),
    "reg_carry": (0.0, 1.0),
}
MULTIPLICATIVE = ("k_driver", "k_car")  # learning rates move by a factor; carry-overs by an amount
GRID_TRANSFORMS = ("linear", "log")


@dataclass(frozen=True)
class Pair:
    """One "finished ahead of" comparison, with every feature oriented from the WINNER's side."""

    season: int
    round: int
    rating_diff: float  # winner's pre-race strength minus loser's
    grid_winner: int  # grid slots (a pit-lane start counts as last)
    grid_loser: int
    form_diff: float  # loser's recent average finish minus winner's (positive: winner in better form)

    def grid_feature(self, transform: str) -> float:
        """How much further up the grid the winner started, linear or on a log scale (front-row starts matter most)."""
        if transform == "log":
            return math.log(self.grid_loser) - math.log(self.grid_winner)
        return float(self.grid_loser - self.grid_winner)


@dataclass
class Snapshot:
    """The pre-race view of one race, for "who wins?" scoring."""

    season: int
    round: int
    winner: str | None
    strength: dict[str, float]
    grid: dict[str, int]


@dataclass
class Run:
    pairs: list[Pair]
    snapshots: list[Snapshot]
    history: dict[str, list[list[int]]]  # driver code -> [season, round, driver rating, car rating]
    model: RatingModel


def walk_forward(races: list[RaceRecord], params: Params, *, history: bool = False) -> Run:
    model = RatingModel(params)
    recent: dict[str, list[int]] = {}
    pairs: list[Pair] = []
    snapshots: list[Snapshot] = []
    trail: dict[str, list[list[int]]] = {}
    for race in races:
        model.start_season(race.season)
        slots = len(race.starters) + 1  # a pit-lane start counts as the last grid slot
        grid = {s.code: (s.grid if s.grid is not None else slots) for s in race.starters}
        strength = {s.code: model.strength(s) for s in race.starters}
        form = {
            s.code: (sum(recent[s.code]) / len(recent[s.code]) if recent.get(s.code) else NEUTRAL_FORM)
            for s in race.starters
        }
        finishers = sorted(
            (s for s in race.starters if s.classified and s.finish is not None), key=lambda s: s.finish or 0
        )
        if race.season >= WARMUP_BEFORE:
            for ahead, behind in itertools.combinations(finishers, 2):  # in finishing order: ahead beat behind
                pairs.append(
                    Pair(
                        race.season,
                        race.round,
                        strength[ahead.code] - strength[behind.code],
                        grid[ahead.code],
                        grid[behind.code],
                        form[behind.code] - form[ahead.code],
                    )
                )
            snapshots.append(Snapshot(race.season, race.round, race.winner, strength, grid))
        model.update(race)
        for s in finishers:
            recent.setdefault(s.code, []).append(s.finish or 0)
            recent[s.code] = recent[s.code][-FORM_WINDOW:]
        if history:
            mean_car = model.field_mean_car(race.starters)
            for s in race.starters:
                skill, car = model.driver.get(s.code, 0.0), model.car.get(s.key, 0.0) - mean_car
                trail.setdefault(s.code, []).append([race.season, race.round, model.elo(skill), model.elo(car)])
    return Run(pairs, snapshots, trail, model)


# -- scoring ----------------------------------------------------------------------------------------------------
Scorer = Callable[[Pair], float]  # log-odds that the eventual winner beats the loser


def softplus_neg(z: float) -> float:
    """-log(sigmoid(z)), stable for large |z|."""
    return max(-z, 0.0) + math.log1p(math.exp(-abs(z)))


def score(pairs: list[Pair], z: Scorer) -> dict[str, float]:
    """Log-loss (lower is better) and accuracy of ``z`` over ``pairs``. A tie counts half."""
    if not pairs:
        return {"log_loss": float("nan"), "accuracy": float("nan"), "pairs": 0}
    values = [z(p) for p in pairs]
    loss = sum(softplus_neg(v) for v in values) / len(values)
    accuracy = sum(1.0 if v > 0 else 0.5 if v == 0 else 0.0 for v in values) / len(values)
    return {"log_loss": round(loss, 4), "accuracy": round(accuracy, 4), "pairs": len(values)}


def _solve(matrix: list[list[float]], rhs: list[float]) -> list[float]:
    """Solve matrix x = rhs by Gauss-Jordan elimination (the systems here are 1x1 or 2x2)."""
    n = len(rhs)
    aug = [row[:] + [rhs[i]] for i, row in enumerate(matrix)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(aug[r][col]))
        aug[col], aug[pivot] = aug[pivot], aug[col]
        for r in range(n):
            if r != col and aug[col][col]:
                factor = aug[r][col] / aug[col][col]
                aug[r] = [x - factor * y for x, y in zip(aug[r], aug[col], strict=True)]
    return [aug[i][n] / aug[i][i] if aug[i][i] else 0.0 for i in range(n)]


def fit_logistic(rows: list[list[float]], iterations: int = 30, ridge: float = 1e-6) -> list[float]:
    """Weights w minimising sum(-log sigmoid(w . x)) over winner-oriented feature rows (Newton's method).

    No intercept is needed: every pair is oriented the same way, so the model is antisymmetric by construction."""
    k = len(rows[0])
    w = [0.0] * k
    for _ in range(iterations):
        gradient = [ridge * wi for wi in w]
        hessian = [[ridge if a == b else 0.0 for b in range(k)] for a in range(k)]
        for x in rows:
            p = sigmoid(sum(wi * xi for wi, xi in zip(w, x, strict=True)))
            for a in range(k):
                gradient[a] -= (1 - p) * x[a]
                for b in range(k):
                    hessian[a][b] += p * (1 - p) * x[a] * x[b]
        step = _solve(hessian, gradient)
        w = [wi - si for wi, si in zip(w, step, strict=True)]
        if max(abs(s) for s in step) < 1e-9:
            break
    return w


def _tune_loss(races: list[RaceRecord], params: Params) -> float:
    run = walk_forward(races, params)
    pairs = [p for p in run.pairs if p.season in TUNE_SEASONS]
    return score(pairs, lambda p: p.rating_diff)["log_loss"]


def tune(races: list[RaceRecord], max_rounds: int = 12) -> tuple[Params, dict]:
    """Coordinate search for the hyperparameters with the lowest RAW-ratings log-loss on the TUNE seasons.

    Returns the best parameters and a small summary of the search (start, end, evaluations)."""
    best, best_loss = START, _tune_loss(races, START)
    start_loss, evaluations = best_loss, 1
    factor, delta = 1.6, 0.15
    stalled = 0
    for _ in range(max_rounds):
        improved = False
        for name, (low, high) in BOUNDS.items():
            current = getattr(best, name)
            if name in MULTIPLICATIVE:
                candidates = (current * factor, current / factor)
            else:
                candidates = (current + delta, current - delta)
            for value in candidates:
                value = min(high, max(low, value))
                if value == current:
                    continue
                trial = Params(**{**best.__dict__, name: value})
                loss = _tune_loss(races, trial)
                evaluations += 1
                if loss < best_loss - 1e-5:
                    best, best_loss, improved = trial, loss, True
        if improved:
            stalled = 0
        else:
            stalled += 1
            if stalled >= 3:
                break
            factor, delta = factor ** 0.5, delta / 2  # finer steps
    return best, {"start_log_loss": start_loss, "best_log_loss": best_loss, "evaluations": evaluations}


def choose_grid_transform(pairs: list[Pair]) -> tuple[str, dict[str, float]]:
    """Linear or log grid feature, by leave-one-season-out cross-validation of the grid-only model (TUNE seasons)."""
    cv: dict[str, float] = {}
    for transform in GRID_TRANSFORMS:
        losses = []
        for held_out in TUNE_SEASONS:
            train = [p for p in pairs if p.season in TUNE_SEASONS and p.season != held_out]
            test = [p for p in pairs if p.season == held_out]
            w = fit_logistic([[p.grid_feature(transform)] for p in train])
            losses.append(score(test, lambda p, w=w, t=transform: w[0] * p.grid_feature(t))["log_loss"])
        cv[transform] = round(sum(losses) / len(losses), 4)
    return min(cv, key=lambda t: cv[t]), cv


def calibration(pairs: list[Pair], z: Scorer, bins: int = 10) -> list[dict]:
    """Reliability: both orientations of every pair, binned by predicted win probability."""
    cells = [[0, 0.0, 0.0] for _ in range(bins)]  # count, sum predicted, sum observed
    for pair in pairs:
        p = sigmoid(z(pair))
        for predicted, observed in ((p, 1.0), (1 - p, 0.0)):
            cell = cells[min(bins - 1, int(predicted * bins))]
            cell[0] += 1
            cell[1] += predicted
            cell[2] += observed
    return [
        {
            "bin": f"{i / bins:.1f}-{(i + 1) / bins:.1f}",
            "predicted": round(c[1] / c[0], 3),
            "observed": round(c[2] / c[0], 3),
            "n": c[0],
        }
        for i, c in enumerate(cells)
        if c[0]
    ]

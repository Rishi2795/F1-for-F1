"""Walk-forward evaluation of the race forecast.

Same rules as the rating model's evaluation, so the numbers can be trusted:
- a race is forecast from earlier races only;
- weights are fitted on the TUNE seasons only and the TEST seasons are scored once;
- every model, and the baselines, get the same data and the same fitting budget.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

from ..ratings.model import Params
from . import plackett
from .state import Config, Feat, PRace, PStarter, Tracker

WARMUP_BEFORE = 2020  # earlier seasons (2019) only teach the models
TUNE_SEASONS = (2021, 2022, 2023)
TEST_SEASONS = (2024, 2025, 2026)
TRIALS = 2000

# which entries of the feature vector each variant uses: pre-qualifying vector = [rating, pace, form],
# post-qualifying vector = [rating, grid, quali, pace, form]
VARIANTS: dict[str, tuple[bool, list[int]]] = {
    "grid_only": (True, [1]),
    "ratings_only": (False, [0]),
    "ratings_pace": (False, [0, 1]),
    "ratings_pace_form": (False, [0, 1, 2]),  # the published pre-qualifying forecast
    "ratings_grid": (True, [0, 1]),
    "everything_with_grid": (True, [0, 1, 3, 4]),
    "everything_with_quali": (True, [0, 1, 2, 3, 4]),  # the published post-qualifying forecast
}
PRE = "ratings_pace_form"
POST = "everything_with_quali"
FEATURE_NAMES = {
    False: ["ratings", "recent car pace", "recent form"],
    True: ["ratings", "grid slot", "qualifying gap", "recent car pace", "recent form"],
}
CONFIGS = [Config(f, p, 20) for f in (3, 5, 8) for p in (2, 3, 5)]


@dataclass
class Sample:
    race: PRace
    pre: list[Feat]
    post: list[Feat]

    def winner(self) -> int | None:
        return next((i for i, s in enumerate(self.race.starters) if s.finish == 1 and s.classified), None)


@dataclass
class Timeline:
    samples: list[Sample] = field(default_factory=list)
    after: dict[tuple[int, int], Tracker] = field(default_factory=dict)  # tracker state after each race
    tracker: Tracker | None = None  # state after the last race
    races: list[PRace] = field(default_factory=list)


def build_timeline(races: list[PRace], params: Params, config: Config | None = None) -> Timeline:
    tl = Timeline(races=races)
    tracker = Tracker(params, config)
    for race in races:
        tracker.start_season(race.season)
        if race.season >= WARMUP_BEFORE:
            tl.samples.append(
                Sample(
                    race,
                    tracker.features(race.starters, grid_known=False),
                    tracker.features(race.starters, grid_known=True),
                )
            )
        tracker.learn(race)
        tl.after[(race.season, race.round)] = tracker.clone()
    tl.tracker = tracker
    return tl


def _vec(feat: Feat, with_grid: bool, idx: list[int]) -> list[float]:
    full = feat.vector(with_grid)
    return [full[i] for i in idx]


def orders(samples: list[Sample], with_grid: bool, idx: list[int]) -> list[list[list[float]]]:
    out = []
    for s in samples:
        feats = s.post if with_grid else s.pre
        ranked = sorted(
            (
                (st.finish, f)
                for st, f in zip(s.race.starters, feats, strict=True)
                if st.classified and st.finish is not None
            ),
            key=lambda t: t[0] or 0,
        )
        if len(ranked) >= 4:
            out.append([_vec(f, with_grid, idx) for _, f in ranked])
    return out


def fit_variant(samples: list[Sample], variant: str) -> list[float]:
    """Plackett-Luce weights from whole finishing orders, then one temperature to fix the front of the field.

    Whole orders are mostly midfield shuffling, which makes the fitted weights too flat for picking winners.
    A single scale, chosen on the training races' winners only, corrects that without adding any feature.
    """
    with_grid, idx = VARIANTS[variant]
    init = [1.0 if i == 0 and (not with_grid or idx[0] == 0) else 0.0 for i in range(len(idx))]
    w = plackett.fit(orders(samples, with_grid, idx), len(idx), init=init)
    return [x * _temperature(samples, variant, w) for x in w]


def _temperature(samples: list[Sample], variant: str, w: list[float]) -> float:
    """The scale that best explains who finished in the top three (not only who won), on training races only."""
    rows = []
    for s in samples:
        ranked = sorted(
            (i for i, st in enumerate(s.race.starters) if st.classified and st.finish is not None),
            key=lambda i: s.race.starters[i].finish or 0,
        )
        if len(ranked) >= 4:
            st, _ = strengths(s, variant, w)
            rows.append([st[i] for i in ranked])
    best, best_loss = 1.0, float("inf")
    for step in range(10, 41):
        tau = step / 10
        loss = 0.0
        for st in rows:
            for place in range(3):
                rest = [tau * x for x in st[place:]]
                top = max(rest)
                loss -= rest[0] - top - math.log(sum(math.exp(x - top) for x in rest))
        if loss < best_loss:
            best, best_loss = tau, loss
    return best


def strengths(sample: Sample, variant: str, w: list[float]) -> tuple[list[float], list[float]]:
    with_grid, idx = VARIANTS[variant]
    feats = sample.post if with_grid else sample.pre
    return [sum(a * b for a, b in zip(w, _vec(f, with_grid, idx), strict=True)) for f in feats], [
        f.p_dnf for f in feats
    ]


def _round(x: float, digits: int = 4) -> float:
    return round(x, digits)


def score(groups: list[tuple[list[Sample], list[float]]], variant: str, base_dnf: float) -> dict:
    with_grid, idx = VARIANTS[variant]
    ll_total = 0.0
    positions = 0
    win_logs: list[float] = []
    top1 = 0
    podium_se = dnf_se = dnf_base_se = uniform_pod_se = 0.0
    starts = 0
    calib: list[tuple[float, int]] = []
    for samples, w in groups:
        for s in samples:
            st, p_dnf = strengths(s, variant, w)
            odds = plackett.race_odds(st, p_dnf, TRIALS, s.race.season * 100 + s.race.round)
            n = len(st)
            winner = s.winner()
            if winner is not None:
                p = max(odds[winner]["win"], 0.5 / TRIALS)
                win_logs.append(-math.log(p))
                top1 += max(range(n), key=lambda i: odds[i]["win"]) == winner
            for i, starter in enumerate(s.race.starters):
                podium = 1 if starter.classified and starter.finish is not None and starter.finish <= 3 else 0
                podium_se += (odds[i]["podium"] - podium) ** 2
                uniform_pod_se += (3 / n - podium) ** 2
                out = 0 if starter.classified else 1
                dnf_se += (odds[i]["dnf"] - out) ** 2
                dnf_base_se += (base_dnf - out) ** 2
                calib.append((odds[i]["win"], 1 if starter.finish == 1 and starter.classified else 0))
                starts += 1
        ord_ = orders(samples, with_grid, idx)
        ll_total += plackett.loglik(ord_, w)
        positions += sum(len(o) - 1 for o in ord_)
    positions = positions or 1
    races = len(win_logs) or 1
    return {
        "races": sum(len(g) for g, _ in groups),
        "winner_log_loss": _round(sum(win_logs) / races),
        "winner_top1": _round(top1 / races),
        "podium_brier": _round(podium_se / starts),
        "order_log_likelihood_per_place": _round(ll_total / positions),
        "dnf_brier": _round(dnf_se / starts),
        "calibration": _calibration(calib),
        "_baselines": {
            "podium_brier_uniform": _round(uniform_pod_se / starts),
            "dnf_brier_constant": _round(dnf_base_se / starts),
        },
    }


def _calibration(points: list[tuple[float, int]]) -> list[dict]:
    edges = [0.0, 0.02, 0.05, 0.1, 0.2, 0.4, 1.0001]
    rows = []
    for lo, hi in zip(edges, edges[1:], strict=False):
        group = [(p, o) for p, o in points if lo <= p < hi]
        if group:
            rows.append(
                {
                    "bin": f"{lo:.2f}-{min(hi, 1.0):.2f}",
                    "predicted": _round(sum(p for p, _ in group) / len(group)),
                    "observed": _round(sum(o for _, o in group) / len(group)),
                    "n": len(group),
                }
            )
    return rows


def uniform_winner_log_loss(samples: list[Sample]) -> float:
    logs = [math.log(len(s.race.starters)) for s in samples if s.winner() is not None]
    return _round(sum(logs) / len(logs))


@dataclass
class Evaluation:
    weights: dict[str, list[float]]  # fitted on the tune seasons only
    final_weights: dict[str, list[float]]  # refitted on every race so far: what the live forecast uses
    metrics: dict[str, dict]
    uniform_log_loss: float
    base_dnf: float
    review: list[dict]
    tune_races: int
    test_races: int


def expanding_groups(tl: Timeline, variant: str) -> list[tuple[list[Sample], list[float]]]:
    """For each test season, the weights fitted on every earlier season (2020 on): nothing from the future."""
    groups = []
    for season in TEST_SEASONS:
        test = [s for s in tl.samples if s.race.season == season]
        past = [s for s in tl.samples if s.race.season < season]
        if test and past:
            groups.append((test, fit_variant(past, variant)))
    return groups


def _top3_loss(samples: list[Sample], w: list[float]) -> float:
    """Average negative log-likelihood of who finished 1st, 2nd and 3rd (the front of the field)."""
    loss = races = 0.0
    for s in samples:
        ranked = sorted(
            (i for i, st in enumerate(s.race.starters) if st.classified and st.finish is not None),
            key=lambda i: s.race.starters[i].finish or 0,
        )
        if len(ranked) < 4:
            continue
        st, _ = strengths(s, PRE, w)
        order = [st[i] for i in ranked]
        for place in range(3):
            rest = order[place:]
            top = max(rest)
            loss -= rest[0] - top - math.log(sum(math.exp(x - top) for x in rest))
        races += 1
    return loss / max(races, 1)


def tune_config(races: list[PRace], params: Params) -> tuple[Config, list[dict]]:
    """Pick the memory lengths on the tuning seasons: fit on all but the last, score on the last."""
    rows = []
    best, best_loss = Config(), float("inf")
    for cfg in CONFIGS:
        tl = build_timeline(races, params, cfg)
        fit_on = [s for s in tl.samples if s.race.season in TUNE_SEASONS[:-1]]
        score_on = [s for s in tl.samples if s.race.season == TUNE_SEASONS[-1]]
        loss = _top3_loss(score_on, fit_variant(fit_on, PRE))
        rows.append({"form_window": cfg.form_window, "pace_window": cfg.pace_window, "loss": round(loss, 4)})
        if loss < best_loss:
            best, best_loss = cfg, loss
    return best, rows


def evaluate(tl: Timeline) -> Evaluation:
    tune = [s for s in tl.samples if s.race.season in TUNE_SEASONS]
    test = [s for s in tl.samples if s.race.season in TEST_SEASONS]
    starts = [st for s in tune for st in s.race.starters]
    base_dnf = sum(1 for st in starts if not st.classified) / len(starts)
    weights = {v: fit_variant(tune, v) for v in VARIANTS}
    final = {v: fit_variant(tl.samples, v) for v in VARIANTS}
    metrics = {v: score(expanding_groups(tl, v), v, base_dnf) for v in VARIANTS}
    return Evaluation(
        weights,
        final,
        metrics,
        uniform_winner_log_loss(test),
        _round(base_dnf),
        review(expanding_groups(tl, PRE)),
        len(tune),
        len(test),
    )


def review(groups: list[tuple[list[Sample], list[float]]]) -> list[dict]:
    """The last stretch of races: who the model backed, and what it said about the real winner."""
    flat = [(s, w) for samples, w in groups for s in samples]
    out = []
    for s, w in flat[-12:]:
        st, p_dnf = strengths(s, "ratings_pace_form", w)
        odds = plackett.race_odds(st, p_dnf, TRIALS, s.race.season * 100 + s.race.round)
        winner = s.winner()
        if winner is None:
            continue
        fav = max(range(len(st)), key=lambda i: odds[i]["win"])
        rank = 1 + sum(1 for o in odds if o["win"] > odds[winner]["win"])
        out.append(
            {
                "season": s.race.season,
                "round": s.race.round,
                "event_name": s.race.event,
                "favourite": s.race.starters[fav].code,
                "favourite_name": s.race.starters[fav].name,
                "favourite_win": _round(odds[fav]["win"], 3),
                "winner": s.race.starters[winner].code,
                "winner_name": s.race.starters[winner].name,
                "winner_win": _round(odds[winner]["win"], 3),
                "winner_rank": rank,
            }
        )
    return out


__all__ = ["Evaluation", "PStarter", "Sample", "Timeline", "build_timeline", "evaluate", "fit_variant", "strengths"]

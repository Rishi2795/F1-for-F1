"""Championship odds by simulating the races still to come, with a backtest on seasons the model never saw."""

from __future__ import annotations

import math
import random
from dataclasses import dataclass

from ..export import Publisher
from . import plackett
from .evaluate import PRE, TEST_SEASONS, TUNE_SEASONS, Sample, Timeline, strengths
from .state import PStarter

# Between now and the end of the season the cars can change (upgrades, damage, reliability). Each simulated
# season draws one shared shift per team and per driver, so the odds are not overconfident.
SIGMAS = [(0.25, 0.10), (0.40, 0.15), (0.60, 0.20), (1.00, 0.30), (1.30, 0.35), (1.60, 0.40)]
SPRINT_ALLOWANCE = 8  # points a sprint winner can add on top of a Grand Prix win; used only to call a title clinched


@dataclass(frozen=True)
class Entry:
    code: str
    team: str
    key: str
    strength: float
    p_dnf: float


def simulate_title(
    points: dict[str, float],
    team_points: dict[str, float],
    lineup: list[Entry],
    races_left: int,
    *,
    trials: int,
    seed: int,
    team_sigma: float,
    driver_sigma: float,
) -> dict:
    rng = random.Random(seed)
    champion = {c: 0 for c in points}
    top3 = {c: 0 for c in points}
    total = {c: 0.0 for c in points}
    t_champion = {t: 0 for t in team_points}
    t_total = {t: 0.0 for t in team_points}
    for _ in range(trials):
        team_shift = {e.key: rng.gauss(0, team_sigma) for e in lineup}
        driver_shift = {e.code: rng.gauss(0, driver_sigma) for e in lineup}
        pts = dict(points)
        tpts = dict(team_points)
        for _race in range(races_left):
            strength = [e.strength + team_shift[e.key] + driver_shift[e.code] for e in lineup]
            order, finished = plackett.finishing_order(strength, [e.p_dnf for e in lineup], rng)
            for place in range(min(finished, len(plackett.POINTS))):
                e = lineup[order[place]]
                gain = plackett.POINTS[place]
                pts[e.code] = pts.get(e.code, 0.0) + gain
                if e.team in tpts:
                    tpts[e.team] += gain
        ranked = sorted(pts, key=lambda c: (pts[c], rng.random()), reverse=True)
        champion[ranked[0]] += 1
        for c in ranked[:3]:
            top3[c] += 1
        for c in pts:
            total[c] += pts[c]
        if tpts:
            t_ranked = sorted(tpts, key=lambda t: (tpts[t], rng.random()), reverse=True)
            t_champion[t_ranked[0]] += 1
            for t in tpts:
                t_total[t] += tpts[t]
    return {
        "drivers": {
            c: {"champion": champion[c] / trials, "top3": top3[c] / trials, "exp_points": total[c] / trials}
            for c in points
        },
        "constructors": {
            t: {"champion": t_champion[t] / trials, "exp_points": t_total[t] / trials} for t in team_points
        },
    }


def lineup_from(starters: tuple[PStarter, ...], sample_strength: list[float], p_dnf: list[float]) -> list[Entry]:
    return [Entry(s.code, s.team, s.key, st, p) for s, st, p in zip(starters, sample_strength, p_dnf, strict=True)]


# -- backtest -----------------------------------------------------------------------------------------------
def _final_champion(publisher: Publisher, season: int) -> str | None:
    standings = publisher.load_standings(season)
    if not standings or not standings.complete or not standings.rounds:
        return None
    top = [d for d in standings.rounds[-1].drivers if d.position == 1]
    return top[0].code if top else None


def backtest(
    publisher: Publisher,
    tl: Timeline,
    w: list[float],
    seasons: tuple[int, ...],
    *,
    trials: int,
    sigma: tuple[float, float],
    step: int = 2,
) -> list[dict]:
    rows: list[dict] = []
    for season in seasons:
        champ = _final_champion(publisher, season)
        standings = publisher.load_standings(season)
        if champ is None or standings is None:
            continue
        last_round = max(r for (s, r) in tl.after if s == season)
        for rnd in standings.rounds:
            left = last_round - rnd.round
            if left < 1 or rnd.round % step:
                continue
            tracker = tl.after.get((season, rnd.round))
            race = next((r for r in tl.races if r.season == season and r.round == rnd.round), None)
            if tracker is None or race is None:
                continue
            feats = tracker.features(race.starters, grid_known=False)
            sample = Sample(race, feats, feats)
            st, p_dnf = strengths(sample, PRE, w)
            points = {d.code: d.points for d in rnd.drivers}
            for s in race.starters:
                points.setdefault(s.code, 0.0)
            result = simulate_title(
                points,
                {},
                lineup_from(race.starters, st, p_dnf),
                left,
                trials=trials,
                seed=season * 1000 + rnd.round,
                team_sigma=sigma[0],
                driver_sigma=sigma[1],
            )
            probs = {c: v["champion"] for c, v in result["drivers"].items()}
            leader = max(points, key=lambda c: points[c])
            rows.append(
                {
                    "season": season,
                    "round": rnd.round,
                    "left": left,
                    "actual": champ,
                    "p_actual": probs.get(champ, 0.0),
                    "pick": max(probs, key=lambda c: probs[c]),
                    "leader": leader,
                }
            )
    return rows


def summarise(rows: list[dict], leader_p: float = 0.8) -> dict:
    """Score title forecasts. The comparison forecast says the current points leader wins with probability
    `leader_p` (their historical hit rate on the tuning seasons) and splits the rest over five challengers."""
    if not rows:
        return {"forecasts": 0}
    eps = 0.01
    model_ll = sum(-math.log(max(r["p_actual"], eps)) for r in rows) / len(rows)
    base = [-math.log(leader_p if r["leader"] == r["actual"] else (1 - leader_p) / 5) for r in rows]
    out = {
        "forecasts": len(rows),
        "log_loss": round(model_ll, 4),
        "leader_baseline_log_loss": round(sum(base) / len(base), 4),
        "pick_correct": round(sum(r["pick"] == r["actual"] for r in rows) / len(rows), 4),
        "leader_correct": round(sum(r["leader"] == r["actual"] for r in rows) / len(rows), 4),
        "mean_p_for_champion": round(sum(r["p_actual"] for r in rows) / len(rows), 4),
    }
    buckets = {"8+ races left": (8, 99), "4-7 races left": (4, 7), "1-3 races left": (1, 3)}
    out["by_races_left"] = {}
    for name, (lo, hi) in buckets.items():
        group = [r for r in rows if lo <= r["left"] <= hi]
        if group:
            out["by_races_left"][name] = {
                "forecasts": len(group),
                "pick_correct": round(sum(r["pick"] == r["actual"] for r in group) / len(group), 3),
                "leader_correct": round(sum(r["leader"] == r["actual"] for r in group) / len(group), 3),
                "mean_p_for_champion": round(sum(r["p_actual"] for r in group) / len(group), 3),
            }
    return out


def tune_sigma(publisher: Publisher, tl: Timeline, w: list[float]) -> tuple[tuple[float, float], float, dict]:
    """Pick the between-race uncertainty (and the leader baseline) on the tuning seasons only."""
    best, best_loss, losses, leader_rate = SIGMAS[1], float("inf"), {}, 0.8
    for sigma in SIGMAS:
        rows = backtest(publisher, tl, w, TUNE_SEASONS, trials=300, sigma=sigma, step=2)
        summary = summarise(rows)
        loss = summary.get("log_loss", float("inf"))
        losses[f"{sigma[0]}/{sigma[1]}"] = loss
        if loss < best_loss:
            best, best_loss = sigma, loss
            leader_rate = min(0.95, max(0.05, summary.get("leader_correct", 0.8)))
    return best, leader_rate, losses


__all__ = ["Entry", "TEST_SEASONS", "backtest", "lineup_from", "simulate_title", "summarise", "tune_sigma"]

"""Things worked out from the published races: excitement, teammate duels, circuit profiles.

Everything here reads published race files only, so it runs offline and can be re-run any time.
"""

from __future__ import annotations

import json
import re
import statistics
from collections import Counter

from .export import Publisher, dumps, write_if_changed
from .logging_setup import get_logger
from .models import (
    CircuitDoc,
    CircuitIndexEntry,
    CircuitOutline,
    CircuitRace,
    CircuitStat,
    Duel,
    DuelsDoc,
    DuelSide,
    DuelTally,
    Excitement,
    RaceDoc,
    TeamPaceDoc,
    TeamPaceRound,
    TeamPaceTeam,
)

log = get_logger("derive")

WEIGHTS = {
    "overtakes": 0.35,
    "shuffle": 0.20,
    "close": 0.15,
    "retirements": 0.10,
    "safety_car": 0.10,
    "lead_changes": 0.10,
}


# -- excitement ---------------------------------------------------------------------------------------------
def count_overtakes(doc: RaceDoc) -> int | None:
    """On-track passes: a car that was behind another is ahead a lap later, and neither pitted in between."""
    pos = {d.driver_code: d.lap_positions for d in doc.drivers if d.lap_positions}
    if len(pos) < 2:
        return None
    pit = {d.driver_code: {s.lap_end for s in (d.stints or [])[:-1]} for d in doc.drivers}
    laps = max(len(p) for p in pos.values())
    codes = list(pos)
    passes = 0
    for t in range(1, laps):  # t is an index: positions at the end of lap t and lap t+1
        for i, a in enumerate(codes):
            for b in codes[i + 1 :]:
                pa, pb = pos[a], pos[b]
                if t >= len(pa) or t >= len(pb):
                    continue
                before_a, before_b, now_a, now_b = pa[t - 1], pb[t - 1], pa[t], pb[t]
                if None in (before_a, before_b, now_a, now_b):
                    continue
                if {t, t + 1} & (pit.get(a, set()) | pit.get(b, set())):
                    continue
                if (before_a - before_b) * (now_a - now_b) < 0:  # type: ignore[operator]
                    passes += 1
    return passes


def raw_components(doc: RaceDoc) -> dict[str, float | None]:
    classified = [d for d in doc.drivers if d.classified and d.finish is not None]
    moved = [abs(d.grid - d.finish) for d in classified if d.grid is not None]  # type: ignore[operator]
    second = next((d for d in doc.drivers if d.finish == 2), None)
    gap = second.gap_to_winner_s if second else None
    return {
        "overtakes": count_overtakes(doc),
        "shuffle": statistics.fmean(moved) if moved else None,
        "close": -gap if gap is not None else None,  # a smaller gap is more exciting
        "retirements": float(sum(1 for d in doc.drivers if not d.classified)),
        "safety_car": float(doc.derived.safety_car_laps) if doc.derived.safety_car_laps is not None else None,
        "lead_changes": float(doc.analysis.lead_changes)
        if doc.analysis and doc.analysis.lead_changes is not None
        else None,
    }


def _percentile(value: float, population: list[float]) -> float:
    below = sum(1 for x in population if x < value)
    equal = sum(1 for x in population if x == value)
    return (below + 0.5 * equal) / len(population)


def _tags(doc: RaceDoc, raw: dict[str, float | None], passes_pct: float | None) -> list[str]:
    tags: list[str] = []
    if passes_pct is not None and passes_pct >= 0.75:
        tags.append("Lots of overtaking")
    if passes_pct is not None and passes_pct <= 0.25:
        tags.append("Processional")
    if raw["close"] is not None and -raw["close"] < 3:
        tags.append("Tight finish")
    if (doc.derived.safety_car_laps or 0) > 0:
        tags.append("Safety car")
    if doc.derived.red_flag:
        tags.append("Red flag")
    if (raw["retirements"] or 0) >= 5:
        tags.append("Lots of retirements")
    if doc.weather and doc.weather.rainfall:
        tags.append("Rain")
    return tags


def _index_scores(publisher: Publisher, docs: list[RaceDoc]) -> None:
    """Copy each score into its season index, so lists of races can show it without opening every race."""
    fresh = {(d.season, d.round): publisher.load_race(d.season, d.round) for d in docs}
    for season in publisher.published_seasons():
        index = publisher.load_index(season)
        if index is None:
            continue
        entries = []
        for entry in index.races:
            doc = fresh.get((season, entry.round))
            ex = doc.excitement if doc else None
            entries.append(
                entry.model_copy(
                    update={
                        "excitement": ex.score if ex else None,
                        "watch_tags": ex.tags if ex else [],
                        "overtakes": ex.overtakes if ex else None,
                        "winner": doc.winner.driver_name if doc and doc.winner else None,
                    }
                )
            )
        publisher.publish_index(index.model_copy(update={"races": entries}))


def build_excitement(publisher: Publisher) -> int:
    """Score every played race 0-10 against all others: 5 is a typical race, 9 is one of the most eventful."""
    docs: list[RaceDoc] = []
    for season in publisher.published_seasons():
        for path in (publisher.root / "seasons" / str(season)).glob("race_*.json"):
            doc = publisher.load_race(season, int(path.stem.split("_")[1]))
            if doc and len(doc.drivers) >= 10:
                docs.append(doc)
    raws = {(d.season, d.round): raw_components(d) for d in docs}
    pools = {k: [r[k] for r in raws.values() if r[k] is not None] for k in WEIGHTS}
    written = 0
    for doc in docs:
        raw = raws[(doc.season, doc.round)]
        parts = {k: _percentile(raw[k], pools[k]) for k in WEIGHTS if raw[k] is not None and pools[k]}
        if not parts:
            continue
        score = 10 * sum(WEIGHTS[k] * v for k, v in parts.items()) / sum(WEIGHTS[k] for k in parts)
        excitement = Excitement(
            score=round(score, 1),
            overtakes=int(raw["overtakes"]) if raw["overtakes"] is not None else None,
            lead_changes=int(raw["lead_changes"]) if raw["lead_changes"] is not None else None,
            safety_car_laps=doc.derived.safety_car_laps,
            shuffle=round(raw["shuffle"], 1) if raw["shuffle"] is not None else None,
            top2_gap_s=round(-raw["close"], 3) if raw["close"] is not None else None,
            retirements=int(raw["retirements"] or 0),
            tags=_tags(doc, raw, parts.get("overtakes")),
        )
        if publisher.write_race(doc.model_copy(update={"excitement": excitement})):
            written += 1
    _index_scores(publisher, docs)
    log.info("excitement: scored %d races (%d files changed)", len(docs), written)
    return len(docs)


# -- teammate duels -----------------------------------------------------------------------------------------
def duels_for(season: int, docs: list[RaceDoc]) -> DuelsDoc:
    together: dict[tuple[str, str, str], list[tuple[RaceDoc, object, object]]] = {}
    for doc in docs:
        by_team: dict[str, list] = {}
        for d in doc.drivers:
            by_team.setdefault(d.team, []).append(d)
        for team, members in by_team.items():
            members.sort(key=lambda d: d.driver_code)
            for i, a in enumerate(members):
                for b in members[i + 1 :]:
                    together.setdefault((team, a.driver_code, b.driver_code), []).append((doc, a, b))
    duels: list[Duel] = []
    for (team, _ca, _cb), items in together.items():
        if len(items) < 3:
            continue
        a0, b0 = items[-1][1], items[-1][2]
        q_a = q_b = r_a = r_b = only_a = only_b = 0
        q_races = r_races = 0
        gaps: list[float] = []
        pace: list[float] = []
        pts_a = pts_b = 0.0
        for _doc, a, b in items:
            pts_a += a.points + (a.sprint_points or 0.0)
            pts_b += b.points + (b.sprint_points or 0.0)
            if a.quali_position is not None and b.quali_position is not None:
                q_races += 1
                q_a += a.quali_position < b.quali_position
                q_b += b.quali_position < a.quali_position
                if a.quali_gap_pct is not None and b.quali_gap_pct is not None:
                    gaps.append(a.quali_gap_pct - b.quali_gap_pct)
            if a.classified and b.classified and a.finish is not None and b.finish is not None:
                r_races += 1
                r_a += a.finish < b.finish
                r_b += b.finish < a.finish
            elif a.classified != b.classified:
                only_a += a.classified
                only_b += b.classified
            if a.median_lap_s is not None and b.median_lap_s is not None:
                pace.append(a.median_lap_s - b.median_lap_s)
        duels.append(
            Duel(
                team=team,
                team_color=a0.team_color,
                a=DuelSide(code=a0.driver_code, name=a0.driver_name),
                b=DuelSide(code=b0.driver_code, name=b0.driver_name),
                races=len(items),
                qualifying=DuelTally(a=q_a, b=q_b, races=q_races),
                qualifying_gap_pct=round(statistics.fmean(gaps), 3) if gaps else None,
                race=DuelTally(a=r_a, b=r_b, races=r_races),
                only_a_finished=only_a,
                only_b_finished=only_b,
                pace_races=len(pace),
                pace_gap_s=round(statistics.median(pace), 3) if pace else None,
                points_a=pts_a,
                points_b=pts_b,
            )
        )
    duels.sort(key=lambda d: -(d.points_a + d.points_b))
    return DuelsDoc(season=season, duels=duels)


def build_duels(publisher: Publisher) -> int:
    total = 0
    for season in publisher.published_seasons():
        docs = [
            doc
            for path in sorted((publisher.root / "seasons" / str(season)).glob("race_*.json"))
            if (doc := publisher.load_race(season, int(path.stem.split("_")[1]))) and doc.drivers
        ]
        duels = duels_for(season, docs)
        write_if_changed(publisher.root / "duels" / f"{season}.json", dumps(duels))
        total += len(duels.duels)
    log.info("duels: %d teammate pairs", total)
    return total


# -- circuits -----------------------------------------------------------------------------------------------
def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _load_outlines(publisher: Publisher) -> dict[str, dict]:
    path = publisher.root / "circuits" / "outlines.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def build_circuits(publisher: Publisher) -> int:
    outlines = _load_outlines(publisher)
    by_slug: dict[str, list[RaceDoc]] = {}
    upcoming: dict[str, CircuitRace] = {}
    for season in publisher.published_seasons():
        for path in sorted((publisher.root / "seasons" / str(season)).glob("race_*.json")):
            doc = publisher.load_race(season, int(path.stem.split("_")[1]))
            if doc and doc.drivers:
                by_slug.setdefault(slugify(doc.location), []).append(doc)
        index = publisher.load_index(season)
        for r in index.races if index else []:
            if r.data_status == "scheduled":
                upcoming[slugify(r.location)] = CircuitRace(
                    season=r.season,
                    round=r.round,
                    event_name=r.event_name,
                    date=r.date,
                    winner=None,
                    winner_name=None,
                    winner_team=None,
                    pole=None,
                    excitement=None,
                )
    overtakes = {
        slug: statistics.fmean(
            [d.excitement.overtakes for d in docs if d.excitement and d.excitement.overtakes is not None]
        )
        for slug, docs in by_slug.items()
        if any(d.excitement and d.excitement.overtakes is not None for d in docs)
    }
    order = sorted(overtakes, key=lambda s: -overtakes[s])
    entries: list[CircuitIndexEntry] = []
    for slug, docs in by_slug.items():
        races: list[CircuitRace] = []
        pole_wins = pole_races = 0
        winners: Counter[str] = Counter()
        teams: Counter[str] = Counter()
        tyres: Counter[str] = Counter()
        stops: list[int] = []
        for doc in docs:
            win = next((d for d in doc.drivers if d.finish == 1 and d.classified), None)
            pole = next((d for d in doc.drivers if d.quali_position == 1), None)
            if win and pole:
                pole_races += 1
                pole_wins += win.driver_code == pole.driver_code
            if win:
                winners[win.driver_name] += 1
                teams[win.team] += 1
                if win.stops is not None:
                    stops.append(win.stops)
                if win.tyre_sequence:
                    tyres[" > ".join(win.tyre_sequence)] += 1
            races.append(
                CircuitRace(
                    season=doc.season,
                    round=doc.round,
                    event_name=doc.event_name,
                    date=doc.date,
                    winner=win.driver_code if win else None,
                    winner_name=win.driver_name if win else None,
                    winner_team=win.team if win else None,
                    pole=pole.driver_code if pole else None,
                    excitement=doc.excitement.score if doc.excitement else None,
                )
            )
        scores = [r.excitement for r in races if r.excitement is not None]
        last = docs[-1]
        circuit = CircuitDoc(
            slug=slug,
            name=last.event_name,
            location=last.location,
            country=last.country,
            races=races,
            pole_wins=pole_wins,
            pole_races=pole_races,
            avg_overtakes=round(overtakes[slug], 1) if slug in overtakes else None,
            overtaking_rank=order.index(slug) + 1 if slug in order else None,
            safety_car_races=sum(1 for d in docs if (d.derived.safety_car_laps or 0) > 0),
            red_flag_races=sum(1 for d in docs if d.derived.red_flag),
            avg_retirements=round(statistics.fmean(sum(1 for x in d.drivers if not x.classified) for d in docs), 1),
            avg_winner_stops=round(statistics.fmean(stops), 1) if stops else None,
            typical_winning_tyres=tyres.most_common(1)[0][0] if tyres else None,
            avg_excitement=round(statistics.fmean(scores), 1) if scores else None,
            winners_by_driver=[CircuitStat(name=n, count=c) for n, c in winners.most_common(4)],
            winners_by_team=[CircuitStat(name=n, count=c) for n, c in teams.most_common(4)],
            next_race=upcoming.get(slug),
            outline=CircuitOutline.model_validate(outlines[slug]) if slug in outlines else None,
        )
        write_if_changed(publisher.root / "circuits" / f"{slug}.json", dumps(circuit))
        entries.append(
            CircuitIndexEntry(
                slug=slug,
                name=circuit.name,
                location=circuit.location,
                country=circuit.country,
                races=len(races),
                avg_excitement=circuit.avg_excitement,
                preview=circuit.outline.points[::5] if circuit.outline else None,
            )
        )
    entries.sort(key=lambda e: e.location)
    write_if_changed(publisher.root / "circuits" / "index.json", dumps([e.model_dump(mode="json") for e in entries]))
    log.info("circuits: %d profiles", len(entries))
    return len(entries)


# -- team pace over a season ----------------------------------------------------------------------------------
def team_pace_for(season: int, docs: list[RaceDoc]) -> TeamPaceDoc:
    """Each team's race pace per round: its quicker driver's median clean lap against the quickest car that weekend."""
    rounds: list[TeamPaceRound] = []
    colors: dict[str, str | None] = {}
    for doc in sorted(docs, key=lambda d: d.round):
        best: dict[str, float] = {}
        for d in doc.drivers:
            if d.median_lap_s is not None:
                best[d.team] = min(best.get(d.team, d.median_lap_s), d.median_lap_s)
                colors.setdefault(d.team, d.team_color)
        if len(best) < 4:
            continue
        fastest = min(best.values())
        rounds.append(
            TeamPaceRound(
                round=doc.round,
                event_name=doc.event_name,
                gaps={t: round((v / fastest - 1) * 100, 3) for t, v in best.items()},
            )
        )
    teams: list[TeamPaceTeam] = []
    half = len(rounds) // 2
    for name in colors:
        series = [(r.round, r.gaps[name]) for r in rounds if name in r.gaps]
        if len(series) < 3:
            continue
        values = [v for _, v in series]
        first = [v for rnd, v in series if rnd <= rounds[half - 1].round] if half else []
        second = [v for rnd, v in series if half and rnd > rounds[half - 1].round]
        teams.append(
            TeamPaceTeam(
                name=name, team_color=colors[name], races=len(series), avg_gap_pct=round(statistics.fmean(values), 3),
                first_half_pct=round(statistics.fmean(first), 3) if len(first) >= 2 else None,
                second_half_pct=round(statistics.fmean(second), 3) if len(second) >= 2 else None,
            )
        )
    teams.sort(key=lambda t: t.avg_gap_pct)
    return TeamPaceDoc(season=season, rounds=rounds, teams=teams)


def build_team_pace(publisher: Publisher) -> int:
    written = 0
    for season in publisher.published_seasons():
        docs = [
            doc
            for path in sorted((publisher.root / "seasons" / str(season)).glob("race_*.json"))
            if (doc := publisher.load_race(season, int(path.stem.split("_")[1]))) and doc.drivers
        ]
        pace = team_pace_for(season, docs)
        if pace.rounds:
            write_if_changed(publisher.root / "teampace" / f"{season}.json", dumps(pace))
            written += 1
    log.info("team pace: %d seasons", written)
    return written

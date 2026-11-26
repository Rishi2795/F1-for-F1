"""Season and race endpoints. Read-only; data comes from the published bundle."""

from __future__ import annotations

from typing import Annotated

from app.core.deps import get_store, json_response, not_available
from app.core.errors import ApiError
from app.core.store import PublishedStore
from fastapi import APIRouter, Depends, Path, Request

router = APIRouter(prefix="/seasons", tags=["seasons"])

Year = Annotated[int, Path(ge=2018, le=2100, description="Season year")]
Round = Annotated[int, Path(ge=1, le=40, description="Round number")]


@router.api_route("", methods=["GET", "HEAD"])
def list_seasons(request: Request, store: PublishedStore = Depends(get_store)):
    blob = store.get("seasons.json")
    if blob is None:
        raise not_available("Season list")
    return json_response(request, blob)


@router.api_route("/{year}/races", methods=["GET", "HEAD"])
def list_races(request: Request, year: Year, store: PublishedStore = Depends(get_store)):
    blob = store.get("seasons", str(year), "races.json")
    if blob is None:
        raise not_available(f"Season {year}")
    return json_response(request, blob)


@router.api_route("/{year}/standings", methods=["GET", "HEAD"])
def get_standings(request: Request, year: Year, store: PublishedStore = Depends(get_store)):
    """Official championship standings after every played round (sprint points included)."""
    blob = store.get("seasons", str(year), "standings.json")
    if blob is None:
        raise not_available(f"Standings for {year}")
    return json_response(request, blob)


@router.api_route("/{year}/team-pace", methods=["GET", "HEAD"])
def get_team_pace(request: Request, year: Year, store: PublishedStore = Depends(get_store)):
    """Each team's race pace round by round, as a gap to the quickest car."""
    blob = store.get("teampace", f"{year}.json")
    if blob is None:
        raise not_available(f"Team pace for {year}")
    return json_response(request, blob)


@router.api_route("/{year}/duels", methods=["GET", "HEAD"])
def get_duels(request: Request, year: Year, store: PublishedStore = Depends(get_store)):
    """Teammate head-to-heads for a season: qualifying, race results, race pace and points."""
    blob = store.get("duels", f"{year}.json")
    if blob is None:
        raise not_available(f"Teammate duels for {year}")
    return json_response(request, blob)


@router.api_route("/{year}/races/{round_number}/laps", methods=["GET", "HEAD"])
def get_laps(request: Request, year: Year, round_number: Round, store: PublishedStore = Depends(get_store)):
    """Lap-by-lap detail for the race lab: lap times, gap to the leader, flags, sector bests, top speeds, undercuts."""
    blob = store.get("laps", str(year), f"{round_number}.json")
    if blob is None:
        raise not_available(f"Lap data for {year} round {round_number}")
    return json_response(request, blob)


@router.api_route("/{year}/races/{round_number}/telemetry", methods=["GET", "HEAD"])
def get_telemetry(request: Request, year: Year, round_number: Round, store: PublishedStore = Depends(get_store)):
    """Each driver's fastest lap laid along the circuit: speed, throttle, brake, gear, RPM and DRS at 240 points."""
    blob = store.get("telemetry", str(year), f"{round_number}.json")
    if blob is None:
        raise not_available(f"Telemetry for {year} round {round_number}")
    return json_response(request, blob)


@router.api_route("/{year}/races/{round_number}/replay", methods=["GET", "HEAD"])
def get_replay(request: Request, year: Year, round_number: Round, store: PublishedStore = Depends(get_store)):
    """Where every car was once a second for the whole race, with its sensors (newest races only)."""
    blob = store.get("replay", str(year), f"{round_number}.json")
    if blob is None:
        raise not_available(f"Replay data for {year} round {round_number}")
    return json_response(request, blob)


@router.api_route("/{year}/races/{round_number}/incidents", methods=["GET", "HEAD"])
def get_incidents(request: Request, year: Year, round_number: Round, store: PublishedStore = Depends(get_store)):
    """Race-control messages that explain the race: collisions, stopped cars, penalties, safety cars."""
    blob = store.get("incidents", str(year), f"{round_number}.json")
    if blob is None:
        raise not_available(f"Incident messages for {year} round {round_number}")
    return json_response(request, blob)


@router.api_route("/{year}/races/{round_number}", methods=["GET", "HEAD"])
def get_race(request: Request, year: Year, round_number: Round, store: PublishedStore = Depends(get_store)):
    blob = store.get("seasons", str(year), f"race_{round_number}.json")
    if blob is not None:
        return json_response(request, blob)
    index = store.json("seasons", str(year), "races.json")
    entry = next((r for r in (index or {}).get("races", []) if r["round"] == round_number), None)
    if entry is None:
        raise not_available(f"Race {year} round {round_number}")
    status = entry["data_status"]
    message = (
        "This race has not taken place yet." if status == "scheduled" else "Data for this race is not available yet."
    )
    raise ApiError(404, "not_available", message, data_status=status)

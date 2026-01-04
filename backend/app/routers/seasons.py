from fastapi import APIRouter, HTTPException
from app.core.precomputed_loader import list_seasons, list_races, load_race

router = APIRouter(prefix="/seasons", tags=["seasons"])

@router.get("")
def seasons():
    return {"seasons": list_seasons()}

@router.get("/{year}/races")
def races(year: int):
    data = list_races(year)
    if not data:
        raise HTTPException(404, "Season not found")
    return {"season": year, "races": data}

@router.get("/{year}/races/{round_number}")
def race(year: int, round_number: int):
    data = load_race(year, round_number)
    if not data:
        raise HTTPException(404, "Race not found")
    return data

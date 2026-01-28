from fastapi import APIRouter, HTTPException
from app.db.mongo import db

router = APIRouter(prefix="/seasons", tags=["seasons"])


@router.get("")
def seasons():
    """
    Returns available seasons from MongoDB
    """
    seasons = db.races.distinct("season")
    seasons.sort(reverse=True)
    return {"seasons": seasons}


@router.get("/{year}/races")
def races(year: int):
    """
    Returns circuit list for a season
    """
    cursor = db.races.find(
        {"season": year},
        {
            "_id": 0,
            "season": 1,
            "round": 1,
            "event_name": 1,
            "location": 1,
        },
    ).sort("round", 1)

    races = list(cursor)

    if not races:
        raise HTTPException(status_code=404, detail="Season not found")

    return {"season": year, "races": races}


@router.get("/{year}/races/{round_number}")
def race(year: int, round_number: int):
    """
    Returns full race analysis document
    """
    race = db.races.find_one(
        {"season": year, "round": round_number},
        {"_id": 0},
    )

    if not race:
        raise HTTPException(status_code=404, detail="Race not found")

    return race

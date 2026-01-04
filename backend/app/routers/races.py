from fastapi import APIRouter, HTTPException
from app.core.telemetry_source import get_race_basic_data, get_driver_laps
from app.core.strategy_engine import analyze_driver_strategy

router = APIRouter(prefix="/races", tags=["races"])


@router.get("/ping")
def ping():
    return {"message": "races router alive"}


@router.get("/{year}/{round_number}/summary")
def race_summary(year: int, round_number: int):
    """
    Basic race summary:
    - race name, location
    - results (position, driver, team, status)
    """
    try:
        data = get_race_basic_data(year, round_number)
        return data
    except Exception as e:
        # For now, keep error simple – later you can refine this
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{year}/{round_number}/{driver_code}/strategy")
def driver_strategy(year: int, round_number: int, driver_code: str):
    """
    Basic Phase 1 strategy endpoint:
    - total laps
    - average lap time
    - placeholder stints + coach notes
    """
    try:
        laps = get_driver_laps(year, round_number, driver_code.upper())
        analysis = analyze_driver_strategy(laps)

        return {
            "year": year,
            "round": round_number,
            "driver_code": driver_code.upper(),
            "strategy": analysis,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

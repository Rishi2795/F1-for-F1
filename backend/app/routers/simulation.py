from fastapi import APIRouter, HTTPException
from app.core.telemetry_source import load_session
import pandas as pd
from typing import List, Dict, Any

router = APIRouter(prefix="/simulation", tags=["simulation"])


@router.get("/test")
def test_endpoint():
    """Test endpoint to verify API is working"""
    return {"status": "ok", "message": "Simulation API is working correctly"}


@router.get("/{year}/{round}/track")
async def get_track_data(year: int, round: int):
    """Get track coordinates and layout for a specific race"""
    try:
        # Load session
        session = load_session(year, round)
        
        # Get the fastest lap to extract track coordinates
        fastest_lap = session.laps.pick_fastest()
        
        if fastest_lap is None or fastest_lap.empty:
            raise HTTPException(status_code=404, detail="No lap data available")
        
        # Get telemetry data which includes X, Y coordinates
        telemetry = fastest_lap.get_telemetry()
        
        # Extract coordinates
        track_points = []
        for idx, row in telemetry.iterrows():
            track_points.append({
                "x": float(row['X']),
                "y": float(row['Y']),
                "distance": float(row['Distance'])
            })
        
        # Get race info
        race_info = {
            "year": year,
            "round": round,
            "event_name": session.event['EventName'],
            "location": session.event['Location'],
            "country": session.event['Country'],
            "circuit_name": session.event['OfficialEventName']
        }
        
        return {
            "race_info": race_info,
            "track_points": track_points,
            "total_distance": float(telemetry['Distance'].max())
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading track data: {str(e)}")


@router.get("/{year}/{round}/telemetry")
async def get_race_telemetry(year: int, round: int):
    """Get full race telemetry data for all drivers"""
    try:
        # Load session
        session = load_session(year, round)
        
        drivers_data = []
        
        # Get all drivers in the race
        for driver in session.drivers:
            driver_laps = session.laps.pick_driver(driver)
            
            if driver_laps.empty:
                continue
            
            driver_info = {
                "driver_number": str(driver),
                "driver_code": session.get_driver(driver)['Abbreviation'],
                "driver_name": session.get_driver(driver)['FullName'],
                "team": session.get_driver(driver)['TeamName'],
                "laps": []
            }
            
            # Get lap-by-lap data
            for idx, lap in driver_laps.iterrows():
                lap_data = {
                    "lap_number": int(lap['LapNumber']),
                    "lap_time": float(lap['LapTime'].total_seconds()) if lap['LapTime'] is not None and not pd.isna(lap['LapTime']) else None,
                    "sector1_time": float(lap['Sector1Time'].total_seconds()) if lap['Sector1Time'] is not None and not pd.isna(lap['Sector1Time']) else None,
                    "sector2_time": float(lap['Sector2Time'].total_seconds()) if lap['Sector2Time'] is not None and not pd.isna(lap['Sector2Time']) else None,
                    "sector3_time": float(lap['Sector3Time'].total_seconds()) if lap['Sector3Time'] is not None and not pd.isna(lap['Sector3Time']) else None,
                    "position": int(lap['Position']) if not pd.isna(lap['Position']) else None,
                    "compound": lap['Compound'] if not pd.isna(lap['Compound']) else None,
                    "is_pit_out_lap": bool(lap['PitOutTime'] is not None and not pd.isna(lap['PitOutTime'])),
                    "is_pit_in_lap": bool(lap['PitInTime'] is not None and not pd.isna(lap['PitInTime']))
                }
                driver_info["laps"].append(lap_data)
            
            drivers_data.append(driver_info)
        
        return {
            "race_info": {
                "year": year,
                "round": round,
                "event_name": session.event['EventName'],
                "location": session.event['Location']
            },
            "drivers": drivers_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading telemetry: {str(e)}")


@router.get("/{year}/{round}/positions")
async def get_position_data(year: int, round: int):
    """Get position data for race replay"""
    try:
        session = load_session(year, round)
        
        # Check if we have lap data
        if session.laps.empty or session.laps['LapNumber'].isna().all():
            raise HTTPException(status_code=404, detail="No lap data available for this race")
        
        max_lap = int(session.laps['LapNumber'].max())
        if pd.isna(max_lap) or max_lap < 1:
            raise HTTPException(status_code=404, detail="Invalid lap data for this race")
        
        # Get position data for each lap
        lap_positions = {}
        
        for lap_num in range(1, max_lap + 1):
            lap_data = session.laps[session.laps['LapNumber'] == lap_num]
            
            positions = []
            for idx, lap in lap_data.iterrows():
                if pd.notna(lap['Position']):
                    positions.append({
                        "driver_code": session.get_driver(lap['Driver'])['Abbreviation'],
                        "position": int(lap['Position']),
                        "lap_time": float(lap['LapTime'].total_seconds()) if lap['LapTime'] is not None and not pd.isna(lap['LapTime']) else None
                    })
            
            lap_positions[str(lap_num)] = sorted(positions, key=lambda x: x['position'])
        
        return {
            "race_info": {
                "year": year,
                "round": round,
                "event_name": session.event['EventName'],
                "location": session.event.get('Location', '')
            },
            "lap_positions": lap_positions,
            "total_laps": max_lap
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading position data: {str(e)}")
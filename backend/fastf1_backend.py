from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import fastf1
import pandas as pd
from typing import List, Dict, Any

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enable FastF1 cache
fastf1.Cache.enable_cache('cache')

@app.get("/")
def read_root():
    return {
        "message": "FastF1 API is running",
        "endpoints": [
            "/api/simulation/test",
            "/api/simulation/{year}/{round}/track",
            "/api/simulation/{year}/{round}/telemetry",
            "/api/simulation/{year}/{round}/positions"
        ]
    }

@app.get("/api/simulation/test")
def test_endpoint():
    """Test endpoint to verify API is working"""
    return {"status": "ok", "message": "Simulation API is working correctly"}

@app.get("/api/simulation/{year}/{round}/track")
async def get_track_data(year: int, round: int):
    """Get track coordinates and layout for a specific race"""
    try:
        print(f"Loading track data for {year} round {round}...")
        
        # Load session
        session = fastf1.get_session(year, round, 'R')
        print("Session loaded, fetching data...")
        session.load()
        
        # Get the fastest lap to extract track coordinates
        fastest_lap = session.laps.pick_fastest()
        
        if fastest_lap is None or fastest_lap.empty:
            raise HTTPException(status_code=404, detail="No lap data available")
        
        # Get telemetry data which includes X, Y coordinates
        telemetry = fastest_lap.get_telemetry()
        print(f"Telemetry loaded with {len(telemetry)} points")
        
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
        
        print(f"Track data ready: {race_info['event_name']}")
        
        return {
            "race_info": race_info,
            "track_points": track_points,
            "total_distance": float(telemetry['Distance'].max())
        }
        
    except Exception as e:
        print(f"Error loading track data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error loading track data: {str(e)}")

@app.get("/api/simulation/{year}/{round}/telemetry")
async def get_race_telemetry(year: int, round: int):
    """Get full race telemetry data for all drivers"""
    try:
        print(f"Loading telemetry data for {year} round {round}...")
        
        # Load session
        session = fastf1.get_session(year, round, 'R')
        session.load()
        
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
        
        print(f"Telemetry data ready for {len(drivers_data)} drivers")
        
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
        print(f"Error loading telemetry: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error loading telemetry: {str(e)}")

@app.get("/api/simulation/{year}/{round}/positions")
async def get_position_data(year: int, round: int):
    """Get position data for race replay"""
    try:
        print(f"Loading position data for {year} round {round}...")
        
        session = fastf1.get_session(year, round, 'R')
        session.load()
        
        # Get position data for each lap
        lap_positions = {}
        
        max_lap = int(session.laps['LapNumber'].max())
        print(f"Processing {max_lap} laps...")
        
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
        
        print(f"Position data ready for {max_lap} laps")
        
        return {
            "race_info": {
                "year": year,
                "round": round,
                "event_name": session.event['EventName']
            },
            "lap_positions": lap_positions,
            "total_laps": max_lap
        }
        
    except Exception as e:
        print(f"Error loading position data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error loading position data: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("Starting FastF1 Backend Server...")
    print("API will be available at: http://localhost:8001")
    print("Endpoints:")
    print("  - GET /api/simulation/test")
    print("  - GET /api/simulation/{year}/{round}/track")
    print("  - GET /api/simulation/{year}/{round}/telemetry")
    print("  - GET /api/simulation/{year}/{round}/positions")
    uvicorn.run(app, host="0.0.0.0", port=8001)
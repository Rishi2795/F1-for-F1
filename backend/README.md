# F1 StratHub Backend

Backend API for F1 race simulation and data analysis using FastF1.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Start the FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

### Simulation Endpoints

- `GET /api/simulation/test` - Test endpoint to verify API is working
- `GET /api/simulation/{year}/{round}/track` - Get track coordinates and layout
- `GET /api/simulation/{year}/{round}/telemetry` - Get full race telemetry data for all drivers
- `GET /api/simulation/{year}/{round}/positions` - Get position data for race replay

### Example Usage

```bash
# Test connection
curl http://localhost:8000/api/simulation/test

# Get Monaco 2024 track data
curl http://localhost:8000/api/simulation/2024/5/track

# Get Monaco 2024 position data
curl http://localhost:8000/api/simulation/2024/5/positions
```

## Dependencies

- FastAPI - Web framework
- FastF1 - F1 data library
- NumPy - Numerical computing
- Pandas - Data manipulation
- Uvicorn - ASGI server

## Notes

- First load will be slow as FastF1 downloads and caches data
- Data is cached in `.fastf1-cache` directory
- Supports F1 seasons from 2018 onwards
# F1 StratHub - Race Simulation

A comprehensive F1 race simulation and data analysis platform built with FastAPI backend and React frontend.

## Features

- 🏎️ Real F1 telemetry data visualization
- 📊 Race position tracking and simulation
- 🏁 Track layout rendering from actual telemetry data
- 📈 Driver performance analysis
- 🎮 Interactive race replay controls

## Tech Stack

**Backend:**
- FastAPI - Python web framework
- FastF1 - F1 data library
- NumPy & Pandas - Data processing
- Uvicorn - ASGI server

**Frontend:**
- React 18 - UI framework
- TypeScript - Type safety
- Tailwind CSS - Styling
- Vite - Build tool

## Quick Start

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Start the backend server:
```bash
uvicorn app.main:app --reload --port 8000
```

Or use the startup script:
```bash
chmod +x start.sh
./start.sh
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and go to `http://localhost:5173`

## API Endpoints

### Simulation Endpoints

- `GET /api/simulation/test` - Test connection
- `GET /api/simulation/{year}/{round}/track` - Track data
- `GET /api/simulation/{year}/{round}/telemetry` - Telemetry data
- `GET /api/simulation/{year}/{round}/positions` - Position data

### Example API Usage

```bash
# Test backend connection
curl http://localhost:8000/api/simulation/test

# Get Monaco 2024 race data
curl http://localhost:8000/api/simulation/2024/5/positions
```

## Project Structure

```
F1-Strathub-1/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── routers/
│   │   │   ├── simulation.py    # Race simulation endpoints
│   │   │   ├── races.py         # Race data endpoints
│   │   │   ├── tracks.py        # Track data endpoints
│   │   │   └── seasons.py       # Season data endpoints
│   │   └── core/
│   │       ├── telemetry_source.py  # FastF1 integration
│   │       ├── strategy_engine.py   # Strategy analysis
│   │       └── track_intel.py       # Track intelligence
│   ├── requirements.txt         # Python dependencies
│   ├── start.sh                # Startup script
│   └── README.md               # Backend documentation
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── racesimulation.tsx  # Race simulation UI
│   │   │   ├── racedashboard.tsx   # Race dashboard
│   │   │   └── home.tsx           # Home page
│   │   └── App.tsx               # Main app component
│   ├── package.json             # Node.js dependencies
│   └── vite.config.ts           # Vite configuration
└── README.md                   # This file
```

## Usage

1. **Load Race Data**: Enter year and round number in the frontend to load race data
2. **Start Simulation**: Click "Start Simulation" to begin the race replay
3. **Control Simulation**: Use pause, resume, and lap controls to navigate through the race
4. **View Data**: Watch real-time position updates and driver information

## Popular Races to Try

- **2024 Round 1**: Bahrain Grand Prix
- **2024 Round 5**: Monaco Grand Prix  
- **2024 Round 10**: British Grand Prix (Silverstone)
- **2024 Round 15**: Italian Grand Prix (Monza)

## Notes

- First load will be slow as FastF1 downloads and caches data
- Data is cached in `.fastf1-cache` directory for faster subsequent loads
- Supports F1 seasons from 2018 onwards
- Backend runs on port 8000, frontend on port 5173

## Troubleshooting

### Backend Issues
- Ensure Python 3.8+ is installed
- Check that all dependencies are installed: `pip install -r requirements.txt`
- Verify FastF1 can access the internet for data downloads

### Frontend Issues
- Ensure Node.js 16+ is installed
- Clear browser cache if UI issues occur
- Check console for API connection errors

## License

This project is for educational purposes and uses FastF1 for data access.
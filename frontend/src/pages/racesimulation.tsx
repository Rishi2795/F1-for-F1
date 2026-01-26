import { useState, useEffect, useRef } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

interface Driver {
  position: number;
  driver_code: string;
  driver_name: string;
  team: string;
  status: string;
}

interface RaceData {
  year: number;
  round: number;
  race_name: string;
  location: string;
  results: Driver[];
}

const TEAM_COLORS: Record<string, string> = {
  "Red Bull Racing": "#0044CC",
  "Mercedes": "#00D2BE",
  "Ferrari": "#DC0000",
  "McLaren": "#FF8700",
  "Alpine": "#0090FF",
  "Aston Martin": "#006F62",
  "Alfa Romeo": "#C92D2D",
  "Williams": "#005AFF",
  "AlphaTauri": "#2B4562",
  "Haas": "#FFFFFF",
  "Sauber": "#006F62",
  "BWT Alpine": "#0090FF",
  "Mercedes-AMG Petronas": "#00D2BE",
  "Scuderia Ferrari": "#DC0000",
  "Oracle Red Bull Racing": "#0044CC",
  "McLaren F1 Team": "#FF8700",
  "BWT Alpine F1 Team": "#0090FF",
  "Aston Martin Aramco Cognizant F1 Team": "#006F62",
  "Alfa Romeo F1 Team Stake": "#C92D2D",
  "Williams Racing": "#005AFF",
  "Scuderia AlphaTauri": "#2B4562",
  "MoneyGram Haas F1 Team": "#FFFFFF"
};

export default function RaceSimulation() {
  const [raceData, setRaceData] = useState<RaceData | null>(null);
  const [simulationData, setSimulationData] = useState<Driver[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLap, setCurrentLap] = useState(0);
  const [totalLaps, setTotalLaps] = useState(58);
  const [simulationSpeed, setSimulationSpeed] = useState(500);
  const [lapHistory, setLapHistory] = useState<Driver[][]>([]);
  const [timeDifferences, setTimeDifferences] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(2024);
  const [round, setRound] = useState(5);
  
  const simulationIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadRaceData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Test backend connection first
      try {
        const testResponse = await fetch(`${API_URL}/simulation/test`);
        if (!testResponse.ok) {
          throw new Error('Backend server not responding. Make sure Python backend is running on port 8000');
        }
        console.log('Backend connection successful');
      } catch (e) {
        throw new Error('Cannot connect to backend. Start the Python server with: uvicorn app.main:app --reload --port 8000');
      }
      
      // Load race data
      console.log('Fetching race data...');
      const raceResponse = await fetch(`${API_URL}/simulation/${year}/${round}/positions`);
      
      if (!raceResponse.ok) {
        const errorData = await raceResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to load race data (${raceResponse.status})`);
      }
      
      const raceData = await raceResponse.json();
      console.log('Race data loaded:', raceData.race_info);
      
      // Check if lap_positions exists and has lap 1 data
      if (!raceData.lap_positions || !raceData.lap_positions['1']) {
        throw new Error('No lap position data available for this race');
      }
      
      // Convert race data to our format
      const results = raceData.lap_positions['1'].map((driver: any) => ({
        position: driver.position,
        driver_code: driver.driver_code,
        driver_name: driver.driver_code, // Simplified for now
        team: "Unknown", // Will be filled from telemetry data
        status: "Finished"
      }));
      
      const raceInfo: RaceData = {
        year: raceData.race_info.year,
        round: raceData.race_info.round,
        race_name: raceData.race_info.event_name,
        location: raceData.race_info.location,
        results: results
      };
      
      setRaceData(raceInfo);
      setTotalLaps(raceData.total_laps);
      
      // Initialize simulation data
      const drivers = results.map((driver: Driver, index: number) => ({
        ...driver,
        position: index + 1
      }));
      
      const timeDiffs: Record<string, number> = {};
      drivers.forEach((driver: Driver) => {
        timeDiffs[driver.driver_code] = 0;
      });
      
      setSimulationData(drivers);
      setTimeDifferences(timeDiffs);
      setLapHistory([JSON.parse(JSON.stringify(drivers))]);
      setCurrentLap(0);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error loading race data:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load default race data on mount
    loadRaceData();
  }, []);

  const simulateLap = (currentDrivers: Driver[], currentTimeDiffs: Record<string, number>) => {
    // Create deep copy to avoid mutation
    const drivers = JSON.parse(JSON.stringify(currentDrivers)) as Driver[];
    const newTimeDiffs = { ...currentTimeDiffs };
    
    // Randomly swap positions for some drivers
    const numSwaps = Math.floor(Math.random() * 3) + 1; // 1-3 position changes per lap
    
    for (let i = 0; i < numSwaps; i++) {
      const idx1 = Math.floor(Math.random() * drivers.length);
      const idx2 = Math.max(0, Math.min(drivers.length - 1, idx1 + (Math.random() > 0.5 ? 1 : -1)));
      
      if (idx1 !== idx2) {
        // Swap drivers
        [drivers[idx1], drivers[idx2]] = [drivers[idx2], drivers[idx1]];
      }
    }
    
    // Reassign positions based on array order
    drivers.forEach((driver, index) => {
      driver.position = index + 1;
      
      // Update time differences (random variation)
      if (index === 0) {
        newTimeDiffs[driver.driver_code] = 0; // Leader is always at 0
      } else {
        const change = (Math.random() - 0.5) * 0.3; // Random change between -0.15 and +0.15
        newTimeDiffs[driver.driver_code] = Math.max(0, (newTimeDiffs[driver.driver_code] || 0) + change + (index * 0.2));
      }
    });
    
    return { drivers, timeDiffs: newTimeDiffs };
  };

  const startSimulation = () => {
    if (!raceData || isSimulating) return;
    
    setIsSimulating(true);
    setIsPaused(false);
    
    const runSimulation = (lap: number, currentDrivers: Driver[], currentTimeDiffs: Record<string, number>) => {
      if (lap >= totalLaps) {
        setIsSimulating(false);
        return;
      }
      
      simulationIntervalRef.current = setTimeout(() => {
        const { drivers, timeDiffs } = simulateLap(currentDrivers, currentTimeDiffs);
        
        setSimulationData(drivers);
        setTimeDifferences(timeDiffs);
        setCurrentLap(lap + 1);
        setLapHistory(prev => [...prev, JSON.parse(JSON.stringify(drivers))]);
        
        runSimulation(lap + 1, drivers, timeDiffs);
      }, simulationSpeed);
    };
    
    // Start from current state
    runSimulation(currentLap, simulationData, timeDifferences);
  };

  const pauseSimulation = () => {
    if (!isPaused) {
      // Pausing
      if (simulationIntervalRef.current) {
        clearTimeout(simulationIntervalRef.current);
      }
      setIsPaused(true);
    } else {
      // Resuming
      setIsPaused(false);
      
      const runSimulation = (lap: number, currentDrivers: Driver[], currentTimeDiffs: Record<string, number>) => {
        if (lap >= totalLaps) {
          setIsSimulating(false);
          return;
        }
        
        simulationIntervalRef.current = setTimeout(() => {
          const { drivers, timeDiffs } = simulateLap(currentDrivers, currentTimeDiffs);
          
          setSimulationData(drivers);
          setTimeDifferences(timeDiffs);
          setCurrentLap(lap + 1);
          setLapHistory(prev => [...prev, JSON.parse(JSON.stringify(drivers))]);
          
          runSimulation(lap + 1, drivers, timeDiffs);
        }, simulationSpeed);
      };
      
      // Resume from current state
      runSimulation(currentLap, simulationData, timeDifferences);
    }
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    setIsPaused(false);
    if (simulationIntervalRef.current) {
      clearTimeout(simulationIntervalRef.current);
    }
  };

  const nextLap = () => {
    if (currentLap < lapHistory.length - 1) {
      // Navigate forward in history
      const nextIndex = currentLap + 1;
      setCurrentLap(nextIndex);
      setSimulationData(lapHistory[nextIndex]);
    } else if (currentLap < totalLaps - 1) {
      // Simulate one more lap
      const { drivers, timeDiffs } = simulateLap(simulationData, timeDifferences);
      setSimulationData(drivers);
      setTimeDifferences(timeDiffs);
      setCurrentLap(currentLap + 1);
      setLapHistory(prev => [...prev, JSON.parse(JSON.stringify(drivers))]);
    }
  };

  const previousLap = () => {
    if (currentLap > 0) {
      const prevIndex = currentLap - 1;
      setCurrentLap(prevIndex);
      setSimulationData(lapHistory[prevIndex]);
    }
  };

  const resetSimulation = () => {
    if (raceData) {
      const drivers = raceData.results.map((driver: Driver, index: number) => ({
        ...driver,
        position: index + 1
      }));
      
      const timeDiffs: Record<string, number> = {};
      drivers.forEach((driver: Driver) => {
        timeDiffs[driver.driver_code] = 0;
      });
      
      setSimulationData(drivers);
      setTimeDifferences(timeDiffs);
      setCurrentLap(0);
      setIsSimulating(false);
      setIsPaused(false);
      setLapHistory([JSON.parse(JSON.stringify(drivers))]);
      
      if (simulationIntervalRef.current) {
        clearTimeout(simulationIntervalRef.current);
      }
    }
  };

  const jumpToLap = (percentage: number) => {
    const targetLap = Math.floor(totalLaps * percentage);
    if (targetLap < lapHistory.length) {
      setCurrentLap(targetLap);
      setSimulationData(lapHistory[targetLap]);
    }
  };

  const getTeamColor = (teamName: string): string => {
    return TEAM_COLORS[teamName] || "#888888";
  };

  const getContrastColor = (hexColor: string): string => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? "#000000" : "#FFFFFF";
  };

  if (!raceData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading race data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold">F1 Race Simulation - FastF1</h1>
          <p className="text-slate-400">Real telemetry data visualization</p>
        </div>
      </header>

      <div className="px-6 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Load Race Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Load Race Data</h3>
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                  min="2018"
                  max="2024"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Round</label>
                <input
                  type="number"
                  value={round}
                  onChange={(e) => setRound(parseInt(e.target.value))}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white"
                  min="1"
                  max="24"
                />
              </div>
              <div className="flex-1"></div>
              <button
                onClick={loadRaceData}
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition rounded-lg font-semibold"
              >
                {isLoading ? 'Loading...' : 'Load Race'}
              </button>
            </div>
            {error && (
              <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded text-red-200">
                Error: {error}
              </div>
            )}
          </div>

          {!raceData && !isLoading && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
              <p className="text-slate-400">Load a race to begin simulation</p>
            </div>
          )}
        </div>
      </div>

      {raceData && (
        <>
          <div className="px-6 py-6">
            <div className="max-w-6xl mx-auto">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
                <h2 className="text-2xl font-bold mb-2">{raceData.race_name}</h2>
                <p className="text-slate-400">{raceData.location} • {raceData.year}</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={startSimulation}
                      disabled={isSimulating && !isPaused}
                      className={`px-6 py-3 font-semibold rounded-lg transition ${
                        isSimulating && !isPaused
                          ? "bg-green-600 opacity-50 cursor-not-allowed"
                          : "bg-red-600 hover:bg-red-500"
                      }`}
                    >
                      {isSimulating && !isPaused ? "Running..." : "Start Simulation"}
                    </button>
                    <button
                      onClick={pauseSimulation}
                      disabled={!isSimulating}
                      className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold rounded-lg"
                    >
                      {isPaused ? "Resume" : "Pause"}
                    </button>
                    <button
                      onClick={stopSimulation}
                      disabled={!isSimulating}
                      className="px-6 py-3 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold rounded-lg"
                    >
                      Stop
                    </button>
                    <button
                      onClick={resetSimulation}
                      className="px-6 py-3 border border-slate-700 hover:border-slate-500 transition rounded-lg"
                    >
                      Reset
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <button
                      onClick={previousLap}
                      disabled={currentLap === 0 || (isSimulating && !isPaused)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition rounded-lg"
                    >
                      ← Previous Lap
                    </button>
                    <button
                      onClick={nextLap}
                      disabled={currentLap >= totalLaps - 1 || (isSimulating && !isPaused)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition rounded-lg"
                    >
                      Next Lap →
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Simulation Speed</h3>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-400">Fast</span>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      value={2100 - simulationSpeed}
                      onChange={(e) => setSimulationSpeed(2100 - parseInt(e.target.value))}
                      className="flex-1"
                      disabled={isSimulating && !isPaused}
                    />
                    <span className="text-sm text-slate-400">Slow</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Current: {simulationSpeed}ms per lap
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Race Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Lap:</span>
                      <span className="font-bold text-red-500">{currentLap}/{totalLaps}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        isSimulating
                          ? (isPaused ? "bg-yellow-600 text-white" : "bg-green-600 text-white")
                          : "bg-gray-600 text-white"
                      }`}>
                        {isSimulating ? (isPaused ? "Paused" : "Running") : "Stopped"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">History:</span>
                      <span className="text-sm">{currentLap}/{lapHistory.length - 1}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Quick Jump</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => jumpToLap(0.25)}
                      className="w-full px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 transition rounded"
                      disabled={isSimulating && !isPaused}
                    >
                      Jump to 25%
                    </button>
                    <button
                      onClick={() => jumpToLap(0.5)}
                      className="w-full px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 transition rounded"
                      disabled={isSimulating && !isPaused}
                    >
                      Jump to 50%
                    </button>
                    <button
                      onClick={() => jumpToLap(0.75)}
                      className="w-full px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 transition rounded"
                      disabled={isSimulating && !isPaused}
                    >
                      Jump to 75%
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 pb-10">
            <div className="max-w-6xl mx-auto">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800">
                  <h2 className="text-xl font-semibold">Race Grid</h2>
                  <p className="text-slate-400 text-sm">Live position updates during simulation</p>
                </div>
                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="text-left py-3 px-6 font-semibold text-slate-300">Position</th>
                        <th className="text-left py-3 px-6 font-semibold text-slate-300">Driver</th>
                        <th className="text-left py-3 px-6 font-semibold text-slate-300">Team</th>
                        <th className="text-left py-3 px-6 font-semibold text-slate-300">Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulationData.map((driver) => {
                        const timeDiff = timeDifferences[driver.driver_code] || 0;
                        const isLeader = driver.position === 1;
                        const teamColor = getTeamColor(driver.team);
                        const textColor = getContrastColor(teamColor);
                        
                        return (
                          <tr
                            key={driver.driver_code}
                            className="transition-all duration-300"
                            style={{
                              backgroundColor: teamColor,
                              color: textColor
                            }}
                          >
                            <td className="py-4 px-6 font-bold text-lg">
                              {driver.position}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <span className="font-semibold">{driver.driver_code}</span>
                                <span className="text-sm opacity-80">{driver.driver_name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-medium">{driver.team}</td>
                            <td className="py-4 px-6 text-sm font-mono">
                              {isLeader ? "LEADER" : `+${timeDiff.toFixed(3)}s`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
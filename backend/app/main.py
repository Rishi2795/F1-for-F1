from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.routers import races, tracks, seasons
from app.core.precomputed_loader import list_seasons

app = FastAPI(
    title="F1 StratHub API",
    description="High-performance Formula 1 strategy & analytics API",
    version="1.0.0",
)

# ---------------------------------------------------------------------
# 🛡️ MIDDLEWARE STACK (Ordered Bottom-to-Top execution)
# ---------------------------------------------------------------------

# 1. CORS Middleware (Applied LAST on response, keeping headers intact)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. GZIP COMPRESSION (Applied FIRST on response payload > 500 bytes)
app.add_middleware(
    GZipMiddleware,
    minimum_size=500
)

# ---------------------------------------------------------------------
# 🏁 GLOBAL SYSTEM ENDPOINTS (Root & Health Check)
# ---------------------------------------------------------------------

@app.get("/")
@app.head("/")
async def root_health_check():
    return {
        "status": "online",
        "engine": "Specter Engine Active",
        "message": "F1 Analytics API Gateway Operational"
    }

@app.get("/health")
def health():
    return {"status": "ok"}

# ---------------------------------------------------------------------
# 🗺️ ROUTER ROUTING (Explicit Dual-Routing Strategy)
# ---------------------------------------------------------------------

# Route Map 1: Standard API Gateway paths (Handles: /api/seasons, /api/races, etc.)
app.include_router(races.router, prefix="/api/races")
app.include_router(tracks.router, prefix="/api/tracks")
app.include_router(seasons.router, prefix="/api/seasons")

# Route Map 2: Production Frontend Fallback paths (Handles: /seasons, /races, etc.)
app.include_router(races.router, prefix="/races")
app.include_router(tracks.router, prefix="/tracks")
app.include_router(seasons.router, prefix="/seasons")

# ---------------------------------------------------------------------
# ⚡ LIFECYCLE HOOKS (Cache Warming)
# ---------------------------------------------------------------------
@app.on_event("startup")
def warm_cache():
    try:
        list_seasons()
    except Exception:
        pass
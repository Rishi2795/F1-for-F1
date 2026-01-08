from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import races, tracks, seasons
from app.core.precomputed_loader import list_seasons

app = FastAPI(
    title="F1 StratHub API",
    description="High-performance Formula 1 strategy & analytics API",
    version="1.0.0",
)

# -----------------------------
# CORS (safe for now, tighten later)
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# API Routers
# -----------------------------
app.include_router(races.router, prefix="/api")
app.include_router(tracks.router, prefix="/api")
app.include_router(seasons.router, prefix="/api")

# -----------------------------
# 🔥 Warm critical caches on startup
# -----------------------------
@app.on_event("startup")
def warm_cache():
    """
    Warm frequently-used cached data once on startup
    to avoid slow first user request (Render cold start).
    """
    try:
        list_seasons()
    except Exception:
        # Fail silently — app should still start
        pass

# -----------------------------
# Health check (Render / monitoring)
# -----------------------------
@app.get("/health")
def health():
    return {"status": "ok"}
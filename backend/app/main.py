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

# -----------------------------
# ✅ GZIP COMPRESSION (KEY FIX)
# -----------------------------
# Compress responses > 500 bytes
# This dramatically speeds up mobile & slow networks
app.add_middleware(
    GZipMiddleware,
    minimum_size=500
)

# -----------------------------
# CORS
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
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
# Warm cache on startup
# -----------------------------
@app.on_event("startup")
def warm_cache():
    try:
        list_seasons()
    except Exception:
        pass

# -----------------------------
# Health check
# -----------------------------
@app.get("/health")
def health():
    return {"status": "ok"}
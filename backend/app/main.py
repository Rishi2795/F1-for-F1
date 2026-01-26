from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import races, tracks, seasons, simulation


app = FastAPI(title="F1 StratHub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # later restrict to your frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(races.router, prefix="/api")
app.include_router(tracks.router, prefix="/api")
app.include_router(seasons.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}

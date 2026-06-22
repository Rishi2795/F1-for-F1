from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI_NEW")

# ---------------------------------------------------------------------------
# Lazy DB proxy — server starts even without MONGO_URI_NEW.
# Routes that need MongoDB will get a clear 503 instead of a startup crash.
# ---------------------------------------------------------------------------
class _LazyDB:
    """Proxy that defers MongoClient creation until first attribute access."""
    _client = None
    _db = None

    def _connect(self):
        if self._db is None:
            if not MONGO_URI:
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=503,
                    detail="❌ MongoDB not configured. Add MONGO_URI_NEW to backend/.env"
                )
            self._client = MongoClient(
                MONGO_URI,
                serverSelectionTimeoutMS=5000,
                maxPoolSize=10,
            )
            self._db = self._client["f1_strathub"]
        return self._db

    def __getattr__(self, name):
        return getattr(self._connect(), name)


db = _LazyDB()


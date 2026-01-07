from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise RuntimeError("❌ MONGO_URI not found. Check backend/.env")

client = MongoClient(MONGO_URI)

db = client["f1_strathub"]

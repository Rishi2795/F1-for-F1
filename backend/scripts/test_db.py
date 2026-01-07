import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.db.mongo import db

print(db.list_collection_names())

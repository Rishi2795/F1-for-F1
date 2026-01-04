from fastapi import APIRouter

router = APIRouter(prefix="/tracks", tags=["tracks"])

@router.get("/ping")
def ping():
    return {"message": "tracks router alive"}

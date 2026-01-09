from fastapi import APIRouter, Depends
from app.utils.rbac import get_current_user
from app.db.mongodb import db

router = APIRouter()

@router.get('/')
async def get_notifications(user=Depends(get_current_user)):
    cursor = db["notifications"].find({"user_id": user["id"]})
    notifications = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        notifications.append(doc)
    return {"notifications": notifications}

from app.db.mongodb import db
from datetime import datetime

async def create_notification(user_id: str, message: str):
    notification = {
        "user_id": user_id,
        "message": message,
        "read": False,
        "created_at": datetime.utcnow().isoformat()
    }
    await db["notifications"].insert_one(notification)
    return notification

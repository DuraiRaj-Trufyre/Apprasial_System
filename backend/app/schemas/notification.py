from pydantic import BaseModel

class NotificationCreateSchema(BaseModel):
    user_id: str
    message: str

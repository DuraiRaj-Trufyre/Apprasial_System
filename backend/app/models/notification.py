from pydantic import BaseModel
from typing import Optional

class Notification(BaseModel):
    id: Optional[str]
    user_id: str
    message: str
    read: bool = False
    created_at: Optional[str]

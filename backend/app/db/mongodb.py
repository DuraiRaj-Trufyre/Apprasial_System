from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import MONGODB_URL

client = AsyncIOMotorClient(MONGODB_URL)
db = client.get_default_database()

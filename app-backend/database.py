from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGO_URI, DB_NAME

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

def get_collection(name: str):
    return db[name]

async def check_connection() -> bool:
    try:
        await client.admin.command("ping")
        return True
    except Exception:
        return False
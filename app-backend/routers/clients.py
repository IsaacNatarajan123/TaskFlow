from fastapi import APIRouter
from pydantic import BaseModel
from bson import ObjectId
from database import get_collection

router = APIRouter(prefix="/clients", tags=["clients"])
clients_collection = get_collection("clients")

class ClientCreate(BaseModel):
    client_name: str
    status: str = "active"

@router.post("")
async def create_client(client: ClientCreate):
    existing = await clients_collection.find_one({"client_name": client.client_name})
    if existing:
        return {"error": "A client with this name already exists"}
    result = await clients_collection.insert_one({"client_name": client.client_name, "status": client.status})
    return {"message": "Client created", "id": str(result.inserted_id)}

@router.get("")
async def list_clients():
    cursor = clients_collection.find()
    clients = []
    async for c in cursor:
        c["_id"] = str(c["_id"])
        clients.append(c)
    return clients

@router.patch("/{client_id}")
async def update_client(client_id: str, client: ClientCreate):
    await clients_collection.update_one({"_id": ObjectId(client_id)}, {"$set": {"client_name": client.client_name, "status": client.status}})
    return {"message": "Client updated"}

@router.delete("/{client_id}")
async def delete_client(client_id: str):
    from database import get_collection as gc
    tasks_collection = gc("tasks")
    in_use = await tasks_collection.count_documents({"client_id": client_id})
    if in_use > 0:
        return {"error": "Cannot delete a client with existing tasks. Mark it inactive instead."}
    await clients_collection.delete_one({"_id": ObjectId(client_id)})
    return {"message": "Client deleted"}
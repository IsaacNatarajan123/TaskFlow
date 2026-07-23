from fastapi import APIRouter, Depends
from pydantic import BaseModel
from bson import ObjectId
from database import get_collection
from auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])
tasks_collection = get_collection("tasks")

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    client_id: str
    department_id: str
    priority: str
    start_date: str = None
    deadline: str = None
    status: str = "open"

@router.post("")
async def create_task(task: TaskCreate, current_user: str = Depends(get_current_user)):
    user = await get_collection("users").find_one({"_id": ObjectId(current_user)})
    if user and user.get("designation") == "CEO":
        return {"error": "CEO accounts do not create or manage tasks"}

    new_task = {
        "title": task.title,
        "description": task.description,
        "client_id": task.client_id,
        "department_id": task.department_id,
        "priority": task.priority,
        "start_date": task.start_date,
        "deadline": task.deadline,
        "status": task.status,
        "created_by": current_user
    }
    result = await tasks_collection.insert_one(new_task)
    return {"message": "Task created", "id": str(result.inserted_id)}

@router.get("")
async def list_tasks(client_id: str = None, department_id: str = None, status: str = None):
    query = {}
    if client_id: query["client_id"] = client_id
    if department_id: query["department_id"] = department_id
    if status: query["status"] = status
    cursor = tasks_collection.find(query)
    tasks = []
    async for t in cursor:
        t["_id"] = str(t["_id"])
        tasks.append(t)
    return tasks

class TaskUpdate(BaseModel):
    title: str = None
    description: str = None
    priority: str = None
    start_date: str = None
    deadline: str = None
    status: str = None

@router.patch("/{task_id}")
async def update_task(task_id: str, update: TaskUpdate, current_user: str = Depends(get_current_user)):
    task = await tasks_collection.find_one({"_id": ObjectId(task_id)})
    if not task:
        return {"error": "Task not found"}
    if task["created_by"] != current_user:
        return {"error": "Only the task creator can edit this task"}
    fields = {k: v for k, v in update.dict().items() if v is not None}
    await tasks_collection.update_one({"_id": ObjectId(task_id)}, {"$set": fields})
    return {"message": "Task updated"}

@router.delete("/{task_id}")
async def delete_task(task_id: str, current_user: str = Depends(get_current_user)):
    from database import get_collection as gc
    time_entries = gc("time_entries")
    task = await tasks_collection.find_one({"_id": ObjectId(task_id)})
    if not task:
        return {"error": "Task not found"}
    if task["created_by"] != current_user:
        return {"error": "Only the task creator can delete this task"}
    entry_count = await time_entries.count_documents({"task_id": task_id})
    if entry_count > 0:
        return {"error": "Cannot delete a task with logged time entries. Close it instead."}
    await tasks_collection.delete_one({"_id": ObjectId(task_id)})
    return {"message": "Task deleted"}
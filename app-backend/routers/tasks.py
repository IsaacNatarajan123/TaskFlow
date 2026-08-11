from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from database import get_collection
from auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])
tasks_collection = get_collection("tasks")
users_collection = get_collection("users")

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    client_id: str
    department_id: str
    priority: str
    start_date: str = None
    deadline: str = None
    status: str = "open"
    story_id: str = None
    depends_on_task_id: str = None

@router.post("")
async def create_task(task: TaskCreate, current_user: str = Depends(get_current_user)):
    user = await users_collection.find_one({"_id": ObjectId(current_user)})
    if user and user.get("designation") == "CEO":
        return {"error": "CEO accounts do not create or manage tasks"}

    if task.depends_on_task_id:
        dep = await tasks_collection.find_one({"_id": ObjectId(task.depends_on_task_id)})
        if not dep:
            return {"error": "The task you're trying to depend on doesn't exist"}

    new_task = {
        "title": task.title,
        "description": task.description,
        "client_id": task.client_id,
        "department_id": task.department_id,
        "priority": task.priority,
        "start_date": task.start_date,
        "deadline": task.deadline,
        "status": task.status,
        "story_id": task.story_id,
        "depends_on_task_id": task.depends_on_task_id,
        "created_by": current_user
    }
    result = await tasks_collection.insert_one(new_task)
    return {"message": "Task created", "id": str(result.inserted_id)}

@router.get("")
async def list_tasks(client_id: str = None, department_id: str = None, status: str = None, current_user: str = Depends(get_current_user)):
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

@router.get("/timeline")
async def personal_timeline(current_user: str = Depends(get_current_user)):
    cursor = tasks_collection.find({"created_by": current_user})
    scheduled = []
    unscheduled = []
    async for t in cursor:
        t["_id"] = str(t["_id"])
        if t.get("start_date") and t.get("deadline"):
            scheduled.append(t)
        else:
            unscheduled.append(t)
    return {"scheduled": scheduled, "unscheduled": unscheduled}

@router.get("/team-timeline")
async def team_timeline(current_user: str = Depends(get_current_user)):
    reports_cursor = users_collection.find({"manager_id": current_user})
    report_ids = [str(u["_id"]) async for u in reports_cursor]

    if not report_ids:
        return {"scheduled": [], "unscheduled": []}

    cursor = tasks_collection.find({"created_by": {"$in": report_ids}})
    scheduled = []
    unscheduled = []
    async for t in cursor:
        t["_id"] = str(t["_id"])
        owner = await users_collection.find_one({"_id": ObjectId(t["created_by"])})
        t["owner_name"] = owner["name"] if owner else "Unknown"
        if t.get("start_date") and t.get("deadline"):
            scheduled.append(t)
        else:
            unscheduled.append(t)
    return {"scheduled": scheduled, "unscheduled": unscheduled}

class TaskUpdate(BaseModel):
    title: str = None
    description: str = None
    priority: str = None
    start_date: str = None
    deadline: str = None
    status: str = None
    story_id: Optional[str] = None
    depends_on_task_id: Optional[str] = None

@router.patch("/{task_id}")
async def update_task(task_id: str, update: TaskUpdate, current_user: str = Depends(get_current_user)):
    task = await tasks_collection.find_one({"_id": ObjectId(task_id)})
    if not task:
        return {"error": "Task not found"}
    if task["created_by"] != current_user:
        return {"error": "Only the task creator can edit this task"}

    update_dict = update.dict()

    if update_dict.get("depends_on_task_id"):
        if update_dict["depends_on_task_id"] == task_id:
            return {"error": "A task cannot depend on itself"}
        dep = await tasks_collection.find_one({"_id": ObjectId(update_dict["depends_on_task_id"])})
        if not dep:
            return {"error": "The task you're trying to depend on doesn't exist"}

    # story_id and depends_on_task_id are always applied as sent, including null (unlinking),
    # since "no story" / "no dependency" are real, valid states — unlike other fields,
    # which mean "don't change this" when omitted.
    passthrough = ["story_id", "depends_on_task_id"]
    fields = {k: v for k, v in update_dict.items() if v is not None and k not in passthrough}
    for k in passthrough:
        fields[k] = update_dict.get(k)

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
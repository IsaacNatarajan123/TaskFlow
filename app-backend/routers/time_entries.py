from fastapi import APIRouter, Depends
from pydantic import BaseModel
from bson import ObjectId
from database import get_collection
from auth import get_current_user

router = APIRouter(prefix="/time-entries", tags=["time_entries"])
time_entries_collection = get_collection("time_entries")
tasks_collection = get_collection("tasks")

class TimeEntryCreate(BaseModel):
    task_id: str
    date: str
    hours: float

@router.post("")
async def log_time(entry: TimeEntryCreate, current_user: str = Depends(get_current_user)):
    if entry.hours < 0 or entry.hours > 24:
        return {"error": "Hours must be between 0 and 24"}

    task = await tasks_collection.find_one({"_id": ObjectId(entry.task_id)})
    if not task:
        return {"error": "Task not found"}
    if task["created_by"] != current_user:
        return {"error": "You can only log time against your own tasks"}

    existing = await time_entries_collection.find_one({
        "user_id": current_user, "task_id": entry.task_id, "date": entry.date
    })

    # Check if this entry is locked (belongs to a Submitted/Approved submission)
    if existing and existing.get("submission_id"):
        from database import get_collection as gc
        submissions = gc("weekly_submissions")
        sub = await submissions.find_one({"_id": ObjectId(existing["submission_id"])})
        if sub and sub["status"] in ["submitted", "approved"]:
            return {"error": "This entry is locked — its week has been submitted"}

    # Daily total check (soft warning handled on frontend; hard block here)
    day_entries = time_entries_collection.find({"user_id": current_user, "date": entry.date})
    day_total = 0.0
    async for e in day_entries:
        if existing and str(e["_id"]) == str(existing["_id"]):
            continue
        day_total += e["hours"]
    if day_total + entry.hours > 24:
        return {"error": "Daily total cannot exceed 24 hours"}

    if existing:
        await time_entries_collection.update_one({"_id": existing["_id"]}, {"$set": {"hours": entry.hours}})
        return {"message": "Entry updated"}
    else:
        result = await time_entries_collection.insert_one({
            "user_id": current_user, "task_id": entry.task_id, "date": entry.date,
            "hours": entry.hours, "submission_id": None
        })
        return {"message": "Entry logged", "id": str(result.inserted_id)}

@router.get("")
async def get_week_entries(week_start: str, current_user: str = Depends(get_current_user)):
    from datetime import datetime, timedelta
    start = datetime.strptime(week_start, "%Y-%m-%d")
    end = start + timedelta(days=6)
    cursor = time_entries_collection.find({
        "user_id": current_user,
        "date": {"$gte": start.strftime("%Y-%m-%d"), "$lte": end.strftime("%Y-%m-%d")}
    })
    entries = []
    async for e in cursor:
        e["_id"] = str(e["_id"])
        entries.append(e)
    return entries

@router.get("/by-submission/{submission_id}")
async def get_entries_by_submission(submission_id: str, current_user: str = Depends(get_current_user)):
    from database import get_collection as gc
    submissions = gc("weekly_submissions")
    users = gc("users")

    sub = await submissions.find_one({"_id": ObjectId(submission_id)})
    if not sub:
        return {"error": "Submission not found"}

    # Only the submission's owner or their direct manager can view its entries
    owner = await users.find_one({"_id": ObjectId(sub["user_id"])})
    is_owner = sub["user_id"] == current_user
    is_manager = owner and owner.get("manager_id") == current_user
    if not (is_owner or is_manager):
        return {"error": "Not authorized to view these entries"}

    cursor = time_entries_collection.find({"submission_id": submission_id})
    entries = []
    async for e in cursor:
        e["_id"] = str(e["_id"])
        entries.append(e)
    return entries
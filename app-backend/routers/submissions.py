from fastapi import APIRouter, Depends
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from database import get_collection
from auth import get_current_user

router = APIRouter(prefix="/submissions", tags=["submissions"])
submissions_collection = get_collection("weekly_submissions")
time_entries_collection = get_collection("time_entries")
users_collection = get_collection("users")
audit_log_collection = get_collection("audit_log")

async def log_action(action: str, entity_type: str, entity_id: str, performed_by: str, details: str = ""):
    await audit_log_collection.insert_one({
        "action": action, "entity_type": entity_type, "entity_id": entity_id,
        "performed_by": performed_by, "timestamp": datetime.now(timezone.utc), "details": details
    })

class SubmitWeek(BaseModel):
    week_start_date: str

@router.post("/submit-week")
async def submit_week(req: SubmitWeek, current_user: str = Depends(get_current_user)):
    existing = await submissions_collection.find_one({
        "user_id": current_user, "week_start_date": req.week_start_date
    })
    if existing and existing["status"] in ["submitted", "approved"]:
        return {"error": "This week has already been submitted"}

    start = datetime.strptime(req.week_start_date, "%Y-%m-%d")
    end = start + timedelta(days=6)

    if existing and existing["status"] == "returned":
        submission_id = existing["_id"]
        await submissions_collection.update_one({"_id": submission_id}, {"$set": {"status": "submitted", "submitted_at": datetime.now(timezone.utc)}})
        await log_action("resubmitted", "weekly_submission", str(submission_id), current_user)
    else:
        result = await submissions_collection.insert_one({
            "user_id": current_user, "week_start_date": req.week_start_date,
            "status": "submitted", "submitted_at": datetime.now(timezone.utc),
            "approved_by": None, "decision_at": None, "comments": None
        })
        submission_id = result.inserted_id

    await time_entries_collection.update_many(
        {"user_id": current_user,
         "date": {"$gte": start.strftime("%Y-%m-%d"), "$lte": end.strftime("%Y-%m-%d")}},
        {"$set": {"submission_id": str(submission_id)}}
    )
    return {"message": "Week submitted", "id": str(submission_id)}

@router.get("")
async def my_team_submissions(current_user: str = Depends(get_current_user)):
    cursor = users_collection.find({"manager_id": current_user})
    report_ids = [str(u["_id"]) async for u in cursor]
    sub_cursor = submissions_collection.find({"user_id": {"$in": report_ids}})
    subs = []
    async for s in sub_cursor:
        s["_id"] = str(s["_id"])
        user = await users_collection.find_one({"_id": ObjectId(s["user_id"])})
        s["employee_name"] = user["name"] if user else "Unknown"
        subs.append(s)
    return subs

class ReturnRequest(BaseModel):
    comment: str

@router.post("/{submission_id}/approve")
async def approve_submission(submission_id: str, current_user: str = Depends(get_current_user)):
    sub = await submissions_collection.find_one({"_id": ObjectId(submission_id)})
    if not sub:
        return {"error": "Submission not found"}
    user = await users_collection.find_one({"_id": ObjectId(sub["user_id"])})
    if not user or user.get("manager_id") != current_user:
        return {"error": "Only the direct manager can approve this submission"}
    if sub["status"] != "submitted":
        return {"error": "Only a Submitted submission can be approved"}

    await submissions_collection.update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": {"status": "approved", "approved_by": current_user, "decision_at": datetime.now(timezone.utc)}}
    )
    await log_action("approved", "weekly_submission", submission_id, current_user)
    return {"message": "Submission approved"}

@router.post("/{submission_id}/return")
async def return_submission(submission_id: str, req: ReturnRequest, current_user: str = Depends(get_current_user)):
    if not req.comment.strip():
        return {"error": "A comment is required to return a submission"}

    sub = await submissions_collection.find_one({"_id": ObjectId(submission_id)})
    if not sub:
        return {"error": "Submission not found"}
    user = await users_collection.find_one({"_id": ObjectId(sub["user_id"])})
    if not user or user.get("manager_id") != current_user:
        return {"error": "Only the direct manager can return this submission"}
    if sub["status"] != "submitted":
        return {"error": "Only a Submitted submission can be returned"}

    await submissions_collection.update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": {"status": "returned", "approved_by": current_user, "decision_at": datetime.now(timezone.utc), "comments": req.comment}}
    )
    await log_action("returned", "weekly_submission", submission_id, current_user, req.comment)
    return {"message": "Submission returned"}

@router.get("/my")
async def my_submissions(current_user: str = Depends(get_current_user)):
    cursor = submissions_collection.find({"user_id": current_user})
    subs = []
    async for s in cursor:
        s["_id"] = str(s["_id"])
        subs.append(s)
    return subs
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from email_service import send_email
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
    user = await users_collection.find_one({"_id": ObjectId(current_user)})
    if user and user.get("designation") == "CEO":
        return {"error": "CEO accounts do not submit weekly time"}
    existing = await submissions_collection.find_one({
        "user_id": current_user, "week_start_date": req.week_start_date
    })

    start = datetime.strptime(req.week_start_date, "%Y-%m-%d")
    end = start + timedelta(days=6)

    if existing and existing["status"] in ["returned", "submitted", "approved"]:
        submission_id = existing["_id"]
        await submissions_collection.update_one(
            {"_id": submission_id},
            {"$set": {
                "status": "submitted", "submitted_at": datetime.now(timezone.utc),
                "last_reminder_sent": None, "reminder_count": 0
            }}
        )
        await log_action("resubmitted", "weekly_submission", str(submission_id), current_user)
    else:
        result = await submissions_collection.insert_one({
            "user_id": current_user, "week_start_date": req.week_start_date,
            "status": "submitted", "submitted_at": datetime.now(timezone.utc),
            "approved_by": None, "decision_at": None, "comments": None,
            "last_reminder_sent": None, "reminder_count": 0
        })
        submission_id = result.inserted_id

    await time_entries_collection.update_many(
        {"user_id": current_user,
         "date": {"$gte": start.strftime("%Y-%m-%d"), "$lte": end.strftime("%Y-%m-%d")}},
        {"$set": {"submission_id": str(submission_id)}}
    )
    # Director self-approval: since the CEO doesn't participate in approvals,
    # a Director's own submission auto-approves immediately, logged for transparency.
    user = await users_collection.find_one({"_id": ObjectId(current_user)})
    if user and user.get("designation") in ["Director", "Sr. Director"]:
        await submissions_collection.update_one(
            {"_id": submission_id},
            {"$set": {"status": "approved", "approved_by": current_user, "decision_at": datetime.now(timezone.utc)}}
        )
        await log_action("auto-approved", "weekly_submission", str(submission_id), current_user)
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
    approver = await users_collection.find_one({"_id": ObjectId(current_user)})
    if approver and approver.get("designation") == "CEO":
        return {"error": "CEO accounts do not approve submissions"}
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
    approver = await users_collection.find_one({"_id": ObjectId(current_user)})
    if approver and approver.get("designation") == "CEO":
        return {"error": "CEO accounts do not return submissions"}
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

async def run_escalation_check():
    now = datetime.now(timezone.utc)
    pending = submissions_collection.find({"status": "submitted"})

    async for sub in pending:
        submitted_at = sub["submitted_at"]
        if submitted_at.tzinfo is None:
            submitted_at = submitted_at.replace(tzinfo=timezone.utc)
        days_pending = (now - submitted_at).days

        last_reminder = sub.get("last_reminder_sent")
        reminder_count = sub.get("reminder_count", 0)

        employee = await users_collection.find_one({"_id": ObjectId(sub["user_id"])})
        if not employee:
            continue

        if days_pending >= 10:
            # Notify employee directly, only once
            if reminder_count < 100:  # simple guard so we don't spam repeatedly after day 10
                send_email(
                    employee["email"],
                    "Your submitted week is still pending approval",
                    f"Hi {employee['name']}, your week starting {sub['week_start_date']} has not been approved yet. Please follow up with your manager."
                )
                await submissions_collection.update_one(
                    {"_id": sub["_id"]},
                    {"$set": {"reminder_count": 100}}  # marks "employee notified" so we don't resend
                )
            continue

        if days_pending >= 3:
            should_send = (
                last_reminder is None or
                (now - (last_reminder.replace(tzinfo=timezone.utc) if last_reminder.tzinfo is None else last_reminder)).days >= 2
            )
            if should_send and reminder_count < 3:
                manager = await users_collection.find_one({"_id": ObjectId(employee.get("manager_id"))}) if employee.get("manager_id") else None
                if manager:
                    send_email(
                        manager["email"],
                        f"Reminder: {employee['name']}'s week is awaiting your approval",
                        f"Hi {manager['name']}, {employee['name']}'s week starting {sub['week_start_date']} has been pending for {days_pending} days. Please review it."
                    )
                    await submissions_collection.update_one(
                        {"_id": sub["_id"]},
                        {"$set": {"last_reminder_sent": now, "reminder_count": reminder_count + 1}}
                    )
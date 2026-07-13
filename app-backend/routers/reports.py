from fastapi import APIRouter, Depends
from database import get_collection
from auth import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])
clients_collection = get_collection("clients")
tasks_collection = get_collection("tasks")
time_entries_collection = get_collection("time_entries")
submissions_collection = get_collection("weekly_submissions")

@router.get("/company-wide")
async def company_wide_report(current_user: str = Depends(get_current_user)):
    # Only entries belonging to Approved submissions count
    approved_cursor = submissions_collection.find({"status": "approved"})
    approved_ids = [str(s["_id"]) async for s in approved_cursor]

    entries_cursor = time_entries_collection.find({"submission_id": {"$in": approved_ids}})
    entries = [e async for e in entries_cursor]

    tasks_cursor = tasks_collection.find()
    task_client_map = {}
    async for t in tasks_cursor:
        task_client_map[str(t["_id"])] = t.get("client_id")

    clients_cursor = clients_collection.find()
    clients = [c async for c in clients_cursor]

    result = []
    for c in clients:
        client_id = str(c["_id"])
        client_entries = [e for e in entries if task_client_map.get(e["task_id"]) == client_id]
        total_hours = sum(e["hours"] for e in client_entries)
        employee_count = len(set(e["user_id"] for e in client_entries))
        result.append({
            "client_id": client_id,
            "client_name": c["client_name"],
            "total_hours": total_hours,
            "employee_count": employee_count,
        })
    return result
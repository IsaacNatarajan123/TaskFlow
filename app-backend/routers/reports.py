from fastapi import APIRouter, Depends
from database import get_collection
from auth import get_current_user
from bson import ObjectId
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
import io

router = APIRouter(prefix="/reports", tags=["reports"])
clients_collection = get_collection("clients")
tasks_collection = get_collection("tasks")
time_entries_collection = get_collection("time_entries")
submissions_collection = get_collection("weekly_submissions")

@router.get("/company-wide")
async def company_wide_report(start_date: str = None, end_date: str = None, current_user: str = Depends(get_current_user)):
    # Only entries belonging to Approved submissions count
    approved_cursor = submissions_collection.find({"status": "approved"})
    approved_ids = [str(s["_id"]) async for s in approved_cursor]

    entry_filter = {"submission_id": {"$in": approved_ids}}
    if start_date and end_date:
        entry_filter["date"] = {"$gte": start_date, "$lte": end_date}
    entries_cursor = time_entries_collection.find(entry_filter)
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

@router.get("/client/{client_id}")
async def client_drilldown(client_id: str, start_date: str = None, end_date: str = None, current_user: str = Depends(get_current_user)):
    approved_cursor = submissions_collection.find({"status": "approved"})
    approved_ids = [str(s["_id"]) async for s in approved_cursor]

    entry_filter = {"submission_id": {"$in": approved_ids}}
    if start_date and end_date:
        entry_filter["date"] = {"$gte": start_date, "$lte": end_date}
    entries_cursor = time_entries_collection.find(entry_filter)
    entries = [e async for e in entries_cursor]

    tasks_cursor = tasks_collection.find({"client_id": client_id})
    client_tasks = {str(t["_id"]): t async for t in tasks_cursor}

    users_collection = get_collection("users")
    departments_collection = get_collection("departments")
    result = []
    for e in entries:
        if e["task_id"] in client_tasks:
            task = client_tasks[e["task_id"]]
            user = await users_collection.find_one({"_id": ObjectId(e["user_id"])})
            dept = await departments_collection.find_one({"_id": ObjectId(task.get("department_id"))}) if task.get("department_id") else None
            result.append({
                "task_title": task["title"],
                "task_description": task.get("description", ""),
                "department_name": dept["department_name"] if dept else "Unknown",
                "priority": task.get("priority", ""),
                "employee_name": user["name"] if user else "Unknown",
                "date": e["date"],
                "hours": e["hours"],
            })
    return result

@router.get("/company-wide/export")
async def export_company_wide(start_date: str = None, end_date: str = None, current_user: str = Depends(get_current_user)):
    from datetime import datetime, timedelta

    approved_cursor = submissions_collection.find({"status": "approved"})
    approved_ids = [str(s["_id"]) async for s in approved_cursor]

    entry_filter = {"submission_id": {"$in": approved_ids}}
    if start_date and end_date:
        entry_filter["date"] = {"$gte": start_date, "$lte": end_date}
    entries_cursor = time_entries_collection.find(entry_filter)
    entries = [e async for e in entries_cursor]

    tasks_cursor = tasks_collection.find()
    task_map = {str(t["_id"]): t async for t in tasks_cursor}

    clients_cursor = clients_collection.find()
    clients_map = {str(c["_id"]): c["client_name"] async for c in clients_cursor}

    departments_collection = get_collection("departments")
    dept_cursor = departments_collection.find()
    dept_map = {str(d["_id"]): d["department_name"] async for d in dept_cursor}

    users_collection = get_collection("users")

    def week_range(date_str):
        d = datetime.strptime(date_str, "%Y-%m-%d")
        start = d - timedelta(days=d.weekday())
        end = start + timedelta(days=6)
        return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")

    # Group by (task, user, week) summing hours
    weekly = {}
    for e in entries:
        task = task_map.get(e["task_id"])
        if not task:
            continue
        week_start, week_end = week_range(e["date"])
        key = (task["client_id"], e["task_id"], e["user_id"], week_start)
        if key not in weekly:
            weekly[key] = {"hours": 0, "week_start": week_start, "week_end": week_end}
        weekly[key]["hours"] += e["hours"]

    # Group by client for collapsible rows
    by_client = {}
    for (client_id, task_id, user_id, week_start), data in weekly.items():
        by_client.setdefault(client_id, []).append((task_id, user_id, data))

    wb = Workbook()
    ws = wb.active
    ws.title = "Report"
    ws.append(["Client", "Task", "Employee", "Department", "Week", "Hours"])

    row_num = 2
    for client_id, items in by_client.items():
        client_name = clients_map.get(client_id, "Unknown")
        ws.append([client_name, "", "", "", "", ""])
        row_num += 1
        for task_id, user_id, data in items:
            task = task_map.get(task_id, {})
            user = await users_collection.find_one({"_id": ObjectId(user_id)})
            dept_name = dept_map.get(task.get("department_id"), "—")
            week_label = f"{data['week_start']} – {data['week_end']}"
            ws.append(["", task.get("title", "Unknown"), user["name"] if user else "Unknown", dept_name, week_label, data["hours"]])
            ws.row_dimensions[row_num].outlineLevel = 1
            row_num += 1

    # Auto-fit column widths
    for col in ws.columns:
        max_length = max((len(str(cell.value)) for cell in col if cell.value), default=10)
        col_letter = col[0].column_letter
        ws.column_dimensions[col_letter].width = max_length + 3

    # Collapse all detail rows by default
    ws.sheet_properties.outlinePr.summaryBelow = False
    for row in range(2, row_num):
        if ws.row_dimensions[row].outlineLevel == 1:
            ws.row_dimensions[row].hidden = True

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=taskflow_report.xlsx"}
    )
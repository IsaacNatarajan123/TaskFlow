from fastapi import APIRouter
from pydantic import BaseModel
from bson import ObjectId
from database import get_collection

router = APIRouter(prefix="/departments", tags=["departments"])
departments_collection = get_collection("departments")

class DepartmentCreate(BaseModel):
    department_name: str
    status: str = "active"

@router.post("")
async def create_department(department: DepartmentCreate):
    existing = await departments_collection.find_one({"department_name": department.department_name})
    if existing:
        return {"error": "A department with this name already exists"}
    result = await departments_collection.insert_one({
        "department_name": department.department_name,
        "status": department.status
    })
    return {"message": "Department created", "id": str(result.inserted_id)}

@router.get("")
async def list_departments():
    cursor = departments_collection.find()
    departments = []
    async for d in cursor:
        d["_id"] = str(d["_id"])
        departments.append(d)
    return departments

@router.patch("/{department_id}")
async def update_department(department_id: str, department: DepartmentCreate):
    await departments_collection.update_one(
        {"_id": ObjectId(department_id)},
        {"$set": {"department_name": department.department_name, "status": department.status}}
    )
    return {"message": "Department updated"}

@router.patch("/{department_id}/deactivate")
async def deactivate_department(department_id: str):
    await departments_collection.update_one({"_id": ObjectId(department_id)}, {"$set": {"status": "inactive"}})
    return {"message": "Department deactivated"}

@router.delete("/{department_id}")
async def delete_department(department_id: str):
    from database import get_collection as gc
    tasks_collection = gc("tasks")
    in_use = await tasks_collection.count_documents({"department_id": department_id})
    if in_use > 0:
        return {"error": "Cannot delete a department with existing tasks. Mark it inactive instead."}
    await departments_collection.delete_one({"_id": ObjectId(department_id)})
    return {"message": "Department deleted"}
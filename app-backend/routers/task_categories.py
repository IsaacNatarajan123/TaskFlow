from fastapi import APIRouter
from pydantic import BaseModel
from bson import ObjectId
from database import get_collection

router = APIRouter(prefix="/task_categories", tags=["task_categories"])
categories_collection = get_collection("task_categories")

class CategoryCreate(BaseModel):
    category_name: str

@router.post("")
async def create_category(category: CategoryCreate):
    existing = await categories_collection.find_one({"category_name": category.category_name})
    if existing:
        return {"error": "A category with this name already exists"}
    result = await categories_collection.insert_one({"category_name": category.category_name})
    return {"message": "Category created", "id": str(result.inserted_id)}

@router.get("")
async def list_categories():
    cursor = categories_collection.find()
    categories = []
    async for c in cursor:
        c["_id"] = str(c["_id"])
        categories.append(c)
    return categories

@router.patch("/{category_id}")
async def update_category(category_id: str, category: CategoryCreate):
    await categories_collection.update_one({"_id": ObjectId(category_id)}, {"$set": {"category_name": category.category_name}})
    return {"message": "Category updated"}

@router.delete("/{category_id}")
async def delete_category(category_id: str):
    from database import get_collection as gc
    tasks_collection = gc("tasks")
    in_use = await tasks_collection.count_documents({"category_id": category_id})
    if in_use > 0:
        return {"error": "Cannot delete a category with existing tasks."}
    await categories_collection.delete_one({"_id": ObjectId(category_id)})
    return {"message": "Category deleted"}
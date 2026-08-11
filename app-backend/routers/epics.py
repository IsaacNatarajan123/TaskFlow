from fastapi import APIRouter, Depends
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timezone
from database import get_collection
from auth import get_current_user

router = APIRouter(prefix="/epics", tags=["epics"])
epics_collection = get_collection("epics")
stories_collection = get_collection("stories")

class EpicCreate(BaseModel):
    title: str
    description: str = ""

@router.post("")
async def create_epic(epic: EpicCreate, current_user: str = Depends(get_current_user)):
    new_epic = {
        "title": epic.title,
        "description": epic.description,
        "created_by": current_user,
        "created_at": datetime.now(timezone.utc),
    }
    result = await epics_collection.insert_one(new_epic)
    return {"message": "Epic created", "id": str(result.inserted_id)}

@router.get("")
async def list_epics(current_user: str = Depends(get_current_user)):
    cursor = epics_collection.find()
    epics = []
    async for e in cursor:
        e["_id"] = str(e["_id"])
        story_count = await stories_collection.count_documents({"epic_id": e["_id"]})
        e["story_count"] = story_count
        epics.append(e)
    return epics

@router.get("/{epic_id}")
async def get_epic(epic_id: str, current_user: str = Depends(get_current_user)):
    epic = await epics_collection.find_one({"_id": ObjectId(epic_id)})
    if not epic:
        return {"error": "Epic not found"}
    epic["_id"] = str(epic["_id"])
    return epic

class StoryCreate(BaseModel):
    title: str
    description: str = ""

@router.post("/{epic_id}/stories")
async def create_story(epic_id: str, story: StoryCreate, current_user: str = Depends(get_current_user)):
    epic = await epics_collection.find_one({"_id": ObjectId(epic_id)})
    if not epic:
        return {"error": "Epic not found"}
    if epic["created_by"] != current_user:
        return {"error": "Only the Epic's creator can add Stories to it"}

    new_story = {
        "title": story.title,
        "description": story.description,
        "epic_id": epic_id,
        "created_by": current_user,
        "created_at": datetime.now(timezone.utc),
    }
    result = await stories_collection.insert_one(new_story)
    return {"message": "Story created", "id": str(result.inserted_id)}

@router.get("/{epic_id}/stories")
async def list_stories(epic_id: str, current_user: str = Depends(get_current_user)):
    cursor = stories_collection.find({"epic_id": epic_id})
    stories = []
    async for s in cursor:
        s["_id"] = str(s["_id"])
        stories.append(s)
    return stories

@router.get("/stories/all")
async def list_all_stories(current_user: str = Depends(get_current_user)):
    cursor = stories_collection.find()
    stories = []
    async for s in cursor:
        s["_id"] = str(s["_id"])
        epic = await epics_collection.find_one({"_id": ObjectId(s["epic_id"])})
        s["epic_title"] = epic["title"] if epic else "Unknown"
        stories.append(s)
    return stories

@router.delete("/{epic_id}")
async def delete_epic(epic_id: str, current_user: str = Depends(get_current_user)):
    epic = await epics_collection.find_one({"_id": ObjectId(epic_id)})
    if not epic:
        return {"error": "Epic not found"}
    if epic["created_by"] != current_user:
        return {"error": "Only the Epic's creator can delete it"}
    story_count = await stories_collection.count_documents({"epic_id": epic_id})
    if story_count > 0:
        return {"error": "Cannot delete an Epic that still has Stories under it"}
    await epics_collection.delete_one({"_id": ObjectId(epic_id)})
    return {"message": "Epic deleted"}

@router.delete("/{epic_id}/stories/{story_id}")
async def delete_story(epic_id: str, story_id: str, current_user: str = Depends(get_current_user)):
    epic = await epics_collection.find_one({"_id": ObjectId(epic_id)})
    if not epic or epic["created_by"] != current_user:
        return {"error": "Only the Epic's creator can delete its Stories"}
    task_count = await get_collection("tasks").count_documents({"story_id": story_id})
    if task_count > 0:
        return {"error": "Cannot delete a Story that still has tasks linked to it"}
    await stories_collection.delete_one({"_id": ObjectId(story_id)})
    return {"message": "Story deleted"}
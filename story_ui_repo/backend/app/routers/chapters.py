from fastapi import APIRouter, HTTPException
from typing import List
from ..models import Chapter, ChapterCreate, ChapterUpdate
from ..services.db_service import db_service
import uuid

router = APIRouter(tags=["Chapters"])

@router.get("/api/stories/{story_id}/chapters", response_model=List[Chapter])
def get_story_chapters(story_id: str):
    return db_service.get_chapters(story_id)

@router.post("/api/stories/{story_id}/chapters", response_model=Chapter)
def create_chapter(story_id: str, data: ChapterCreate):
    data_dict = data.dict()
    data_dict["story_id"] = story_id
    data_dict["id"] = f"chap_{uuid.uuid4().hex[:10]}"
    return db_service.save_chapter(data_dict)

@router.get("/api/chapters/{chapter_id}", response_model=Chapter)
def get_chapter(chapter_id: str):
    chap = db_service.get_chapter(chapter_id)
    if not chap:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return chap

@router.put("/api/chapters/{chapter_id}", response_model=Chapter)
def update_chapter(chapter_id: str, data: ChapterUpdate):
    existing = db_service.get_chapter(chapter_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Chapter not found")
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    existing.update(update_data)
    return db_service.save_chapter(existing)

@router.delete("/api/chapters/{chapter_id}")
def delete_chapter(chapter_id: str):
    success = db_service.delete_chapter(chapter_id)
    return {"success": success, "deleted_id": chapter_id}

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..models import Story, StoryCreate, StoryUpdate
from ..services.db_service import db_service
from ..services.ai_service import ai_service
import uuid

router = APIRouter(prefix="/api/stories", tags=["Stories"])

@router.get("", response_model=List[Story])
def get_all_stories():
    return db_service.get_stories()

@router.post("", response_model=Story)
def create_story(data: StoryCreate):
    story_dict = data.dict()
    story_dict["id"] = f"story_{uuid.uuid4().hex[:10]}"
    return db_service.save_story(story_dict)

@router.get("/{story_id}", response_model=Story)
def get_story_by_id(story_id: str):
    story = db_service.get_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story dossier not found")
    return story

@router.put("/{story_id}", response_model=Story)
def update_story_by_id(story_id: str, data: StoryUpdate):
    existing = db_service.get_story(story_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Story dossier not found")
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    existing.update(update_data)
    return db_service.save_story(existing)

@router.delete("/{story_id}")
def delete_story_by_id(story_id: str):
    success = db_service.delete_story(story_id)
    return {"success": success, "deleted_id": story_id}

@router.post("/outline/preview")
def generate_outline_preview(params: Dict[str, Any]):
    outline = ai_service.generate_outline(params)
    return {"outline": outline}

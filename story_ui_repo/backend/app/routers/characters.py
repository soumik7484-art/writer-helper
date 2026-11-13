from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..models import Character, CharacterCreate, CharacterUpdate
from ..services.db_service import db_service
from ..services.ai_service import ai_service
import uuid

router = APIRouter(tags=["Characters"])

@router.get("/api/stories/{story_id}/characters", response_model=List[Character])
def get_story_characters(story_id: str):
    return db_service.get_characters(story_id)

@router.post("/api/stories/{story_id}/characters", response_model=Character)
def create_character(story_id: str, data: CharacterCreate):
    data_dict = data.dict()
    data_dict["story_id"] = story_id
    data_dict["id"] = f"char_{uuid.uuid4().hex[:10]}"
    return db_service.save_character(data_dict)

@router.get("/api/characters/{character_id}", response_model=Character)
def get_character(character_id: str):
    char = db_service.get_character(character_id)
    if not char:
        raise HTTPException(status_code=404, detail="Character dossier not found")
    return char

@router.put("/api/characters/{character_id}", response_model=Character)
def update_character(character_id: str, data: CharacterUpdate):
    existing = db_service.get_character(character_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Character dossier not found")
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    existing.update(update_data)
    return db_service.save_character(existing)

@router.delete("/api/characters/{character_id}")
def delete_character(character_id: str):
    success = db_service.delete_character(character_id)
    return {"success": success, "deleted_id": character_id}

@router.post("/api/characters/generate")
def generate_ai_character(params: Dict[str, Any]):
    genre = params.get("genre", "Mystery")
    role = params.get("role", "Protagonist")
    theme = params.get("theme", "")
    profile = ai_service.generate_character(genre, role, theme)
    return {"character": profile}

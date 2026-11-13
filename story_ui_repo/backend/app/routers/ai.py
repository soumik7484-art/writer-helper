from fastapi import APIRouter
from typing import Dict, Any
from ..services.ai_service import ai_service
from ..services.vector_service import vector_service
from ..services.db_service import db_service

router = APIRouter(prefix="/api/ai", tags=["AI Co-writer"])

@router.post("/cowriter")
def cowriter_assistance(payload: Dict[str, Any]):
    story_id = payload.get("story_id", "")
    action = payload.get("action", "continue")
    content = payload.get("content", "")
    chapter_title = payload.get("chapter_title", "Active Scene")
    character_notes = payload.get("character_notes", "")
    instruction = payload.get("instruction", "")
    
    all_mems = db_service.get_memories(story_id) if story_id else []
    relevant_memories = vector_service.search_memories(content[-400:], all_mems, top_k=4) if all_mems else []
    
    res = ai_service.assist_writing(
        action=action,
        current_content=content,
        chapter_title=chapter_title,
        relevant_memories=relevant_memories,
        character_notes=character_notes,
        instruction=instruction
    )
    res["injected_memories_count"] = len(relevant_memories)
    res["injected_memories"] = relevant_memories
    return res

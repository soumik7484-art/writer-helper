from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from ..models import Memory, MemoryCreate, MemoryUpdate
from ..services.db_service import db_service
from ..services.vector_service import vector_service
import uuid

router = APIRouter(tags=["Universe Memory"])

@router.get("/api/stories/{story_id}/memories", response_model=List[Memory])
def get_story_memories(story_id: str, category: Optional[str] = Query(None)):
    return db_service.get_memories(story_id, category)

@router.post("/api/stories/{story_id}/memories", response_model=Memory)
def create_memory(story_id: str, data: MemoryCreate):
    data_dict = data.dict()
    data_dict["story_id"] = story_id
    data_dict["id"] = f"mem_{uuid.uuid4().hex[:10]}"
    return db_service.save_memory(data_dict)

@router.put("/api/memories/{memory_id}", response_model=Memory)
def update_memory(memory_id: str, data: MemoryUpdate):
    for s in db_service.get_stories():
        mems = db_service.get_memories(s["id"])
        match = [m for m in mems if m["id"] == memory_id]
        if match:
            existing = match[0]
            update_data = {k: v for k, v in data.dict().items() if v is not None}
            existing.update(update_data)
            return db_service.save_memory(existing)
    raise HTTPException(status_code=404, detail="Memory fragment not found")

@router.delete("/api/memories/{memory_id}")
def delete_memory(memory_id: str):
    success = db_service.delete_memory(memory_id)
    return {"success": success, "deleted_id": memory_id}

@router.post("/api/stories/{story_id}/memories/search")
def search_memories(story_id: str, payload: Dict[str, Any]):
    query = payload.get("query", "")
    top_k = int(payload.get("top_k", 6))
    all_mems = db_service.get_memories(story_id)
    results = vector_service.search_memories(query, all_mems, top_k)
    return {"query": query, "results": results, "count": len(results)}

@router.get("/api/memory/pipeline")
def get_pipeline_details():
    return vector_service.get_pipeline_explanation()

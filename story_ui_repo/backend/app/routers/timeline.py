from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..models import TimelineEvent, TimelineEventCreate, TimelineEventUpdate
from ..services.db_service import db_service
from ..services.ai_service import ai_service
import uuid

router = APIRouter(tags=["Timeline"])

@router.get("/api/stories/{story_id}/timeline", response_model=List[TimelineEvent])
def get_story_timeline(story_id: str):
    return db_service.get_events(story_id)

@router.post("/api/stories/{story_id}/timeline", response_model=TimelineEvent)
def create_timeline_event(story_id: str, data: TimelineEventCreate):
    data_dict = data.dict()
    data_dict["story_id"] = story_id
    data_dict["id"] = f"evt_{uuid.uuid4().hex[:10]}"
    return db_service.save_event(data_dict)

@router.put("/api/timeline/{event_id}", response_model=TimelineEvent)
def update_timeline_event(event_id: str, data: TimelineEventUpdate):
    for s in db_service.get_stories():
        evts = db_service.get_events(s["id"])
        match = [e for e in evts if e["id"] == event_id]
        if match:
            existing = match[0]
            update_data = {k: v for k, v in data.dict().items() if v is not None}
            existing.update(update_data)
            return db_service.save_event(existing)
    raise HTTPException(status_code=404, detail="Timeline event not found")

@router.delete("/api/timeline/{event_id}")
def delete_timeline_event(event_id: str):
    success = db_service.delete_event(event_id)
    return {"success": success, "deleted_id": event_id}

@router.post("/api/stories/{story_id}/timeline/extract")
def extract_events_from_chapter(story_id: str, payload: Dict[str, Any]):
    chapter_id = payload.get("chapter_id")
    chapter = db_service.get_chapter(chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    extracted = ai_service.extract_timeline_events(
        chapter.get("content", ""),
        chapter.get("chapter_number", 1),
        story_id
    )
    
    saved_events = []
    current_count = len(db_service.get_events(story_id))
    for idx, e in enumerate(extracted):
        event_dict = {
            "id": f"evt_{uuid.uuid4().hex[:10]}",
            "story_id": story_id,
            "event_number": current_count + idx + 1,
            "title": e.get("title", f"Event in Chapter {chapter.get('chapter_number')}"),
            "description": e.get("description", ""),
            "illustration_url": "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=600&auto=format&fit=crop",
            "characters_involved": e.get("characters_involved", []),
            "location": e.get("location", "Unknown Location"),
            "chapter_id": chapter_id,
            "chapter_number": chapter.get("chapter_number", 1),
            "chronological_position": float(chapter.get("chapter_number", 1)) + (idx * 0.2),
            "status": "Current",
            "consequences": e.get("consequences", []),
            "category": e.get("category", "plot_turn")
        }
        db_service.save_event(event_dict)
        saved_events.append(event_dict)

    return {"extracted_count": len(saved_events), "events": saved_events}

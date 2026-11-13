from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..models import PlotHole, PlotHoleCreate, PlotHoleUpdate
from ..services.db_service import db_service
from ..services.ai_service import ai_service
import uuid

router = APIRouter(tags=["Plot Holes"])

@router.get("/api/stories/{story_id}/plotholes", response_model=List[PlotHole])
def get_story_plotholes(story_id: str):
    return db_service.get_plotholes(story_id)

@router.post("/api/stories/{story_id}/plotholes", response_model=PlotHole)
def create_plothole(story_id: str, data: PlotHoleCreate):
    data_dict = data.dict()
    data_dict["story_id"] = story_id
    data_dict["id"] = f"issue_{uuid.uuid4().hex[:10]}"
    return db_service.save_plothole(data_dict)

@router.put("/api/plotholes/{issue_id}", response_model=PlotHole)
def update_plothole(issue_id: str, data: PlotHoleUpdate):
    for s in db_service.get_stories():
        issues = db_service.get_plotholes(s["id"])
        match = [i for i in issues if i["id"] == issue_id]
        if match:
            existing = match[0]
            update_data = {k: v for k, v in data.dict().items() if v is not None}
            existing.update(update_data)
            return db_service.save_plothole(existing)
    raise HTTPException(status_code=404, detail="Consistency case file not found")

@router.delete("/api/plotholes/{issue_id}")
def delete_plothole(issue_id: str):
    success = db_service.delete_plothole(issue_id)
    return {"success": success, "deleted_id": issue_id}

@router.post("/api/stories/{story_id}/plotholes/audit")
def run_consistency_audit(story_id: str):
    chapters = db_service.get_chapters(story_id)
    memories = db_service.get_memories(story_id)
    detected = ai_service.audit_plot_holes(chapters, memories)
    
    saved_issues = []
    for d in detected:
        issue_dict = {
            "id": f"issue_{uuid.uuid4().hex[:10]}",
            "story_id": story_id,
            "title": d.get("title", "Narrative Continuity Flag"),
            "category": d.get("category", "timeline_contradiction"),
            "severity": d.get("severity", "Warning"),
            "description": d.get("description", ""),
            "previous_conflicting_info": d.get("previous_conflicting_info", ""),
            "current_conflicting_info": d.get("current_conflicting_info", ""),
            "source_chapters": d.get("source_chapters", []),
            "suggested_correction": d.get("suggested_correction", ""),
            "status": "open"
        }
        db_service.save_plothole(issue_dict)
        saved_issues.append(issue_dict)
        
    return {"audit_results": saved_issues, "total_detected": len(saved_issues)}

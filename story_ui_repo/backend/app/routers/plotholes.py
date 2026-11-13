from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from ..models import PlotHole, PlotHoleCreate, PlotHoleUpdate, InvestigationBoardState
from ..services.db_service import db_service
from ..services.ai_service import ai_service
import uuid

router = APIRouter(tags=["Plot Holes & Investigation Board"])

@router.get("/api/stories/{story_id}/plotholes", response_model=List[PlotHole])
def get_story_plotholes(story_id: str):
    return db_service.get_plotholes(story_id)

@router.post("/api/stories/{story_id}/plotholes", response_model=PlotHole)
def create_plothole(story_id: str, data: PlotHoleCreate):
    data_dict = data.dict()
    data_dict["story_id"] = story_id
    if not data_dict.get("id"):
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
    characters = db_service.get_characters(story_id)
    events = db_service.get_events(story_id)
    detected = ai_service.audit_plot_holes(chapters, memories, characters, events)
    
    saved_issues = []
    for d in detected:
        issue_id = d.get("id") or f"issue_{uuid.uuid4().hex[:10]}"
        issue_dict = {
            "id": issue_id,
            "story_id": story_id,
            "title": d.get("title", "Narrative Continuity Flag"),
            "category": d.get("category", "timeline_contradiction"),
            "severity": d.get("severity", "Warning"),
            "description": d.get("description", ""),
            "previous_conflicting_info": d.get("previous_conflicting_info", ""),
            "current_conflicting_info": d.get("current_conflicting_info", ""),
            "source_chapters": d.get("source_chapters", []),
            "suggested_correction": d.get("suggested_correction", ""),
            "continuity_impact": d.get("continuity_impact", ""),
            "related_elements": d.get("related_elements", []),
            "related_element_ids": d.get("related_element_ids", []),
            "status": d.get("status", "open")
        }
        db_service.save_plothole(issue_dict)
        saved_issues.append(issue_dict)
    
    # Also update the board state to highlight affected cards and draw red contradiction strings
    board = db_service.get_investigation_board(story_id)
    if board and "elements" in board:
        elements = board["elements"]
        connections = board.get("connections", [])
        
        # Link issues to matching cards by title / name
        for issue in saved_issues:
            related = [r.lower() for r in issue.get("related_elements", [])]
            matched_cards = []
            for card in elements:
                if any(r in card.get("title", "").lower() for r in related):
                    card["has_issue"] = True
                    card_issue_ids = card.get("issue_ids", [])
                    if issue["id"] not in card_issue_ids:
                        card_issue_ids.append(issue["id"])
                    card["issue_ids"] = card_issue_ids
                    matched_cards.append(card["id"])
            
            # If at least 2 cards matched, ensure a contradiction red string connects them
            if len(matched_cards) >= 2:
                src = matched_cards[0]
                tgt = matched_cards[1]
                exists = any(
                    (c.get("source_id") == src and c.get("target_id") == tgt) or
                    (c.get("source_id") == tgt and c.get("target_id") == src)
                    for c in connections
                )
                if not exists:
                    connections.append({
                        "id": f"conn_contradiction_{issue['id']}",
                        "source_id": src,
                        "target_id": tgt,
                        "label": f"CONTRADICTION: {issue['title'][:25]}",
                        "type": "contradiction",
                        "is_contradiction": True,
                        "issue_id": issue["id"],
                        "notes": issue["description"]
                    })
        
        board["elements"] = elements
        board["connections"] = connections
        db_service.save_investigation_board(story_id, board)
        
    return {"audit_results": saved_issues, "total_detected": len(saved_issues)}

# =========================================================================
# INVESTIGATION BOARD ENDPOINTS
# =========================================================================

@router.get("/api/stories/{story_id}/investigation-board")
def get_investigation_board(story_id: str):
    board = db_service.get_investigation_board(story_id)
    if not board or not board.get("elements"):
        # Auto-seed initial investigation board using story assets
        story = db_service.get_story(story_id) or {"id": story_id, "title": "Case Archive"}
        chapters = db_service.get_chapters(story_id)
        characters = db_service.get_characters(story_id)
        events = db_service.get_events(story_id)
        memories = db_service.get_memories(story_id)
        culprit = db_service.get_culprit(story_id)
        
        generated = ai_service.generate_investigation_board(story, chapters, characters, events, memories)
        if culprit and culprit.get("culprit_id"):
            generated["culprit_id"] = culprit.get("culprit_id")
        board = db_service.save_investigation_board(story_id, generated)
    return board

@router.put("/api/stories/{story_id}/investigation-board")
def update_investigation_board(story_id: str, board_data: Dict[str, Any]):
    # Sync culprit designation if provided
    if "culprit_id" in board_data:
        db_service.save_culprit(story_id, {"culprit_id": board_data.get("culprit_id")})
    return db_service.save_investigation_board(story_id, board_data)

@router.post("/api/stories/{story_id}/investigation-board/generate")
def generate_investigation_board_endpoint(story_id: str, options: Optional[Dict[str, Any]] = None):
    story = db_service.get_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story dossier not found")
    chapters = db_service.get_chapters(story_id)
    characters = db_service.get_characters(story_id)
    events = db_service.get_events(story_id)
    memories = db_service.get_memories(story_id)
    
    # Retain manual culprit if set
    existing_board = db_service.get_investigation_board(story_id) or {}
    existing_culprit = existing_board.get("culprit_id")
    
    generated = ai_service.generate_investigation_board(story, chapters, characters, events, memories)
    if existing_culprit:
        generated["culprit_id"] = existing_culprit
        for el in generated.get("elements", []):
            if el.get("id") == existing_culprit or el.get("metadata", {}).get("character_id") == existing_culprit:
                el["is_culprit"] = True
                
    saved = db_service.save_investigation_board(story_id, generated)
    return saved

@router.post("/api/stories/{story_id}/investigation-board/incremental")
def incremental_analysis_endpoint(story_id: str, payload: Optional[Dict[str, Any]] = None):
    payload = payload or {}
    story = db_service.get_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
        
    chapter_id = payload.get("chapter_id")
    chapters = db_service.get_chapters(story_id)
    target_chapter = None
    if chapter_id:
        target_chapter = next((c for c in chapters if c.get("id") == chapter_id), None)
    if not target_chapter and chapters:
        target_chapter = chapters[-1]
    if not target_chapter:
        target_chapter = {
            "chapter_number": 1,
            "title": "Initial Scene",
            "content": story.get("description", "")
        }

    existing_board = db_service.get_investigation_board(story_id)
    if not existing_board:
        existing_board = ai_service.generate_investigation_board(story, chapters, db_service.get_characters(story_id), db_service.get_events(story_id), db_service.get_memories(story_id))

    memories = db_service.get_memories(story_id)
    result = ai_service.incremental_chapter_analysis(story, target_chapter, existing_board, memories)
    db_service.save_investigation_board(story_id, result["board"])
    return result

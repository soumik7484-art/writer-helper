from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List, Dict, Any, Optional
from datetime import datetime
import os
import time
import uuid
from ..models import Story, StoryCreate, StoryUpdate
from ..services.db_service import db_service
from ..services.ai_service import ai_service
from ..config import UPLOADS_DIR

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_MIMETYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

def _validate_image_file(file: UploadFile):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension '{ext}'. Supported formats: JPG, JPEG, PNG, WEBP."
        )
    if file.content_type and file.content_type.lower() not in ALLOWED_IMAGE_MIMETYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format '{file.content_type}'. Must be JPG, JPEG, PNG, or WEBP."
        )

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

@router.post("/upload-cover")
def upload_standalone_cover(file: UploadFile = File(...)):
    _validate_image_file(file)
    ext = os.path.splitext(file.filename or "")[1].lower()
    unique_name = f"cover_draft_{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = UPLOADS_DIR / unique_name

    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Image file exceeds maximum 10MB limit.")

    with open(dest_path, "wb") as f:
        f.write(contents)

    cover_url = f"/api/uploads/{unique_name}"
    return {"cover_url": cover_url, "filename": unique_name}

@router.post("/{story_id}/cover")
def upload_story_cover(story_id: str, file: UploadFile = File(...)):
    story = db_service.get_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story dossier not found")

    _validate_image_file(file)
    ext = os.path.splitext(file.filename or "")[1].lower()
    unique_name = f"cover_{story_id}_{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = UPLOADS_DIR / unique_name

    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Image file exceeds maximum 10MB limit.")

    # Remove old local file if replacing
    old_cover = story.get("cover_url", "")
    if old_cover and old_cover.startswith("/api/uploads/"):
        old_filename = old_cover.replace("/api/uploads/", "")
        old_file_path = UPLOADS_DIR / old_filename
        if old_file_path.exists():
            try:
                old_file_path.unlink()
            except Exception:
                pass

    with open(dest_path, "wb") as f:
        f.write(contents)

    story["cover_url"] = f"/api/uploads/{unique_name}"
    story["updated_at"] = datetime.utcnow().isoformat()
    updated = db_service.save_story(story)

    return {"cover_url": story["cover_url"], "story": updated}

@router.delete("/{story_id}/cover")
def remove_story_cover(story_id: str):
    story = db_service.get_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story dossier not found")

    old_cover = story.get("cover_url", "")
    if old_cover and old_cover.startswith("/api/uploads/"):
        old_filename = old_cover.replace("/api/uploads/", "")
        old_file_path = UPLOADS_DIR / old_filename
        if old_file_path.exists():
            try:
                old_file_path.unlink()
            except Exception:
                pass

    story["cover_url"] = ""
    story["updated_at"] = datetime.utcnow().isoformat()
    updated = db_service.save_story(story)

    return {"cover_url": "", "story": updated}

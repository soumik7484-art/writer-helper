from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

class ChapterCreate(BaseModel):
    story_id: Optional[str] = ""
    chapter_number: int
    title: str
    content: Optional[str] = ""
    summary: Optional[str] = ""
    status: Optional[str] = "draft"  # draft, in_review, completed

class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    status: Optional[str] = None
    chapter_number: Optional[int] = None

class Chapter(BaseModel):
    id: str = Field(default_factory=lambda: f"chap_{uuid.uuid4().hex[:10]}")
    story_id: str
    chapter_number: int
    title: str
    content: str = ""
    summary: str = ""
    word_count: int = 0
    status: str = "draft"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

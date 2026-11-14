from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

class Page(BaseModel):
    id: str = Field(default_factory=lambda: f"page_{uuid.uuid4().hex[:10]}")
    chapter_id: str
    page_number: int
    content: str = ""
    word_count: int = 0
    save_status: Optional[str] = "saved"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class PageCreate(BaseModel):
    page_number: Optional[int] = None
    content: Optional[str] = ""

class PageUpdate(BaseModel):
    content: Optional[str] = None
    page_number: Optional[int] = None
    save_status: Optional[str] = None

class ChapterCreate(BaseModel):
    story_id: Optional[str] = ""
    chapter_number: int
    title: str
    content: Optional[str] = ""
    summary: Optional[str] = ""
    status: Optional[str] = "draft"  # draft, in_review, completed
    pages: Optional[List[Page]] = None

class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    status: Optional[str] = None
    chapter_number: Optional[int] = None
    pages: Optional[List[Page]] = None

class Chapter(BaseModel):
    id: str = Field(default_factory=lambda: f"chap_{uuid.uuid4().hex[:10]}")
    story_id: str
    chapter_number: int
    title: str
    content: str = ""
    summary: str = ""
    word_count: int = 0
    status: str = "draft"
    pages: Optional[List[Page]] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

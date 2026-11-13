from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

class MemoryCreate(BaseModel):
    story_id: Optional[str] = ""
    title: str
    description: str
    category: str = "world_rules"
    source_chapter: Optional[str] = "Chapter 1"
    related_character: Optional[str] = None
    related_location: Optional[str] = None
    importance: Optional[str] = "High"

class MemoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    source_chapter: Optional[str] = None
    related_character: Optional[str] = None
    related_location: Optional[str] = None
    importance: Optional[str] = None

class Memory(BaseModel):
    id: str = Field(default_factory=lambda: f"mem_{uuid.uuid4().hex[:10]}")
    story_id: str
    title: str
    description: str
    category: str = "world_rules"
    source_chapter: str = "Chapter 1"
    related_character: Optional[str] = None
    related_location: Optional[str] = None
    importance: str = "High"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

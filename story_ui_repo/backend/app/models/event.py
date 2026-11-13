from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

class TimelineEventCreate(BaseModel):
    story_id: Optional[str] = ""
    event_number: int
    title: str
    description: str
    illustration_url: Optional[str] = None
    characters_involved: Optional[List[str]] = []
    location: Optional[str] = ""
    chapter_id: Optional[str] = None
    chapter_number: Optional[int] = 1
    chronological_position: Optional[float] = 1.0
    status: Optional[str] = "Completed"
    consequences: Optional[List[str]] = []
    category: Optional[str] = "plot_turn"

class TimelineEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    illustration_url: Optional[str] = None
    characters_involved: Optional[List[str]] = None
    location: Optional[str] = None
    chapter_id: Optional[str] = None
    chapter_number: Optional[int] = None
    chronological_position: Optional[float] = None
    status: Optional[str] = None
    consequences: Optional[List[str]] = None
    category: Optional[str] = None
    event_number: Optional[int] = None

class TimelineEvent(BaseModel):
    id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:10]}")
    story_id: str
    event_number: int
    title: str
    description: str
    illustration_url: Optional[str] = None
    characters_involved: List[str] = []
    location: str = ""
    chapter_id: Optional[str] = None
    chapter_number: int = 1
    chronological_position: float = 1.0
    status: str = "Completed"
    consequences: List[str] = []
    category: str = "plot_turn"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

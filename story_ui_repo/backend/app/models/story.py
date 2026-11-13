from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class StoryCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    genre: str = "Mystery"
    subgenre: Optional[str] = ""
    theme: Optional[str] = ""
    mood: Optional[str] = "Suspenseful"
    setting: Optional[str] = ""
    time_period: Optional[str] = ""
    character_count: Optional[int] = 4
    writing_style: Optional[str] = "Cinematic & Atmospheric"
    chapter_count: Optional[int] = 8
    ending_type: Optional[str] = "Twist"
    plot_outline: Optional[List[Dict[str, Any]]] = []
    cover_url: Optional[str] = None

class StoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    genre: Optional[str] = None
    subgenre: Optional[str] = None
    theme: Optional[str] = None
    mood: Optional[str] = None
    setting: Optional[str] = None
    time_period: Optional[str] = None
    character_count: Optional[int] = None
    writing_style: Optional[str] = None
    chapter_count: Optional[int] = None
    ending_type: Optional[str] = None
    plot_outline: Optional[List[Dict[str, Any]]] = None
    cover_url: Optional[str] = None

class Story(BaseModel):
    id: str = Field(default_factory=lambda: f"story_{uuid.uuid4().hex[:10]}")
    title: str
    description: str = ""
    genre: str = "Mystery"
    subgenre: str = ""
    theme: str = ""
    mood: str = "Suspenseful"
    setting: str = ""
    time_period: str = ""
    character_count: int = 4
    writing_style: str = "Cinematic & Atmospheric"
    chapter_count: int = 8
    ending_type: str = "Twist"
    plot_outline: List[Dict[str, Any]] = []
    cover_url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

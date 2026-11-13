from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

class PlotHoleCreate(BaseModel):
    story_id: Optional[str] = ""
    title: str
    category: str = "character_inconsistency"
    severity: str = "Warning"
    description: str
    previous_conflicting_info: Optional[str] = ""
    current_conflicting_info: Optional[str] = ""
    source_chapters: Optional[List[str]] = []
    suggested_correction: Optional[str] = ""
    status: Optional[str] = "open"

class PlotHoleUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    previous_conflicting_info: Optional[str] = None
    current_conflicting_info: Optional[str] = None
    source_chapters: Optional[List[str]] = None
    suggested_correction: Optional[str] = None
    status: Optional[str] = None

class PlotHole(BaseModel):
    id: str = Field(default_factory=lambda: f"issue_{uuid.uuid4().hex[:10]}")
    story_id: str
    title: str
    category: str = "character_inconsistency"
    severity: str = "Warning"
    description: str
    previous_conflicting_info: str = ""
    current_conflicting_info: str = ""
    source_chapters: List[str] = []
    suggested_correction: str = ""
    status: str = "open"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

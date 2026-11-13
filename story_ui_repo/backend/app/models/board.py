from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

class BoardPosition(BaseModel):
    x: float
    y: float

class BoardSize(BaseModel):
    width: Optional[float] = None
    height: Optional[float] = None

class InvestigationCard(BaseModel):
    id: str = Field(default_factory=lambda: f"card_{uuid.uuid4().hex[:10]}")
    story_id: str
    type: str = "character"  # character, location, event, evidence, clue, note
    title: str
    subtitle: Optional[str] = ""
    description: Optional[str] = ""
    image_url: Optional[str] = ""
    status: Optional[str] = "unverified"  # verified, unverified, suspect, missing, alive, deceased, open
    is_culprit: Optional[bool] = False
    is_pinned: Optional[bool] = False
    color: Optional[str] = "manila"  # manila, yellow, red, green, blue, polaroid, aged
    position: BoardPosition = Field(default_factory=lambda: BoardPosition(x=100.0, y=100.0))
    size: Optional[BoardSize] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    has_issue: Optional[bool] = False
    issue_ids: Optional[List[str]] = Field(default_factory=list)
    created_at: Optional[str] = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: Optional[str] = Field(default_factory=lambda: datetime.utcnow().isoformat())

class InvestigationConnection(BaseModel):
    id: str = Field(default_factory=lambda: f"conn_{uuid.uuid4().hex[:10]}")
    source_id: str
    target_id: str
    label: Optional[str] = ""
    type: Optional[str] = "relation"  # suspect, contradiction, timeline, location, evidence, relation, custom
    notes: Optional[str] = ""
    is_contradiction: Optional[bool] = False
    issue_id: Optional[str] = None
    created_at: Optional[str] = Field(default_factory=lambda: datetime.utcnow().isoformat())

class InvestigationBoardState(BaseModel):
    story_id: str
    elements: List[InvestigationCard] = Field(default_factory=list)
    connections: List[InvestigationConnection] = Field(default_factory=list)
    culprit_id: Optional[str] = None
    zoom: Optional[float] = 1.0
    pan_offset: Optional[Dict[str, float]] = Field(default_factory=lambda: {"x": 0.0, "y": 0.0})
    updated_at: Optional[str] = Field(default_factory=lambda: datetime.utcnow().isoformat())

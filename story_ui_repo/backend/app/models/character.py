from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class CharacterCreate(BaseModel):
    story_id: Optional[str] = ""
    name: str
    alias: Optional[str] = ""
    age: Optional[str] = ""
    role: Optional[str] = "Protagonist"
    personality_traits: Optional[List[str]] = []
    backstory: Optional[str] = ""
    physical_description: Optional[str] = ""
    relationships: Optional[List[Dict[str, Any]]] = []
    motivations: Optional[str] = ""
    goals: Optional[str] = ""
    fears: Optional[str] = ""
    secrets: Optional[str] = ""
    current_status: Optional[str] = "Alive"
    first_appearance: Optional[str] = "Chapter 1"
    last_appearance: Optional[str] = "Chapter 1"
    portrait_url: Optional[str] = None

class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    alias: Optional[str] = None
    age: Optional[str] = None
    role: Optional[str] = None
    personality_traits: Optional[List[str]] = None
    backstory: Optional[str] = None
    physical_description: Optional[str] = None
    relationships: Optional[List[Dict[str, Any]]] = None
    motivations: Optional[str] = None
    goals: Optional[str] = None
    fears: Optional[str] = None
    secrets: Optional[str] = None
    current_status: Optional[str] = None
    first_appearance: Optional[str] = None
    last_appearance: Optional[str] = None
    portrait_url: Optional[str] = None

class Character(BaseModel):
    id: str = Field(default_factory=lambda: f"char_{uuid.uuid4().hex[:10]}")
    story_id: str
    name: str
    alias: str = ""
    age: str = ""
    role: str = "Protagonist"
    personality_traits: List[str] = []
    backstory: str = ""
    physical_description: str = ""
    relationships: List[Dict[str, Any]] = []
    motivations: str = ""
    goals: str = ""
    fears: str = ""
    secrets: str = ""
    current_status: str = "Alive"
    first_appearance: str = "Chapter 1"
    last_appearance: str = "Chapter 1"
    portrait_url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid


class StoryboardPanel(BaseModel):
    """A single panel in the manga-style storyboard"""
    id: str = Field(default_factory=lambda: f"panel_{uuid.uuid4().hex[:10]}")
    chapter_id: str
    chapter_number: int
    chapter_title: str
    panel_number: int
    scene_title: str
    visual_description: str
    characters: List[str] = []
    location: str = "Unknown location"
    dialogue_excerpt: str = ""
    emotional_tone: str = "Neutral"
    action_summary: str = ""
    illustration_url: Optional[str] = None
    illustration_prompt: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class StoryboardGenerate(BaseModel):
    """Request to generate storyboard for a chapter or story"""
    story_id: str
    chapter_id: Optional[str] = None  # If None, generate for all chapters
    panels_per_chapter: int = 6
    regenerate: bool = False  # Force regeneration even if panels exist


class StoryStoryboard(BaseModel):
    """Complete storyboard for a story"""
    story_id: str
    total_panels: int
    total_chapters: int
    panels_by_chapter: dict  # Maps chapter_id to list of panels
    character_appearances: dict  # Maps character names to panel IDs
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

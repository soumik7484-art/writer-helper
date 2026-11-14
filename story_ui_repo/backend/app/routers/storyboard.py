from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..models import StoryboardPanel, StoryboardGenerate, StoryStoryboard
from ..services.db_service import db_service
from ..services.storyboard_service import storyboard_service
from ..services.image_generation_service import image_generation_service

router = APIRouter(tags=["Storyboard"])


@router.post("/api/stories/{story_id}/storyboard/generate")
def generate_story_storyboard(story_id: str, params: StoryboardGenerate):
    """
    Generate manga-style storyboard panels for a story or specific chapter
    """
    try:
        story = db_service.get_story(story_id)
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")
        
        # Get characters for context
        characters = db_service.get_characters(story_id)
        character_names = [c.get('name', '') for c in characters if c.get('name')]
        
        story_genre = story.get('genre', 'Mystery')
        panels_per_chapter = params.panels_per_chapter or 6
        
        if params.chapter_id:
            # Generate for single chapter
            chapter = db_service.get_chapter(params.chapter_id)
            if not chapter:
                raise HTTPException(status_code=404, detail="Chapter not found")
            
            panels = storyboard_service.generate_chapter_storyboard(
                chapter.get('content', ''),
                chapter.get('chapter_number', 1),
                chapter.get('title', 'Chapter'),
                story_genre,
                character_names,
                panels_per_chapter
            )
            
            # Save panels (store in memory/db)
            # For now, return directly
            return {
                "story_id": story_id,
                "chapter_id": params.chapter_id,
                "panels": panels,
                "total_panels": len(panels)
            }
        else:
            # Generate for all chapters
            chapters = db_service.get_chapters(story_id)
            if not chapters:
                raise HTTPException(status_code=404, detail="No chapters found for this story")
            
            storyboard = storyboard_service.generate_story_storyboard(
                chapters,
                story_genre,
                character_names,
                panels_per_chapter
            )
            
            character_appearances = storyboard_service.get_character_appearances(storyboard)
            
            total_panels = sum(len(panels) for panels in storyboard.values())
            
            return {
                "story_id": story_id,
                "total_chapters": len(chapters),
                "total_panels": total_panels,
                "panels_by_chapter": storyboard,
                "character_appearances": character_appearances,
                "message": f"Generated {total_panels} storyboard panels across {len(chapters)} chapters"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storyboard generation failed: {str(e)}")


@router.get("/api/stories/{story_id}/storyboard")
def get_story_storyboard(story_id: str):
    """
    Get existing storyboard for a story
    """
    # For now, regenerate on-demand
    # In production, this would fetch from database/cache
    try:
        story = db_service.get_story(story_id)
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")
        
        chapters = db_service.get_chapters(story_id)
        if not chapters:
            return {
                "story_id": story_id,
                "total_chapters": 0,
                "total_panels": 0,
                "panels_by_chapter": {},
                "message": "No chapters found"
            }
        
        characters = db_service.get_characters(story_id)
        character_names = [c.get('name', '') for c in characters if c.get('name')]
        
        storyboard = storyboard_service.generate_story_storyboard(
            chapters,
            story.get('genre', 'Mystery'),
            character_names,
            6
        )
        
        character_appearances = storyboard_service.get_character_appearances(storyboard)
        total_panels = sum(len(panels) for panels in storyboard.values())
        
        return {
            "story_id": story_id,
            "total_chapters": len(chapters),
            "total_panels": total_panels,
            "panels_by_chapter": storyboard,
            "character_appearances": character_appearances
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve storyboard: {str(e)}")


@router.get("/api/chapters/{chapter_id}/storyboard")
def get_chapter_storyboard(chapter_id: str, panels_per_chapter: int = 6):
    """
    Get storyboard panels for a specific chapter
    """
    try:
        chapter = db_service.get_chapter(chapter_id)
        if not chapter:
            raise HTTPException(status_code=404, detail="Chapter not found")
        
        story_id = chapter.get('story_id')
        story = db_service.get_story(story_id)
        
        characters = db_service.get_characters(story_id)
        character_names = [c.get('name', '') for c in characters if c.get('name')]
        
        panels = storyboard_service.generate_chapter_storyboard(
            chapter.get('content', ''),
            chapter.get('chapter_number', 1),
            chapter.get('title', 'Chapter'),
            story.get('genre', 'Mystery') if story else 'Mystery',
            character_names,
            panels_per_chapter
        )
        
        return {
            "chapter_id": chapter_id,
            "chapter_number": chapter.get('chapter_number'),
            "chapter_title": chapter.get('title'),
            "panels": panels,
            "total_panels": len(panels)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve chapter storyboard: {str(e)}")


@router.post("/api/panels/{panel_id}/generate-illustration")
def generate_panel_illustration(panel_id: str, params: Dict[str, Any] = None):
    """
    Generate AI illustration for a specific storyboard panel
    """
    try:
        params = params or {}
        prompt = params.get('prompt', '')
        style = params.get('style', 'manga')
        width = params.get('width', 512)
        height = params.get('height', 384)
        
        if not prompt:
            raise HTTPException(status_code=400, detail="Illustration prompt is required")
        
        result = image_generation_service.generate_panel_illustration(
            prompt=prompt,
            panel_id=panel_id,
            style=style,
            width=width,
            height=height
        )
        
        return {
            "panel_id": panel_id,
            "illustration": result,
            "success": True
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")


@router.post("/api/stories/{story_id}/storyboard/generate-illustrations")
def generate_storyboard_illustrations(story_id: str, chapter_ids: List[str] = None):
    """
    Batch generate illustrations for all panels in a story's storyboard
    """
    try:
        # Get existing storyboard
        story = db_service.get_story(story_id)
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")
        
        chapters = db_service.get_chapters(story_id)
        if chapter_ids:
            chapters = [ch for ch in chapters if ch.get('id') in chapter_ids]
        
        if not chapters:
            raise HTTPException(status_code=404, detail="No chapters found")
        
        characters = db_service.get_characters(story_id)
        character_names = [c.get('name', '') for c in characters if c.get('name')]
        
        # Generate storyboard
        storyboard = storyboard_service.generate_story_storyboard(
            chapters,
            story.get('genre', 'Mystery'),
            character_names,
            6
        )
        
        # Collect all panels
        all_panels = []
        for chapter_id, panels in storyboard.items():
            all_panels.extend(panels)
        
        # Batch generate illustrations
        generated_count = 0
        illustrations = {}
        
        for panel in all_panels:
            result = image_generation_service.generate_panel_illustration(
                prompt=panel.get('illustration_prompt', panel.get('visual_description', '')),
                panel_id=panel.get('id'),
                style='manga',
                width=512,
                height=384
            )
            illustrations[panel.get('id')] = result
            generated_count += 1
        
        return {
            "story_id": story_id,
            "total_panels": len(all_panels),
            "illustrations_generated": generated_count,
            "illustrations": illustrations,
            "message": f"Generated {generated_count} panel illustrations"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch illustration generation failed: {str(e)}")


@router.get("/api/image-generation/status")
def get_image_generation_status():
    """
    Check if image generation is enabled and which backends are available
    """
    return {
        "enabled": image_generation_service.enabled,
        "available_backends": {
            "stable_diffusion": bool(image_generation_service.stable_diffusion_api_key and image_generation_service.stable_diffusion_url),
            "dalle": bool(image_generation_service.dalle_api_key),
            "placeholder": True
        },
        "default_style": "manga",
        "message": "Image generation ready" if image_generation_service.enabled else "Image generation disabled - using placeholders"
    }

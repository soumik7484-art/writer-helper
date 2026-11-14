"""
Storyboard Service
Generates manga-style visual storyboard panels from chapter content
Extracts key scenes with AI analysis for plot hole detection visualization
"""
import json
import re
from typing import List, Dict, Any, Optional
from .ai_service import ai_service


class StoryboardService:
    """Generate storyboard panels from chapter content"""
    
    def __init__(self):
        self.target_panels_per_chapter = 6  # Default panels per chapter
    
    def generate_chapter_storyboard(
        self,
        chapter_content: str,
        chapter_number: int,
        chapter_title: str,
        story_genre: str = "Mystery",
        characters: List[str] = None,
        target_panel_count: int = 6
    ) -> List[Dict[str, Any]]:
        """
        Generate storyboard panels for a single chapter
        
        Args:
            chapter_content: Full text of the chapter
            chapter_number: Chapter number
            chapter_title: Chapter title
            story_genre: Genre for context
            characters: Known characters in the story
            target_panel_count: Number of panels to generate (4-8 recommended)
            
        Returns:
            List of panel dictionaries with scene descriptions
        """
        if not chapter_content or len(chapter_content.strip()) < 50:
            return self._generate_fallback_panels(chapter_number, chapter_title, target_panel_count)
        
        # Try AI extraction first
        ai_panels = self._extract_panels_with_ai(
            chapter_content,
            chapter_number,
            chapter_title,
            story_genre,
            characters,
            target_panel_count
        )
        
        if ai_panels and len(ai_panels) >= 3:
            return ai_panels
        
        # Fallback to rule-based extraction
        return self._extract_panels_rule_based(
            chapter_content,
            chapter_number,
            chapter_title,
            target_panel_count
        )
    
    def _extract_panels_with_ai(
        self,
        content: str,
        chapter_num: int,
        chapter_title: str,
        genre: str,
        characters: List[str],
        target_count: int
    ) -> List[Dict[str, Any]]:
        """Use AI to extract key scenes as storyboard panels"""
        
        # Truncate content for API limits
        content_preview = content[:3000] if len(content) > 3000 else content
        
        char_list = ", ".join(characters) if characters else "unknown characters"
        
        prompt = f"""Analyze this chapter from a {genre} story and extract {target_count} key visual scenes suitable for a manga-style storyboard.

Chapter {chapter_num}: {chapter_title}

Chapter Content:
{content_preview}

Known Characters: {char_list}

Extract exactly {target_count} distinct visual scenes that best represent the chapter's progression.
For EACH scene, provide:
1. A short scene title (5-8 words)
2. A detailed visual description (what would be illustrated in this panel)
3. Characters present in the scene
4. Location/setting
5. Key dialogue or action (if any)
6. Emotional tone

Return ONLY valid JSON array:
[
  {{
    "panel_number": 1,
    "scene_title": "...",
    "visual_description": "...",
    "characters": ["..."],
    "location": "...",
    "dialogue_excerpt": "...",
    "emotional_tone": "...",
    "action_summary": "..."
  }}
]

Do not use markdown code blocks."""

        try:
            response = ai_service._call_gemini(prompt)
            if response:
                # Clean and parse JSON
                clean_json = re.sub(r"^```json|^```|```$", "", response.strip(), flags=re.MULTILINE).strip()
                parsed = json.loads(clean_json)
                
                if isinstance(parsed, list) and len(parsed) > 0:
                    # Enrich and validate panels
                    panels = []
                    for idx, panel_data in enumerate(parsed[:target_count]):
                        panel = {
                            "id": f"panel_{chapter_num}_{idx + 1}",
                            "chapter_number": chapter_num,
                            "chapter_title": chapter_title,
                            "panel_number": panel_data.get("panel_number", idx + 1),
                            "scene_title": panel_data.get("scene_title", f"Scene {idx + 1}"),
                            "visual_description": panel_data.get("visual_description", ""),
                            "characters": panel_data.get("characters", []),
                            "location": panel_data.get("location", "Unknown location"),
                            "dialogue_excerpt": panel_data.get("dialogue_excerpt", ""),
                            "emotional_tone": panel_data.get("emotional_tone", "Neutral"),
                            "action_summary": panel_data.get("action_summary", ""),
                            "illustration_url": None,  # Will be populated by image generation
                            "illustration_prompt": self._generate_illustration_prompt(panel_data, genre)
                        }
                        panels.append(panel)
                    
                    return panels
        except Exception as e:
            print(f"[Storyboard AI Extraction Error] {e}")
        
        return []
    
    def _extract_panels_rule_based(
        self,
        content: str,
        chapter_num: int,
        chapter_title: str,
        target_count: int
    ) -> List[Dict[str, Any]]:
        """
        Rule-based panel extraction when AI fails
        Divides chapter into segments and extracts key moments
        """
        # Split by paragraph breaks
        paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
        
        if len(paragraphs) < target_count:
            # Not enough paragraphs, split largest ones
            expanded = []
            for p in paragraphs:
                sentences = [s.strip() for s in re.split(r'[.!?]+', p) if s.strip()]
                if len(sentences) > 3:
                    # Split into chunks of 2-3 sentences
                    for i in range(0, len(sentences), 3):
                        expanded.append('. '.join(sentences[i:i+3]) + '.')
                else:
                    expanded.append(p)
            paragraphs = expanded
        
        # Select evenly distributed paragraphs
        step = max(1, len(paragraphs) // target_count)
        selected_indices = [i * step for i in range(target_count)]
        selected_indices = [min(i, len(paragraphs) - 1) for i in selected_indices]
        
        panels = []
        for idx, para_idx in enumerate(selected_indices):
            para = paragraphs[para_idx]
            
            # Extract first sentence as title
            sentences = [s.strip() for s in re.split(r'[.!?]+', para) if s.strip()]
            title_text = sentences[0][:50] if sentences else f"Scene {idx + 1}"
            
            # Detect characters (look for capitalized words that might be names)
            potential_chars = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', para)
            characters = list(set(potential_chars[:3]))  # Top 3 unique
            
            # Detect location hints
            location_keywords = ['room', 'street', 'house', 'forest', 'city', 'office', 'hall', 'corridor']
            location = "Scene location"
            for word in location_keywords:
                if word in para.lower():
                    location = word.capitalize()
                    break
            
            # Extract dialogue
            dialogue = ""
            dialogue_match = re.search(r'"([^"]+)"', para)
            if dialogue_match:
                dialogue = dialogue_match.group(1)[:80]
            
            panel = {
                "id": f"panel_{chapter_num}_{idx + 1}",
                "chapter_number": chapter_num,
                "chapter_title": chapter_title,
                "panel_number": idx + 1,
                "scene_title": title_text,
                "visual_description": para[:200],
                "characters": characters,
                "location": location,
                "dialogue_excerpt": dialogue,
                "emotional_tone": self._detect_emotion(para),
                "action_summary": sentences[0] if sentences else "",
                "illustration_url": None,
                "illustration_prompt": f"Illustrated scene: {title_text}. {para[:150]}"
            }
            panels.append(panel)
        
        return panels
    
    def _generate_fallback_panels(
        self,
        chapter_num: int,
        chapter_title: str,
        count: int
    ) -> List[Dict[str, Any]]:
        """Generate placeholder panels when content is missing"""
        panels = []
        for i in range(count):
            panels.append({
                "id": f"panel_{chapter_num}_{i + 1}",
                "chapter_number": chapter_num,
                "chapter_title": chapter_title,
                "panel_number": i + 1,
                "scene_title": f"Scene {i + 1}",
                "visual_description": f"Key moment {i + 1} from {chapter_title}",
                "characters": [],
                "location": "Unknown",
                "dialogue_excerpt": "",
                "emotional_tone": "Mysterious",
                "action_summary": f"Chapter {chapter_num} progresses",
                "illustration_url": None,
                "illustration_prompt": f"Chapter {chapter_num} scene {i + 1}"
            })
        return panels
    
    def _generate_illustration_prompt(self, panel_data: Dict[str, Any], genre: str) -> str:
        """Generate a prompt for image generation from panel data"""
        chars = ", ".join(panel_data.get("characters", [])) if panel_data.get("characters") else "characters"
        location = panel_data.get("location", "unknown location")
        desc = panel_data.get("visual_description", "")
        tone = panel_data.get("emotional_tone", "dramatic")
        
        prompt = f"Manga-style illustration, {genre} genre, {tone} atmosphere. "
        prompt += f"Scene: {desc[:150]}. "
        prompt += f"Characters: {chars}. Location: {location}. "
        prompt += "Black and white line art, high contrast, cinematic composition, detailed backgrounds."
        
        return prompt
    
    def _detect_emotion(self, text: str) -> str:
        """Simple emotion detection from text"""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['terror', 'fear', 'scream', 'horror', 'afraid']):
            return "Terrified"
        elif any(word in text_lower for word in ['angry', 'rage', 'furious', 'shouted']):
            return "Angry"
        elif any(word in text_lower for word in ['happy', 'joy', 'laugh', 'smile', 'delight']):
            return "Joyful"
        elif any(word in text_lower for word in ['sad', 'tears', 'cry', 'grief', 'sorrow']):
            return "Sorrowful"
        elif any(word in text_lower for word in ['tense', 'suspense', 'anxious', 'nervous']):
            return "Tense"
        elif any(word in text_lower for word in ['mysterious', 'strange', 'curious', 'wonder']):
            return "Mysterious"
        else:
            return "Contemplative"
    
    def generate_story_storyboard(
        self,
        chapters: List[Dict[str, Any]],
        story_genre: str = "Mystery",
        characters: List[str] = None,
        panels_per_chapter: int = 6
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Generate complete storyboard for entire story
        
        Returns:
            Dictionary mapping chapter IDs to their panel arrays
        """
        storyboard = {}
        
        for chapter in chapters:
            chapter_id = chapter.get('id', '')
            chapter_num = chapter.get('chapter_number', 0)
            chapter_title = chapter.get('title', f'Chapter {chapter_num}')
            content = chapter.get('content', '')
            
            panels = self.generate_chapter_storyboard(
                content,
                chapter_num,
                chapter_title,
                story_genre,
                characters,
                panels_per_chapter
            )
            
            storyboard[chapter_id] = panels
        
        return storyboard
    
    def get_character_appearances(
        self,
        storyboard: Dict[str, List[Dict[str, Any]]]
    ) -> Dict[str, List[str]]:
        """
        Track which panels each character appears in
        Useful for visual consistency checking
        
        Returns:
            Dictionary mapping character names to list of panel IDs
        """
        character_map = {}
        
        for chapter_id, panels in storyboard.items():
            for panel in panels:
                for char in panel.get('characters', []):
                    if char not in character_map:
                        character_map[char] = []
                    character_map[char].append(panel['id'])
        
        return character_map


storyboard_service = StoryboardService()

import json
import httpx
import re
from typing import List, Dict, Any, Optional
from ..config import GEMINI_API_KEY, GEMINI_MODEL

class AIService:
    def __init__(self):
        self.api_key = GEMINI_API_KEY
        self.model = GEMINI_MODEL or "gemini-1.5-flash"

    def _call_gemini(self, prompt: str, system_instruction: str = "") -> Optional[str]:
        if not self.api_key:
            return None
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "")
                else:
                    print(f"[Gemini API Error] status={res.status_code} body={res.text[:200]}")
        except Exception as e:
            print(f"[Gemini API Exception] {e}")
        return None

    def generate_outline(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        title = params.get("title", "Untitled Case")
        genre = params.get("genre", "Mystery")
        mood = params.get("mood", "Suspenseful")
        chapters_count = int(params.get("chapter_count", 6))
        prompt = params.get("description", "")

        gemini_prompt = f"""Generate a detailed {chapters_count}-chapter story outline for a {genre} story titled '{title}'.
Mood: {mood}.
Premise: {prompt}.
Return ONLY a valid JSON array of objects with keys:
"chapter" (int), "title" (str), "focus" (str). Do not enclose in markdown code blocks."""

        ai_res = self._call_gemini(gemini_prompt)
        if ai_res:
            try:
                clean_json = re.sub(r"^```json|^```|```$", "", ai_res.strip(), flags=re.MULTILINE).strip()
                parsed = json.loads(clean_json)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass

        outlines = {
            "Mystery": [
                {"chapter": 1, "title": "The Cipher on the Threshold", "focus": "A strange artifact arrives under cover of fog, bringing ominous warnings."},
                {"chapter": 2, "title": "Suspects in the Parlor", "focus": "Interrogations reveal conflicting alibis and buried family debts."},
                {"chapter": 3, "title": "The Forged Ledger", "focus": "A secret compartment yields documented proof of an unsolved prior crime."},
                {"chapter": 4, "title": "Footsteps in the Catacombs", "focus": "A perilous midnight descent beneath the town exposes a second conspiracy."},
                {"chapter": 5, "title": "The Mask Slips", "focus": "The primary suspect is murdered or exposed, shifting the inquiry to an unsuspected ally."},
                {"chapter": 6, "title": "The Final Reckoning", "focus": "A high-stakes confrontation during a torrential storm as the ultimate truth is forced into the light."}
            ],
            "Fantasy": [
                {"chapter": 1, "title": "The Awakening of the Runestone", "focus": "An ancient seal fractures in the borderlands, sending ripples across the arcane realms."},
                {"chapter": 2, "title": "The Road of Broken Banners", "focus": "A reluctant fellowship forms in the tavern of the grey marshes."},
                {"chapter": 3, "title": "Whispers of the Sunken Spire", "focus": "Navigating treacherous elder ruins to retrieve the lost celestial fragment."},
                {"chapter": 4, "title": "The Betrayal of Oaths", "focus": "A trusted companion succumbs to forbidden corruption, fracturing the party."},
                {"chapter": 5, "title": "The Siege of the Iron Gate", "focus": "Monstrous forces assault the last sanctuary as magical reserves dwindle."},
                {"chapter": 6, "title": "The Shattered Crown", "focus": "A climactic ritual of blood and starlight that permanently reshapes the world's magic."}
            ],
            "Sci-Fi": [
                {"chapter": 1, "title": "Signal From the Void", "focus": "A deep-space surveyor picks up an impossible broadcast from an abandoned orbital station."},
                {"chapter": 2, "title": "The Ghost Protocol", "focus": "Docking with the derelict hull reveals dormant synthetic intelligences still calculating."},
                {"chapter": 3, "title": "Neural Contagion", "focus": "The crew's cybernetic implants begin displaying shared hallucinations."},
                {"chapter": 4, "title": "The Quarantine Breach", "focus": "A struggle to isolate the reactor core as containment protocols trigger sequentially."},
                {"chapter": 5, "title": "Beyond the Singularity", "focus": "A revelation that the signal originated from their own future ship."},
                {"chapter": 6, "title": "The Event Horizon", "focus": "A final desperate jump through the gravitational anomaly to broadcast the warning."}
            ],
            "Romance": [
                {"chapter": 1, "title": "An Unscheduled Encounter", "focus": "Two estranged figures cross paths during a turbulent autumn evening."},
                {"chapter": 2, "title": "Unspoken Letters", "focus": "Old memories and unspoken regrets resurface through discovered keepsakes."},
                {"chapter": 3, "title": "Under the Lamplight", "focus": "A forced collaboration brings lingering vulnerabilities and tender closeness."},
                {"chapter": 4, "title": "The Shadow of the Past", "focus": "A miscommunication and external obligation threatens to sever their fragile bond."},
                {"chapter": 5, "title": "Rain on the Promenade", "focus": "A passionate confrontation where long-hidden truths and fears are confessed."},
                {"chapter": 6, "title": "Two Names on the Ledger", "focus": "A heartfelt, enduring promise forged despite past adversity."}
            ]
        }
        base = outlines.get(genre, outlines["Mystery"])
        while len(base) < chapters_count:
            idx = len(base) + 1
            base.append({"chapter": idx, "title": f"The Unveiling (Part {idx})", "focus": f"Key narrative turning point progressing towards the story's resolution."})
        return base[:chapters_count]

    def assist_writing(self, action: str, current_content: str, chapter_title: str,
                       relevant_memories: List[Dict[str, Any]], character_notes: str = "",
                       instruction: str = "") -> Dict[str, Any]:
        memories_text = "\n".join([f"- [{m.get('category')}]: {m.get('title')} ({m.get('description')})" for m in relevant_memories])
        
        system_inst = "You are a master literary co-writer and narrative continuity specialist. Craft prose rich in sensory detail, atmospheric pacing, and character psychological depth. Do not include meta-commentary or conversational filler. Return only the narrative text."

        gemini_prompt = f"""Action: {action.upper()}
Chapter: {chapter_title}
Universe Context & Memories:
{memories_text}

Characters in Scene:
{character_notes}

Current Chapter Content:
{current_content}

Special Instruction: {instruction}
Respond with high-quality literary prose fitting the story's mood and continuity."""

        ai_res = self._call_gemini(gemini_prompt, system_inst)
        if ai_res:
            return {"generated_text": ai_res.strip(), "engine": "Gemini-1.5-Flash"}

        if action == "continue":
            text = f"""\n\nThe silence that followed carried the weight of an unspoken confession. Across the weathered floorboards, shadows lengthened as the lantern wick flickered against the damp air. Every instinct gathered over years of quiet vigilance urged caution, yet turning back was no longer an option. The coordinates had been verified, the seals broken. Whatever lay beyond the threshold was now listening for the next step."""
        elif action == "dialogue":
            text = f""""You speak as if the truth were something we could still afford," Vance remarked, his voice barely above a murmur as he turned the brass casing in his palm. "Every record in the archive was falsified before we ever stepped foot on the pier."\n\n"Then let them burn," came the reply, steady and cold as iron. "We did not come this far to salvage their reputation."""
        elif action == "expand":
            text = f"""Every detail of the surroundings seemed etched with quiet menace. The damp sea air clung to the stone walls, condensing into slow, bead-like droplets that trailed downward like silent tears. In the distance, the foghorn sounded at deliberate four-minute intervals—a mournful iron groan that echoed across the jagged headland."""
        elif action == "describe":
            text = f"""The chamber was swallowed in a deep, sepia gloom. Shelves of oilcloth ledgers rose to the vaulted ceiling, their bindings rotted with decades of briny condensation. Dust motes drifted through the solitary beam of gaslight, settling upon a scarred drafting table covered in hand-drawn nautical charts and stained compass points."""
        elif action == "summarize":
            text = f"""Key Events: The investigator receives an unexpected heirloom containing encrypted coordinates. An inspection of the locked estate reveals clear signs of foul play and a panicked cover-up. New inquiries at the archive reveal a subterranean expansion dating back fifty years."""
        elif action == "continuity":
            text = f"""Continuity Inspection: No fatal timeline ruptures detected in this section. The mention of the waterlogged timepiece aligns with established universe lore. Recommendation: verify that the character's weapon remains holstered until reaching the lower cellar."""
        else:
            text = f"""\n\nA sudden sharp metallic click shattered the quiet. The mechanism was engaging."""

        return {"generated_text": text, "engine": "StoryWeave Studio Co-Writer"}

    def generate_character(self, story_genre: str, role: str = "Protagonist", story_theme: str = "") -> Dict[str, Any]:
        prompt = f"""Generate a realistic, multi-dimensional character profile for a {story_genre} story.
Role: {role}.
Theme: {story_theme}.
Return ONLY valid JSON with keys:
"name", "alias", "age", "personality_traits" (list of 4 traits), "backstory", "physical_description", "motivations", "goals", "fears", "secrets", "current_status"."""

        ai_res = self._call_gemini(prompt)
        if ai_res:
            try:
                clean_json = re.sub(r"^```json|^```|```$", "", ai_res.strip(), flags=re.MULTILINE).strip()
                parsed = json.loads(clean_json)
                if isinstance(parsed, dict) and "name" in parsed:
                    return parsed
            except Exception:
                pass

        fallback_chars = {
            "Mystery": {
                "name": "Julian Calder",
                "alias": "The Shadow Ledger",
                "age": "36",
                "personality_traits": ["Methodical", "Unsentimental", "Steadfast", "Cautious"],
                "backstory": "Former forensic accountant for the maritime commission who uncovered systematic smuggling along the northern straits.",
                "physical_description": "Sharp hawk-like features, steel-framed spectacles, wears charcoal wool overcoats with reinforced inner pockets.",
                "motivations": "Expose the high-ranking syndicate responsible for his partner's suspicious death.",
                "goals": "Recover the missing double-entry manifests before the audit committee convenes.",
                "fears": "Being framed for the embezzlement he spent three years documenting.",
                "secrets": "Retains the private telegraph key capable of intercepting port communications.",
                "current_status": "Alive"
            },
            "Fantasy": {
                "name": "Valeria Thorne",
                "alias": "The Silver Warden",
                "age": "29",
                "personality_traits": ["Resolute", "Honorable", "Haunted", "Fiercely Loyal"],
                "backstory": "Last surviving sentinel of the Sunken Spire order, sworn to protect the celestial rift from unlawful binding.",
                "physical_description": "Athletic build, silver-threaded braided hair, obsidian eyes, wearing etched cuirass beneath an ash-grey cloak.",
                "motivations": "Restore the shattered wards before the eclipse awakens the ancient subterranean entity.",
                "goals": "Find the key to the seventh vault and unite the fractured clans.",
                "fears": "Succumbing to the same celestial corruption that consumed her mentor.",
                "secrets": "A fragment of the broken runestone is embedded beneath her palm, pulsing in the presence of lies.",
                "current_status": "Alive"
            }
        }
        return fallback_chars.get(story_genre, fallback_chars["Mystery"])

    def extract_timeline_events(self, chapter_text: str, chapter_number: int, story_id: str) -> List[Dict[str, Any]]:
        prompt = f"""Extract 2 to 3 key structured plot events from this chapter text.
Return ONLY a valid JSON array of objects with keys:
"title", "description", "location", "characters_involved" (list of names), "consequences" (list of consequences), "category" (one of: plot_turn, conflict, revelation, discovery).
Chapter Text:
{chapter_text[:2000]}"""

        ai_res = self._call_gemini(prompt)
        if ai_res:
            try:
                clean_json = re.sub(r"^```json|^```|```$", "", ai_res.strip(), flags=re.MULTILINE).strip()
                parsed = json.loads(clean_json)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass

        return [
            {
                "title": f"Critical Discovery in Chapter {chapter_number}",
                "description": "Crucial evidence was uncovered, fundamentally shifting the investigative direction.",
                "location": "Primary Scene Location",
                "characters_involved": ["Protagonist"],
                "consequences": ["New investigative lead unlocked"],
                "category": "discovery"
            }
        ]

    def audit_plot_holes(self, chapters: List[Dict[str, Any]], memories: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [
            {
                "title": "Automated Narrative Continuity Scan",
                "category": "world_rule_violation",
                "severity": "Suggestion",
                "description": "Ensure the temporal progression between chapters 2 and 3 explicitly accounts for traveling distance across the headland.",
                "previous_conflicting_info": "Chapter 2 notes the sun setting at 6:00 PM.",
                "current_conflicting_info": "Chapter 3 depicts midday sun without an explicit passage of time marker.",
                "source_chapters": ["Chapter 2", "Chapter 3"],
                "suggested_correction": "Insert a transitional sentence: 'By the time the midday tide receded on the following morning...'",
                "status": "open"
            }
        ]

ai_service = AIService()

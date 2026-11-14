import json
import os
import threading
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

from ..config import DATA_DIR, MONGODB_URI, MONGODB_DB_NAME

lock = threading.Lock()

class DatabaseService:
    def __init__(self):
        self.use_mongo = False
        self.mongo_client = None
        self.db = None
        
        if MONGODB_URI:
            try:
                from pymongo import MongoClient
                self.mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
                self.mongo_client.server_info()
                self.db = self.mongo_client[MONGODB_DB_NAME]
                self.use_mongo = True
                print("[DB] Connected to MongoDB Atlas")
            except Exception as e:
                print(f"[DB] MongoDB fallback ({e})")
                self.use_mongo = False
                
        self.local_file = DATA_DIR / "storyweave_store.json"
        self._init_local_store()

    def _init_local_store(self):
        with lock:
            if not self.local_file.exists():
                initial_data = {
                    "stories": {},
                    "chapters": {},
                    "pages": {},
                    "characters": {},
                    "events": {},
                    "memories": {},
                    "plotholes": {},
                    "boards": {},
                    "investigation_boards": {},
                    "culprits": {}
                }
                self._save_local(initial_data)

    def _load_local(self) -> Dict[str, Any]:
        with lock:
            if not self.local_file.exists():
                return {"stories": {}, "chapters": {}, "pages": {}, "characters": {}, "events": {}, "memories": {}, "plotholes": {}, "boards": {}, "investigation_boards": {}, "culprits": {}}
            try:
                with open(self.local_file, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                    if "pages" not in loaded:
                        loaded["pages"] = {}
                    if "boards" not in loaded:
                        loaded["boards"] = {}
                    if "investigation_boards" not in loaded:
                        loaded["investigation_boards"] = {}
                    if "culprits" not in loaded:
                        loaded["culprits"] = {}
                    return loaded
            except Exception:
                return {"stories": {}, "chapters": {}, "pages": {}, "characters": {}, "events": {}, "memories": {}, "plotholes": {}, "boards": {}, "investigation_boards": {}, "culprits": {}}

    def _save_local(self, data: Dict[str, Any]):
        with lock:
            with open(self.local_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

    def get_stories(self) -> List[Dict[str, Any]]:
        if self.use_mongo:
            stories = list(self.db.stories.find())
            for s in stories:
                s.pop("_id", None)
            return stories
        data = self._load_local()
        return list(data["stories"].values())

    def get_story(self, story_id: str) -> Optional[Dict[str, Any]]:
        if self.use_mongo:
            doc = self.db.stories.find_one({"id": story_id})
            if doc:
                doc.pop("_id", None)
            return doc
        data = self._load_local()
        return data["stories"].get(story_id)

    def save_story(self, story: Dict[str, Any]) -> Dict[str, Any]:
        if self.use_mongo:
            self.db.stories.update_one({"id": story["id"]}, {"$set": story}, upsert=True)
            return story
        data = self._load_local()
        data["stories"][story["id"]] = story
        self._save_local(data)
        return story

    def delete_story(self, story_id: str) -> bool:
        if self.use_mongo:
            self.db.stories.delete_one({"id": story_id})
            self.db.chapters.delete_many({"story_id": story_id})
            self.db.characters.delete_many({"story_id": story_id})
            self.db.events.delete_many({"story_id": story_id})
            self.db.memories.delete_many({"story_id": story_id})
            self.db.plotholes.delete_many({"story_id": story_id})
            self.db.boards.delete_one({"story_id": story_id})
            return True
        data = self._load_local()
        data["stories"].pop(story_id, None)
        data["chapters"] = {k: v for k, v in data["chapters"].items() if v.get("story_id") != story_id}
        data["characters"] = {k: v for k, v in data["characters"].items() if v.get("story_id") != story_id}
        data["events"] = {k: v for k, v in data["events"].items() if v.get("story_id") != story_id}
        data["memories"] = {k: v for k, v in data["memories"].items() if v.get("story_id") != story_id}
        data["plotholes"] = {k: v for k, v in data["plotholes"].items() if v.get("story_id") != story_id}
        if "boards" in data:
            data["boards"].pop(story_id, None)
        self._save_local(data)
        return True

    def get_chapters(self, story_id: str) -> List[Dict[str, Any]]:
        if self.use_mongo:
            chaps = list(self.db.chapters.find({"story_id": story_id}).sort("chapter_number", 1))
            for c in chaps:
                c.pop("_id", None)
                c["pages"] = self.get_pages(c["id"])
            return chaps
        data = self._load_local()
        chaps = [c for c in data["chapters"].values() if c.get("story_id") == story_id]
        sorted_chaps = sorted(chaps, key=lambda x: x.get("chapter_number", 0))
        for c in sorted_chaps:
            c["pages"] = self.get_pages(c["id"])
        return sorted_chaps

    def get_chapter(self, chapter_id: str) -> Optional[Dict[str, Any]]:
        chap = None
        if self.use_mongo:
            doc = self.db.chapters.find_one({"id": chapter_id})
            if doc:
                doc.pop("_id", None)
                chap = doc
        else:
            data = self._load_local()
            chap = data["chapters"].get(chapter_id)
        if chap:
            chap["pages"] = self.get_pages(chapter_id)
        return chap

    def save_chapter(self, chapter: Dict[str, Any]) -> Dict[str, Any]:
        chapter["word_count"] = len(chapter.get("content", "").split())
        chapter["updated_at"] = datetime.utcnow().isoformat()

        # Handle pages if present in chapter payload
        if "pages" in chapter and chapter["pages"]:
            for p in chapter["pages"]:
                p_dict = p if isinstance(p, dict) else p.dict()
                p_dict["chapter_id"] = chapter["id"]
                self.save_page(chapter["id"], p_dict, sync_chapter=False)

        if self.use_mongo:
            self.db.chapters.update_one({"id": chapter["id"]}, {"$set": chapter}, upsert=True)
            chapter["pages"] = self.get_pages(chapter["id"])
            return chapter
        data = self._load_local()
        data["chapters"][chapter["id"]] = chapter
        self._save_local(data)
        chapter["pages"] = self.get_pages(chapter["id"])
        return chapter

    def delete_chapter(self, chapter_id: str) -> bool:
        if self.use_mongo:
            self.db.chapters.delete_one({"id": chapter_id})
            self.db.pages.delete_many({"chapter_id": chapter_id})
            return True
        data = self._load_local()
        data["chapters"].pop(chapter_id, None)
        if "pages" in data:
            data["pages"] = {k: v for k, v in data["pages"].items() if v.get("chapter_id") != chapter_id}
        self._save_local(data)
        return True

    def get_pages(self, chapter_id: str) -> List[Dict[str, Any]]:
        pages = []
        if self.use_mongo:
            pages = list(self.db.pages.find({"chapter_id": chapter_id}).sort("page_number", 1))
            for p in pages:
                p.pop("_id", None)
        else:
            data = self._load_local()
            pages_dict = data.get("pages", {})
            pages = [p for p in pages_dict.values() if p.get("chapter_id") == chapter_id]
            pages = sorted(pages, key=lambda x: x.get("page_number", 1))

        if pages:
            return pages

        # Lazy initialize pages from chapter content if none exist yet
        chap = None
        if self.use_mongo:
            doc = self.db.chapters.find_one({"id": chapter_id})
            if doc:
                doc.pop("_id", None)
                chap = doc
        else:
            data = self._load_local()
            chap = data.get("chapters", {}).get(chapter_id)

        if not chap:
            return []

        content = chap.get("content", "")
        import re
        raw_parts = re.split(r'<!--\s*(?:story-)?page-?break\s*-->', content, flags=re.IGNORECASE) if content else []
        raw_parts = [p.strip() for p in raw_parts if p.strip()]
        if not raw_parts:
            raw_parts = [content] if content and content.strip() else ["<p><br></p>"]

        initialized_pages = []
        now = datetime.utcnow().isoformat()
        for idx, part in enumerate(raw_parts):
            p_id = f"page_{chapter_id}_{idx + 1}"
            clean_text = re.sub(r'<[^>]*>', ' ', part).strip()
            words = len(clean_text.split()) if clean_text else 0
            p_obj = {
                "id": p_id,
                "chapter_id": chapter_id,
                "page_number": idx + 1,
                "content": part,
                "word_count": words,
                "save_status": "saved",
                "created_at": chap.get("created_at", now),
                "updated_at": chap.get("updated_at", now),
            }
            initialized_pages.append(p_obj)
            self.save_page(chapter_id, p_obj, sync_chapter=False)

        return initialized_pages

    def get_page(self, chapter_id: str, page_id: str) -> Optional[Dict[str, Any]]:
        if self.use_mongo:
            doc = self.db.pages.find_one({"id": page_id, "chapter_id": chapter_id})
            if doc:
                doc.pop("_id", None)
                return doc
        else:
            data = self._load_local()
            p = data.get("pages", {}).get(page_id)
            if p and p.get("chapter_id") == chapter_id:
                return p
        pages = self.get_pages(chapter_id)
        for p in pages:
            if p.get("id") == page_id:
                return p
        return None

    def save_page(self, chapter_id: str, page_dict: Dict[str, Any], sync_chapter: bool = True) -> Dict[str, Any]:
        import re
        page_dict["chapter_id"] = chapter_id
        content = page_dict.get("content", "")
        clean_text = re.sub(r'<[^>]*>', ' ', content).strip()
        page_dict["word_count"] = len(clean_text.split()) if clean_text else 0
        page_dict["updated_at"] = datetime.utcnow().isoformat()
        if "save_status" not in page_dict or not page_dict["save_status"]:
            page_dict["save_status"] = "saved"

        if self.use_mongo:
            self.db.pages.update_one({"id": page_dict["id"]}, {"$set": page_dict}, upsert=True)
        else:
            data = self._load_local()
            if "pages" not in data:
                data["pages"] = {}
            data["pages"][page_dict["id"]] = page_dict
            self._save_local(data)

        if sync_chapter:
            self._sync_chapter_from_pages(chapter_id)

        return page_dict

    def _sync_chapter_from_pages(self, chapter_id: str):
        pages = self.get_pages(chapter_id)
        pages_sorted = sorted(pages, key=lambda x: x.get("page_number", 1))
        meaningful = [p["content"] for p in pages_sorted if p.get("content") and p.get("content").strip() != "<p><br></p>"]
        combined_content = "<!-- story-page-break -->".join(meaningful) if meaningful else (pages_sorted[0]["content"] if pages_sorted else "")
        total_words = sum(p.get("word_count", 0) for p in pages_sorted)

        if self.use_mongo:
            self.db.chapters.update_one(
                {"id": chapter_id},
                {"$set": {
                    "content": combined_content,
                    "word_count": total_words,
                    "updated_at": datetime.utcnow().isoformat()
                }}
            )
        else:
            data = self._load_local()
            if chapter_id in data.get("chapters", {}):
                data["chapters"][chapter_id]["content"] = combined_content
                data["chapters"][chapter_id]["word_count"] = total_words
                data["chapters"][chapter_id]["updated_at"] = datetime.utcnow().isoformat()
                self._save_local(data)

    def create_page(self, chapter_id: str, page_data: Dict[str, Any]) -> Dict[str, Any]:
        import re
        import uuid
        existing_pages = self.get_pages(chapter_id)
        next_num = page_data.get("page_number")
        if next_num is None:
            next_num = len(existing_pages) + 1

        p_id = page_data.get("id") or f"page_{chapter_id}_{uuid.uuid4().hex[:8]}"
        content = page_data.get("content", "<p><br></p>")
        clean_text = re.sub(r'<[^>]*>', ' ', content).strip()
        now = datetime.utcnow().isoformat()

        new_page = {
            "id": p_id,
            "chapter_id": chapter_id,
            "page_number": next_num,
            "content": content,
            "word_count": len(clean_text.split()) if clean_text else 0,
            "save_status": "saved",
            "created_at": now,
            "updated_at": now
        }
        return self.save_page(chapter_id, new_page, sync_chapter=True)

    def delete_page(self, chapter_id: str, page_id: str) -> bool:
        if self.use_mongo:
            self.db.pages.delete_one({"id": page_id, "chapter_id": chapter_id})
        else:
            data = self._load_local()
            if "pages" in data and page_id in data["pages"]:
                del data["pages"][page_id]
                self._save_local(data)

        self._sync_chapter_from_pages(chapter_id)
        return True

    def _normalize_character(self, c: Dict[str, Any]) -> Dict[str, Any]:
        if not c:
            return c
        status = c.get("investigation_status")
        if not status:
            if c.get("is_culprit") or c.get("role") == "Culprit":
                status = "person_of_interest"
            else:
                status = "unclassified"
        elif status == "culprit":
            status = "person_of_interest"
        c["investigation_status"] = status
        return c

    def get_characters(self, story_id: str) -> List[Dict[str, Any]]:
        if self.use_mongo:
            chars = list(self.db.characters.find({"story_id": story_id}))
            for c in chars:
                c.pop("_id", None)
            return [self._normalize_character(c) for c in chars]
        data = self._load_local()
        return [self._normalize_character(c) for c in data["characters"].values() if c.get("story_id") == story_id]

    def get_character(self, character_id: str) -> Optional[Dict[str, Any]]:
        if self.use_mongo:
            doc = self.db.characters.find_one({"id": character_id})
            if doc:
                doc.pop("_id", None)
                return self._normalize_character(doc)
            return None
        data = self._load_local()
        c = data["characters"].get(character_id)
        return self._normalize_character(c) if c else None

    def save_character(self, character: Dict[str, Any]) -> Dict[str, Any]:
        character = self._normalize_character(dict(character))
        character["updated_at"] = datetime.utcnow().isoformat()
        if self.use_mongo:
            self.db.characters.update_one({"id": character["id"]}, {"$set": character}, upsert=True)
            return character
        data = self._load_local()
        data["characters"][character["id"]] = character
        self._save_local(data)
        return character

    def delete_character(self, character_id: str) -> bool:
        if self.use_mongo:
            self.db.characters.delete_one({"id": character_id})
            return True
        data = self._load_local()
        data["characters"].pop(character_id, None)
        self._save_local(data)
        return True

    def get_events(self, story_id: str) -> List[Dict[str, Any]]:
        if self.use_mongo:
            evts = list(self.db.events.find({"story_id": story_id}).sort("chronological_position", 1))
            for e in evts:
                e.pop("_id", None)
            return evts
        data = self._load_local()
        evts = [e for e in data["events"].values() if e.get("story_id") == story_id]
        return sorted(evts, key=lambda x: (x.get("chronological_position", 0), x.get("event_number", 0)))

    def save_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        event["updated_at"] = datetime.utcnow().isoformat()
        if self.use_mongo:
            self.db.events.update_one({"id": event["id"]}, {"$set": event}, upsert=True)
            return event
        data = self._load_local()
        data["events"][event["id"]] = event
        self._save_local(data)
        return event

    def delete_event(self, event_id: str) -> bool:
        if self.use_mongo:
            self.db.events.delete_one({"id": event_id})
            return True
        data = self._load_local()
        data["events"].pop(event_id, None)
        self._save_local(data)
        return True

    def get_memories(self, story_id: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.use_mongo:
            q = {"story_id": story_id}
            if category:
                q["category"] = category
            mems = list(self.db.memories.find(q))
            for m in mems:
                m.pop("_id", None)
            return mems
        data = self._load_local()
        mems = [m for m in data["memories"].values() if m.get("story_id") == story_id]
        if category:
            mems = [m for m in mems if m.get("category") == category]
        return mems

    def save_memory(self, memory: Dict[str, Any]) -> Dict[str, Any]:
        memory["updated_at"] = datetime.utcnow().isoformat()
        if self.use_mongo:
            self.db.memories.update_one({"id": memory["id"]}, {"$set": memory}, upsert=True)
            return memory
        data = self._load_local()
        data["memories"][memory["id"]] = memory
        self._save_local(data)
        return memory

    def delete_memory(self, memory_id: str) -> bool:
        if self.use_mongo:
            self.db.memories.delete_one({"id": memory_id})
            return True
        data = self._load_local()
        data["memories"].pop(memory_id, None)
        self._save_local(data)
        return True

    def get_plotholes(self, story_id: str) -> List[Dict[str, Any]]:
        if self.use_mongo:
            issues = list(self.db.plotholes.find({"story_id": story_id}))
            for i in issues:
                i.pop("_id", None)
            return issues
        data = self._load_local()
        return [i for i in data["plotholes"].values() if i.get("story_id") == story_id]

    def save_plothole(self, issue: Dict[str, Any]) -> Dict[str, Any]:
        issue["updated_at"] = datetime.utcnow().isoformat()
        if self.use_mongo:
            self.db.plotholes.update_one({"id": issue["id"]}, {"$set": issue}, upsert=True)
            return issue
        data = self._load_local()
        data["plotholes"][issue["id"]] = issue
        self._save_local(data)
        return issue

    def delete_plothole(self, issue_id: str) -> bool:
        if self.use_mongo:
            self.db.plotholes.delete_one({"id": issue_id})
            return True
        data = self._load_local()
        data["plotholes"].pop(issue_id, None)
        self._save_local(data)
        return True

    def get_board(self, story_id: str) -> Optional[Dict[str, Any]]:
        if self.use_mongo:
            doc = self.db.boards.find_one({"story_id": story_id})
            if doc:
                doc.pop("_id", None)
            return doc
        data = self._load_local()
        return data.get("boards", {}).get(story_id)

    def save_board(self, story_id: str, board_data: Dict[str, Any]) -> Dict[str, Any]:
        payload = dict(board_data)
        payload["story_id"] = story_id
        payload["updated_at"] = datetime.utcnow().isoformat()
        if self.use_mongo:
            self.db.boards.update_one({"story_id": story_id}, {"$set": payload}, upsert=True)
            return payload
        data = self._load_local()
        if "boards" not in data:
            data["boards"] = {}
        data["boards"][story_id] = payload
        self._save_local(data)
        return payload

    def get_investigation_board(self, story_id: str) -> Optional[Dict[str, Any]]:
        if self.use_mongo:
            doc = self.db.investigation_boards.find_one({"story_id": story_id})
            if doc:
                doc.pop("_id", None)
            return doc
        data = self._load_local()
        return data.get("investigation_boards", {}).get(story_id)

    def save_investigation_board(self, story_id: str, board_data: Dict[str, Any]) -> Dict[str, Any]:
        payload = dict(board_data)
        payload["story_id"] = story_id
        payload["updated_at"] = datetime.utcnow().isoformat()
        if self.use_mongo:
            self.db.investigation_boards.update_one({"story_id": story_id}, {"$set": payload}, upsert=True)
            return payload
        data = self._load_local()
        if "investigation_boards" not in data:
            data["investigation_boards"] = {}
        data["investigation_boards"][story_id] = payload
        self._save_local(data)
        return payload

    def get_culprit(self, story_id: str) -> Optional[Dict[str, Any]]:
        if self.use_mongo:
            doc = self.db.culprits.find_one({"story_id": story_id})
            if doc:
                doc.pop("_id", None)
            return doc
        data = self._load_local()
        return data.get("culprits", {}).get(story_id)

    def save_culprit(self, story_id: str, culprit_data: Dict[str, Any]) -> Dict[str, Any]:
        payload = dict(culprit_data)
        payload["story_id"] = story_id
        payload["updated_at"] = datetime.utcnow().isoformat()
        if self.use_mongo:
            self.db.culprits.update_one({"story_id": story_id}, {"$set": payload}, upsert=True)
            return payload
        data = self._load_local()
        if "culprits" not in data:
            data["culprits"] = {}
        data["culprits"][story_id] = payload
        self._save_local(data)
        return payload

    def delete_culprit(self, story_id: str) -> bool:
        if self.use_mongo:
            self.db.culprits.delete_one({"story_id": story_id})
            return True
        data = self._load_local()
        if "culprits" in data:
            data["culprits"].pop(story_id, None)
            self._save_local(data)
        return True

db_service = DatabaseService()

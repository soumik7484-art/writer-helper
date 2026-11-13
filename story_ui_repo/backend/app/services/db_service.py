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
                    "characters": {},
                    "events": {},
                    "memories": {},
                    "plotholes": {}
                }
                self._save_local(initial_data)

    def _load_local(self) -> Dict[str, Any]:
        with lock:
            if not self.local_file.exists():
                return {"stories": {}, "chapters": {}, "characters": {}, "events": {}, "memories": {}, "plotholes": {}}
            try:
                with open(self.local_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {"stories": {}, "chapters": {}, "characters": {}, "events": {}, "memories": {}, "plotholes": {}}

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
            return True
        data = self._load_local()
        data["stories"].pop(story_id, None)
        data["chapters"] = {k: v for k, v in data["chapters"].items() if v.get("story_id") != story_id}
        data["characters"] = {k: v for k, v in data["characters"].items() if v.get("story_id") != story_id}
        data["events"] = {k: v for k, v in data["events"].items() if v.get("story_id") != story_id}
        data["memories"] = {k: v for k, v in data["memories"].items() if v.get("story_id") != story_id}
        data["plotholes"] = {k: v for k, v in data["plotholes"].items() if v.get("story_id") != story_id}
        self._save_local(data)
        return True

    def get_chapters(self, story_id: str) -> List[Dict[str, Any]]:
        if self.use_mongo:
            chaps = list(self.db.chapters.find({"story_id": story_id}).sort("chapter_number", 1))
            for c in chaps:
                c.pop("_id", None)
            return chaps
        data = self._load_local()
        chaps = [c for c in data["chapters"].values() if c.get("story_id") == story_id]
        return sorted(chaps, key=lambda x: x.get("chapter_number", 0))

    def get_chapter(self, chapter_id: str) -> Optional[Dict[str, Any]]:
        if self.use_mongo:
            doc = self.db.chapters.find_one({"id": chapter_id})
            if doc:
                doc.pop("_id", None)
            return doc
        data = self._load_local()
        return data["chapters"].get(chapter_id)

    def save_chapter(self, chapter: Dict[str, Any]) -> Dict[str, Any]:
        chapter["word_count"] = len(chapter.get("content", "").split())
        chapter["updated_at"] = datetime.utcnow().isoformat()
        if self.use_mongo:
            self.db.chapters.update_one({"id": chapter["id"]}, {"$set": chapter}, upsert=True)
            return chapter
        data = self._load_local()
        data["chapters"][chapter["id"]] = chapter
        self._save_local(data)
        return chapter

    def delete_chapter(self, chapter_id: str) -> bool:
        if self.use_mongo:
            self.db.chapters.delete_one({"id": chapter_id})
            return True
        data = self._load_local()
        data["chapters"].pop(chapter_id, None)
        self._save_local(data)
        return True

    def get_characters(self, story_id: str) -> List[Dict[str, Any]]:
        if self.use_mongo:
            chars = list(self.db.characters.find({"story_id": story_id}))
            for c in chars:
                c.pop("_id", None)
            return chars
        data = self._load_local()
        return [c for c in data["characters"].values() if c.get("story_id") == story_id]

    def get_character(self, character_id: str) -> Optional[Dict[str, Any]]:
        if self.use_mongo:
            doc = self.db.characters.find_one({"id": character_id})
            if doc:
                doc.pop("_id", None)
            return doc
        data = self._load_local()
        return data["characters"].get(character_id)

    def save_character(self, character: Dict[str, Any]) -> Dict[str, Any]:
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

db_service = DatabaseService()

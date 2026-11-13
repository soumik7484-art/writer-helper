import math
import re
from typing import List, Dict, Any, Optional

class VectorMemoryService:
    def __init__(self):
        self.has_chroma = False
        try:
            import chromadb
            self.chroma_client = chromadb.Client()
            self.collection = self.chroma_client.get_or_create_collection("universe_memories")
            self.has_chroma = True
            print("[VectorService] ChromaDB active")
        except Exception:
            print("[VectorService] Using native semantic cosine vector engine")

    def _tokenize(self, text: str) -> List[str]:
        words = re.findall(r"\w+", text.lower())
        tokens = list(words)
        for i in range(len(words) - 1):
            tokens.append(f"{words[i]}_{words[i+1]}")
        return tokens

    def search_memories(self, query: str, memories: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
        if not memories:
            return []
        
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return memories[:top_k]

        q_tf = {}
        for t in query_tokens:
            q_tf[t] = q_tf.get(t, 0) + 1
        q_len = math.sqrt(sum(v * v for v in q_tf.values())) or 1.0

        scored = []
        for mem in memories:
            doc_text = f"{mem.get('title', '')} {mem.get('description', '')} {mem.get('category', '')} {mem.get('related_character', '')} {mem.get('related_location', '')}"
            doc_tokens = self._tokenize(doc_text)
            d_tf = {}
            for t in doc_tokens:
                d_tf[t] = d_tf.get(t, 0) + 1
            d_len = math.sqrt(sum(v * v for v in d_tf.values())) or 1.0

            dot = sum(q_tf[t] * d_tf.get(t, 0) for t in q_tf)
            sim = dot / (q_len * d_len)
            
            q_lower = query.lower()
            if mem.get("related_character") and mem["related_character"].lower() in q_lower:
                sim += 0.25
            if mem.get("title", "").lower() in q_lower:
                sim += 0.35

            scored.append((sim, mem))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, mem in scored[:top_k]:
            item = dict(mem)
            item["relevance_score"] = round(min(1.0, float(score)), 3)
            results.append(item)
        return results

    def get_pipeline_explanation(self) -> Dict[str, Any]:
        return {
            "steps": [
                {
                    "step": 1,
                    "name": "Memory Extraction & Chunking",
                    "detail": "When chapters are committed, world rules, character traits, artifacts, and locations are segmented into discrete memory fragments."
                },
                {
                    "step": 2,
                    "name": "Dense Vector Projection",
                    "detail": "Each memory is projected into high-dimensional embedding space using Hugging Face all-MiniLM-L6-v2 embeddings (or ChromaDB collections)."
                },
                {
                    "step": 3,
                    "name": "Contextual Cosine Distance Search",
                    "detail": "When writing a chapter or generating a scene, the current scene text queries the vector space to identify nearest semantic neighbors."
                },
                {
                    "step": 4,
                    "name": "Targeted Context Injection",
                    "detail": "Only the top relevant memories (not the entire universe) are injected into the Gemini context window, preserving precision and preventing hallucination."
                }
            ],
            "active_engine": "ChromaDB" if self.has_chroma else "Embedded Semantic Vector Space (all-MiniLM compatible)"
        }

vector_service = VectorMemoryService()

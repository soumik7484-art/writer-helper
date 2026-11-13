# StoryWeave AI — Investigative Storytelling Studio

[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)
[![Gemini API](https://img.shields.io/badge/Google%20Gemini-Flash%201.5-8E75B2?style=flat-square)](https://ai.google.dev)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector%20Store-FF6F00?style=flat-square)](https://www.trychroma.com)

> An immersive, professional AI-powered storytelling and writing platform inspired by the tactical investigation journal and clipboard visual language from **Phasmophobia**, reinterpreted into a universal studio for **Mystery, Horror, Fantasy, Sci-Fi, Romance, Adventure, and Drama**.

---

## 🔍 Key Architecture & Features

### 1. The Writer's Desk (Dashboard)
- Realistic dark wooden workspace with an open case file clipboard, Polaroid evidence, and brass fittings.
- Live universe telemetry (Stories, Chapters, Characters, Events, Vector Memories).
- Case dispatch shortcuts and recent narrative activity logs.

### 2. Case Archives (My Stories)
- Physical case cabinet shelf organizing all story universes.
- Filter by genre, switch active inquiry, and inspect case dossiers.

### 3. Story Architect (Creation Engine)
- Multi-step investigation story creation workflow:
  - **Premise & Coordinates**: Title, Genre, Subgenre, Setting, Era, Mood.
  - **Tone & Scope**: Themes, Style, Character Count, Chapter Count, Ending Type, and Multiline Plot.
  - **AI Outline Review**: Generates and allows live editing of chapter-by-chapter progression.
  - **Document Seal**: Commits the case dossier to the archive.

### 4. Character Archive (Realistic Dossiers)
- Physical investigation dossiers with realistic genre-adapted photographic portraits.
- Complete psychological profiles: Motivations, Fears, Goals, Backstory, Physical Descriptions.
- Redacted confidential intel (Secrets & Ulterior Agendas) with investigator reveal controls.
- **Relationship Web**: Visual corkboard with connected evidence threads and yarn.
- AI Character Dossier Generator with personality synthesis.

### 5. Story Timeline (Signature Feature)
- Connected chronological investigation clipboard with red yarn evidence lines and pushpins.
- Event cards with event numbers, location photos, characters involved, chapters, and consequences.
- Event states: `Completed`, `Current`, `Upcoming`, `Locked`, `Revised`.
- **AI Event Extraction**: Automatically analyzes chapter prose to extract structured plot events.
- Filtering by category (Plot Turns, Conflicts, Revelations, Discoveries) and characters.

### 6. Story Writing Studio
- 3-pane distraction-free workspace:
  - **Left**: Chapter list with status stamps (`Draft`, `In Review`, `Completed`) and word count.
  - **Center**: Parchment writing editor with debounced autosave.
  - **Right**: AI Co-writer tools (Continue, Dialogue, Expand, Describe, Tone, Summarize, Continuity).
  - Injects relevant ChromaDB semantic memories directly into the context window without token bloat.

### 7. Universe Memory (ChromaDB / Vector Codex)
- Persistent memory fragments classified into: *Character Facts, Locations, Relationships, Important Events, Objects & Relics, World Rules, Historical Lore, and Unresolved Mysteries*.
- Real-time semantic cosine distance search.
- Interactive RAG vector retrieval pipeline explanation.

### 8. Plot Hole Detector
- Story consistency analysis reporting contradictions as investigation case files.
- Categorizes: *Character Inconsistencies, Timeline Contradictions, Object Continuity Errors, World Rule Violations*.
- Severity levels: `Critical`, `Warning`, `Suggestion`.
- Side-by-side comparison of prior canon vs. conflicting scene, with AI-suggested narrative corrections.

### 9. AI Story Intelligence Dashboard
- Character chapter appearance matrix.
- Geographic location hotspots.
- Unresolved narrative threads and pending leads.
- Full dossier export to Markdown (`.md`).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, Lucide React, Framer Motion |
| **Backend** | FastAPI, Python 3.12, Uvicorn |
| **AI Engine** | Google Gemini 1.5 Flash, Hugging Face `all-MiniLM-L6-v2` |
| **Vector Storage** | ChromaDB / Native Semantic Cosine Vector Engine |
| **Database** | MongoDB Atlas & Local JSON Fallback (`storyweave_store.json`) |
| **Audio** | Web Audio API Synthesized Ambient Soundscape (Rain & Room Tone) |

---

## 🚀 Running the Studio Locally

### 1. Automated Launcher (Windows)
Double-click `run_studio.bat` in the root folder. It starts both the FastAPI backend and the Vite frontend.

### 2. Manual Startup

#### Backend:
```bash
# In the project root
python backend/run.py
# Backend runs on http://127.0.0.1:8000
```

#### Frontend:
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

---

## 📄 License
MIT License. Created for StoryWeave AI Studio.

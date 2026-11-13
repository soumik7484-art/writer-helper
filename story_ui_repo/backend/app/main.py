from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import stories, chapters, characters, timeline, memory, plotholes, ai
from .config import PORT, HOST

app = FastAPI(
    title="StoryWeave AI - Investigative Storytelling Studio API",
    version="1.0.0",
    description="Backend services for Phasmophobia-inspired storytelling, character dossiers, timeline evidence, and persistent vector memory."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stories.router)
app.include_router(chapters.router)
app.include_router(characters.router)
app.include_router(timeline.router)
app.include_router(memory.router)
app.include_router(plotholes.router)
app.include_router(ai.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "StoryWeave AI Backend",
        "aesthetic": "Phasmophobia Investigator Journal & Clipboard",
        "version": "1.0.0"
    }

@app.get("/api/health")
def healthcheck():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=HOST, port=PORT, reload=True)

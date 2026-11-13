import uvicorn
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if __name__ == "__main__":
    from backend.app.config import HOST, PORT
    print(f"Starting StoryWeave AI Backend on http://{HOST}:{PORT} ...")
    uvicorn.run("backend.app.main:app", host=HOST, port=PORT, reload=True)

@echo off
echo ===================================================================
echo     STORYWEAVE AI - INVESTIGATIVE STORYTELLING STUDIO
echo ===================================================================
echo.
echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "StoryWeave Backend" cmd /k "python backend/run.py"

echo Starting Vite React Frontend on http://localhost:5173 ...
start "StoryWeave Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Studio services dispatched. Open http://localhost:5173 in your browser.
echo ===================================================================
pause

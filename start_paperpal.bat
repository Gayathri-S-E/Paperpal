@echo off
echo ============================================================
echo           Starting PaperPal Full-Stack Application
echo ============================================================
echo.

echo [1/2] Starting PaperPal FastAPI Backend on http://127.0.0.1:8000 ...
start "PaperPal Backend" cmd /k "py -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo [2/2] Starting PaperPal Vite Frontend on http://localhost:5173 ...
cd frontend
start "PaperPal Frontend" cmd /k "npm run dev"

echo.
echo ============================================================
echo PaperPal is starting!
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo API Docs: http://127.0.0.1:8000/docs
echo ============================================================
pause

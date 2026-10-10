import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
PROCESSED_DIR = DATA_DIR / "processed"
SAMPLES_DIR = BASE_DIR / "backend" / "samples"

# Ensure runtime directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    app_name: str = "PaperPal API"
    app_version: str = "1.0.0"
    max_file_size_bytes: int = 25 * 1024 * 1024  # 25 MB
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "*"]
    default_ai_provider: str = os.getenv("AI_PROVIDER", "auto")

settings = Settings()

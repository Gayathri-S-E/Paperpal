import json
import shutil
from pathlib import Path
from typing import List, Optional, Dict, Any
from backend.config import UPLOAD_DIR, PROCESSED_DIR
from backend.models.document import DocumentInfo, PageInfo, DocumentStatus
from backend.models.explanation import DocumentAnalysisResponse

class StorageService:
    """Handles persistent filesystem storage for documents, metadata, page images, and analysis results."""

    @staticmethod
    def get_doc_dir(doc_id: str) -> Path:
        doc_dir = PROCESSED_DIR / doc_id
        doc_dir.mkdir(parents=True, exist_ok=True)
        return doc_dir

    @classmethod
    def save_document_info(cls, doc_info: DocumentInfo) -> None:
        doc_dir = cls.get_doc_dir(doc_info.id)
        info_path = doc_dir / "info.json"
        with open(info_path, "w", encoding="utf-8") as f:
            json.dump(doc_info.model_dump(), f, indent=2)

    @classmethod
    def get_document_info(cls, doc_id: str) -> Optional[DocumentInfo]:
        doc_dir = PROCESSED_DIR / doc_id
        info_path = doc_dir / "info.json"
        if not info_path.exists():
            return None
        with open(info_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return DocumentInfo(**data)

    @classmethod
    def list_documents(cls) -> List[DocumentInfo]:
        results: List[DocumentInfo] = []
        if not PROCESSED_DIR.exists():
            return results

        for doc_dir in sorted(PROCESSED_DIR.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
            if doc_dir.is_dir():
                info_path = doc_dir / "info.json"
                if info_path.exists():
                    try:
                        with open(info_path, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            results.append(DocumentInfo(**data))
                    except Exception as e:
                        print(f"Error reading doc {doc_dir.name}: {e}")
        return results

    @classmethod
    def save_pages_info(cls, doc_id: str, pages: List[PageInfo]) -> None:
        doc_dir = cls.get_doc_dir(doc_id)
        pages_path = doc_dir / "pages.json"
        with open(pages_path, "w", encoding="utf-8") as f:
            json.dump([p.model_dump() for p in pages], f, indent=2)

    @classmethod
    def get_pages_info(cls, doc_id: str) -> Optional[List[PageInfo]]:
        doc_dir = PROCESSED_DIR / doc_id
        pages_path = doc_dir / "pages.json"
        if not pages_path.exists():
            return None
        with open(pages_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [PageInfo(**item) for item in data]

    @classmethod
    def save_analysis(cls, doc_id: str, analysis: DocumentAnalysisResponse) -> None:
        doc_dir = cls.get_doc_dir(doc_id)
        analysis_path = doc_dir / "analysis.json"
        with open(analysis_path, "w", encoding="utf-8") as f:
            json.dump(analysis.model_dump(), f, indent=2)

    @classmethod
    def get_analysis(cls, doc_id: str) -> Optional[DocumentAnalysisResponse]:
        doc_dir = PROCESSED_DIR / doc_id
        analysis_path = doc_dir / "analysis.json"
        if not analysis_path.exists():
            return None
        with open(analysis_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return DocumentAnalysisResponse(**data)

    @classmethod
    def delete_document(cls, doc_id: str) -> bool:
        doc_dir = PROCESSED_DIR / doc_id
        if doc_dir.exists() and doc_dir.is_dir():
            shutil.rmtree(doc_dir, ignore_errors=True)
            return True
        return False

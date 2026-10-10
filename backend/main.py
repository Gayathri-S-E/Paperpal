import uuid
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.config import settings, UPLOAD_DIR, PROCESSED_DIR, SAMPLES_DIR
from backend.models.document import (
    DocumentInfo,
    DocumentStatus,
    PageInfo
)
from backend.models.explanation import DocumentAnalysisResponse
from backend.models.chat import ChatRequest, ChatResponse
from backend.services.ocr_engine import OCREngine
from backend.services.ai_engine import AIEngine
from backend.services.storage import StorageService
from backend.services.sample_docs import create_sample_pdfs

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_sample_pdfs()
    yield

app = FastAPI(
    title="PaperPal API",
    description="Real-time AI Document Understanding and Voice Assistant API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    gemini_active = False
    active_provider = "rule_based_nlp"
    model_name = None

    if settings.gemini_api_key:
        is_valid, resolved_model, err = await AIEngine.verify_gemini_model()
        if is_valid:
            gemini_active = True
            active_provider = "gemini"
            model_name = resolved_model
    elif settings.openai_api_key:
        active_provider = "openai"

    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
        "ai_provider_configured": gemini_active or bool(settings.openai_api_key),
        "active_provider": active_provider,
        "model_name": model_name
    }

@app.get("/api/documents", response_model=List[DocumentInfo])
def list_documents():
    """List recent processed documents."""
    return StorageService.list_documents()

@app.post("/api/documents", response_model=DocumentInfo)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None)
):
    """
    Upload and validate a document (PDF, PNG, JPEG, WebP).
    Extracts text, word/sentence coordinates, and prepares high-res page previews.
    """
    allowed_types = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"]
    content_type = file.content_type or ""
    filename = file.filename or "uploaded_document"
    ext = Path(filename).suffix.lower()

    if content_type not in allowed_types and ext not in [".pdf", ".png", ".jpg", ".jpeg", ".webp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {content_type}. Please upload a PDF or image (PNG/JPEG/WebP)."
        )

    # Read content and validate size
    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum allowed size is {settings.max_file_size_bytes // (1024*1024)}MB."
        )

    doc_id = f"doc_{uuid.uuid4().hex[:12]}"
    doc_dir = StorageService.get_doc_dir(doc_id)

    # Save raw file
    saved_file_path = doc_dir / f"original{ext}"
    with open(saved_file_path, "wb") as f:
        f.write(content)

    doc_info = DocumentInfo(
        id=doc_id,
        filename=filename,
        file_type="pdf" if ext == ".pdf" else "image",
        file_size_bytes=len(content),
        total_pages=0,
        status=DocumentStatus.PROCESSING,
        title=title or filename
    )
    StorageService.save_document_info(doc_info)

    # Process OCR and layout
    try:
        if ext == ".pdf":
            pages = OCREngine.process_pdf(saved_file_path, doc_dir)
        else:
            pages = OCREngine.process_image(saved_file_path, doc_dir)

        # Update URLs with actual doc_id
        for p in pages:
            p.image_url = f"/api/documents/{doc_id}/pages/{p.page_number}/image"

        doc_info.total_pages = len(pages)
        doc_info.status = DocumentStatus.READY
        StorageService.save_document_info(doc_info)
        StorageService.save_pages_info(doc_id, pages)

        # Automatically trigger AI analysis
        analysis = await AIEngine.analyze_document(doc_id, pages)
        StorageService.save_analysis(doc_id, analysis)

        return doc_info

    except Exception as e:
        doc_info.status = DocumentStatus.FAILED
        doc_info.error_message = f"Document processing failed: {str(e)}"
        StorageService.save_document_info(doc_info)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(e)}"
        )

@app.post("/api/documents/sample/{sample_name}", response_model=DocumentInfo)
async def load_sample_document(sample_name: str):
    """Loads one of the pre-configured realistic sample documents."""
    sample_files = {
        "utility_bill": ("sample_electricity_bill.pdf", "Electricity Billing Statement"),
        "lease_agreement": ("sample_residential_lease.pdf", "Residential Lease Agreement"),
        "bank_notice": ("sample_bank_overdue_notice.pdf", "Bank Overdue & Demand Notice")
    }

    if sample_name not in sample_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sample '{sample_name}' not found. Available samples: {list(sample_files.keys())}"
        )

    file_name, doc_title = sample_files[sample_name]
    sample_path = SAMPLES_DIR / file_name
    if not sample_path.exists():
        create_sample_pdfs()

    doc_id = f"sample_{sample_name}_{uuid.uuid4().hex[:6]}"
    doc_dir = StorageService.get_doc_dir(doc_id)

    # Copy sample to doc dir
    target_path = doc_dir / file_name
    shutil.copyfile(sample_path, target_path)

    doc_info = DocumentInfo(
        id=doc_id,
        filename=file_name,
        file_type="pdf",
        file_size_bytes=target_path.stat().st_size,
        total_pages=0,
        status=DocumentStatus.PROCESSING,
        is_sample=True,
        title=doc_title
    )
    StorageService.save_document_info(doc_info)

    # Process OCR
    pages = OCREngine.process_pdf(target_path, doc_dir)
    for p in pages:
        p.image_url = f"/api/documents/{doc_id}/pages/{p.page_number}/image"

    doc_info.total_pages = len(pages)
    doc_info.status = DocumentStatus.READY
    StorageService.save_document_info(doc_info)
    StorageService.save_pages_info(doc_id, pages)

    # Analyze
    analysis = await AIEngine.analyze_document(doc_id, pages)
    StorageService.save_analysis(doc_id, analysis)

    return doc_info

@app.get("/api/documents/{doc_id}", response_model=DocumentInfo)
def get_document(doc_id: str):
    """Retrieve document status and details."""
    doc_info = StorageService.get_document_info(doc_id)
    if not doc_info:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc_info

@app.get("/api/documents/{doc_id}/pages", response_model=List[PageInfo])
def get_document_pages(doc_id: str):
    """Retrieve all pages with extracted text, sentences, and bounding boxes."""
    pages = StorageService.get_pages_info(doc_id)
    if not pages:
        raise HTTPException(status_code=404, detail="Pages for document not found.")
    return pages

@app.get("/api/documents/{doc_id}/pages/{page_num}/image")
def get_page_image(doc_id: str, page_num: int):
    """Serve the rendered page image."""
    doc_dir = StorageService.get_doc_dir(doc_id)
    image_path = doc_dir / f"page_{page_num}.png"
    if not image_path.exists():
        raise HTTPException(status_code=404, detail=f"Page image {page_num} not found.")
    return FileResponse(str(image_path), media_type="image/png")

@app.post("/api/documents/{doc_id}/analyze", response_model=DocumentAnalysisResponse)
async def analyze_document(doc_id: str):
    """Analyze the document and return structured sentence explanations and summaries."""
    pages = StorageService.get_pages_info(doc_id)
    if not pages:
        raise HTTPException(status_code=404, detail="Document not found or not processed.")

    analysis = await AIEngine.analyze_document(doc_id, pages)
    StorageService.save_analysis(doc_id, analysis)
    return analysis

@app.get("/api/documents/{doc_id}/explanations", response_model=DocumentAnalysisResponse)
async def get_explanations(doc_id: str):
    """Retrieve saved explanations or trigger analysis if not yet computed."""
    analysis = StorageService.get_analysis(doc_id)
    if analysis:
        return analysis

    pages = StorageService.get_pages_info(doc_id)
    if not pages:
        raise HTTPException(status_code=404, detail="Document pages not found.")

    analysis = await AIEngine.analyze_document(doc_id, pages)
    StorageService.save_analysis(doc_id, analysis)
    return analysis

@app.post("/api/documents/{doc_id}/chat", response_model=ChatResponse)
async def chat_with_document(doc_id: str, request: ChatRequest):
    """Ask questions grounded in the extracted document text."""
    pages = StorageService.get_pages_info(doc_id)
    if not pages:
        raise HTTPException(status_code=404, detail="Document not found.")

    analysis = StorageService.get_analysis(doc_id)
    explanations = analysis.explanations if analysis else []

    return await AIEngine.answer_question(
        doc_id=doc_id,
        pages=pages,
        explanations=explanations,
        query=request.message,
        conversation_history=request.conversation_history
    )

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str):
    """Delete document data, page images, and metadata."""
    success = StorageService.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"message": "Document and all related files deleted successfully.", "id": doc_id}

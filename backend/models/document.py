from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum
import datetime

class BoundingBox(BaseModel):
    """Normalized bounding box coordinates relative to page width and height (0.0 to 1.0)."""
    x: float = Field(description="Normalized left coordinate (0.0 to 1.0)")
    y: float = Field(description="Normalized top coordinate (0.0 to 1.0)")
    width: float = Field(description="Normalized box width (0.0 to 1.0)")
    height: float = Field(description="Normalized box height (0.0 to 1.0)")

class TextSpan(BaseModel):
    """Low-level OCR word or line span."""
    text: str
    bbox: BoundingBox
    confidence: float = 1.0

class SentenceLocation(BaseModel):
    sentence_id: str
    page: int
    original_text: str
    bounding_boxes: List[BoundingBox] = []
    reading_order_index: int
    is_location_confident: bool = True

class PageInfo(BaseModel):
    page_number: int
    width_pts: float
    height_pts: float
    image_url: str
    text_content: str
    sentences: List[SentenceLocation] = []

class DocumentStatus(str, Enum):
    UPLOADING = "uploading"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"

class DocumentInfo(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size_bytes: int
    total_pages: int
    created_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    status: DocumentStatus = DocumentStatus.PROCESSING
    error_message: Optional[str] = None
    is_sample: bool = False
    title: Optional[str] = None

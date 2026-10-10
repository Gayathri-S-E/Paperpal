from typing import List, Optional
from pydantic import BaseModel, Field
from backend.models.document import BoundingBox

class GroundedCitation(BaseModel):
    page: int
    sentence_id: str
    original_text: str
    relevance_score: float = 1.0
    bounding_boxes: List[BoundingBox] = Field(default_factory=list)

class ChatMessage(BaseModel):
    role: str = Field(description="'user' or 'assistant'")
    content: str
    timestamp: Optional[str] = None
    citations: List[GroundedCitation] = Field(default_factory=list)

class ChatRequest(BaseModel):
    message: str
    conversation_history: List[ChatMessage] = Field(default_factory=list)

class ChatResponse(BaseModel):
    answer: str
    citations: List[GroundedCitation] = Field(default_factory=list)
    has_sufficient_info: bool = True
    suggested_followups: List[str] = Field(default_factory=list)
    ai_provider: str = "rule_based_nlp"

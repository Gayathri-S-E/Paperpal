from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum
from backend.models.document import BoundingBox

class ImportanceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class CategoryEnum(str, Enum):
    PAYMENT = "Payment"
    DEADLINE = "Deadline"
    OBLIGATION = "Obligation"
    FEE_OR_PENALTY = "Fee or penalty"
    ELIGIBILITY = "Eligibility"
    TERMINATION = "Termination"
    RENEWAL = "Renewal"
    DEPOSIT = "Deposit"
    IMPORTANT_CONDITION = "Important condition"
    GENERAL_INFORMATION = "General information"

class SentenceExplanation(BaseModel):
    sentence_id: str
    page: int
    original_text: str
    simple_explanation: str
    importance: ImportanceLevel = ImportanceLevel.MEDIUM
    category: CategoryEnum = CategoryEnum.GENERAL_INFORMATION
    mentioned_amounts: List[str] = Field(default_factory=list)
    mentioned_dates: List[str] = Field(default_factory=list)
    required_action: Optional[str] = None
    uncertainty_notes: Optional[str] = None
    bounding_boxes: List[BoundingBox] = Field(default_factory=list)
    is_location_confident: bool = True

class SummaryItem(BaseModel):
    title: str
    details: str
    source_page: int
    source_sentence_id: Optional[str] = None
    category: str
    importance: ImportanceLevel = ImportanceLevel.MEDIUM

class DocumentSummary(BaseModel):
    overview: str
    payment_amounts: List[SummaryItem] = Field(default_factory=list)
    due_dates_and_deadlines: List[SummaryItem] = Field(default_factory=list)
    required_actions: List[SummaryItem] = Field(default_factory=list)
    contractual_obligations: List[SummaryItem] = Field(default_factory=list)
    penalties_and_fees: List[SummaryItem] = Field(default_factory=list)
    conditions_and_exceptions: List[SummaryItem] = Field(default_factory=list)
    clauses_requiring_review: List[SummaryItem] = Field(default_factory=list)

class DocumentAnalysisResponse(BaseModel):
    document_id: str
    explanations: List[SentenceExplanation]
    summary: DocumentSummary
    total_important_sentences: int
    ai_provider: str = "rule_based_nlp"


import pytest
from backend.models.explanation import (
    SentenceExplanation,
    DocumentSummary,
    ImportanceLevel,
    CategoryEnum,
    DocumentAnalysisResponse
)
from backend.models.document import BoundingBox
from backend.services.ai_engine import AIEngine
from backend.models.document import PageInfo, SentenceLocation

def test_explanation_schema_validation():
    exp = SentenceExplanation(
        sentence_id="p1_s001",
        page=1,
        original_text="Tenant shall pay $2,000 monthly rent.",
        simple_explanation="You must pay $2,000 each month for rent.",
        importance=ImportanceLevel.HIGH,
        category=CategoryEnum.PAYMENT,
        mentioned_amounts=["$2,000"],
        mentioned_dates=[],
        bounding_boxes=[BoundingBox(x=0.1, y=0.2, width=0.5, height=0.05)]
    )
    assert exp.importance == ImportanceLevel.HIGH
    assert exp.category == CategoryEnum.PAYMENT
    assert exp.mentioned_amounts == ["$2,000"]
    assert exp.bounding_boxes[0].x == 0.1

def test_nlp_fallback_extraction():
    sentence1 = SentenceLocation(
        sentence_id="p1_s001",
        page=1,
        original_text="Payment of $350.00 must be received by November 15, 2026.",
        bounding_boxes=[BoundingBox(x=0.1, y=0.1, width=0.8, height=0.04)],
        reading_order_index=0
    )
    sentence2 = SentenceLocation(
        sentence_id="p1_s002",
        page=1,
        original_text="A late penalty fee of $25.00 shall be assessed on overdue accounts.",
        bounding_boxes=[BoundingBox(x=0.1, y=0.2, width=0.8, height=0.04)],
        reading_order_index=1
    )
    page = PageInfo(
        page_number=1,
        width_pts=600,
        height_pts=800,
        image_url="/api/pages/1/image",
        text_content="...",
        sentences=[sentence1, sentence2]
    )

    res = AIEngine._analyze_with_nlp_fallback("test_doc", [page], [sentence1, sentence2])
    assert len(res.explanations) == 2
    assert res.explanations[0].category in [CategoryEnum.PAYMENT, CategoryEnum.DEADLINE]
    assert "$350.00" in res.explanations[0].mentioned_amounts or "350.00" in str(res.explanations[0].mentioned_amounts)
    assert res.explanations[1].category == CategoryEnum.FEE_OR_PENALTY
    assert len(res.summary.payment_amounts) >= 1

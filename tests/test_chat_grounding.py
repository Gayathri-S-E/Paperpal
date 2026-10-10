import pytest
import pytest_asyncio
from backend.models.document import PageInfo, SentenceLocation, BoundingBox
from backend.models.explanation import SentenceExplanation, CategoryEnum, ImportanceLevel
from backend.services.ai_engine import AIEngine

@pytest.mark.asyncio
async def test_chat_grounded_answer():
    sentence = SentenceLocation(
        sentence_id="p1_s003",
        page=1,
        original_text="The security deposit of $1,500 must be deposited prior to key handover.",
        bounding_boxes=[BoundingBox(x=0.1, y=0.3, width=0.8, height=0.04)],
        reading_order_index=2
    )
    explanation = SentenceExplanation(
        sentence_id="p1_s003",
        page=1,
        original_text=sentence.original_text,
        simple_explanation="You need to pay the $1,500 security deposit before you get keys.",
        category=CategoryEnum.DEPOSIT,
        importance=ImportanceLevel.HIGH
    )
    page = PageInfo(
        page_number=1,
        width_pts=600,
        height_pts=800,
        image_url="",
        text_content=sentence.original_text,
        sentences=[sentence]
    )

    resp = await AIEngine.answer_question(
        doc_id="test_doc",
        pages=[page],
        explanations=[explanation],
        query="How much is the security deposit?"
    )

    assert resp.has_sufficient_info is True
    assert len(resp.citations) >= 1
    assert resp.citations[0].sentence_id == "p1_s003"
    assert "1,500" in resp.answer

@pytest.mark.asyncio
async def test_chat_ungrounded_answer():
    page = PageInfo(
        page_number=1,
        width_pts=600,
        height_pts=800,
        image_url="",
        text_content="Utility billing statement for electricity only.",
        sentences=[]
    )
    resp = await AIEngine.answer_question(
        doc_id="test_doc",
        pages=[page],
        explanations=[],
        query="Can I keep my pet alligator in the swimming pool?"
    )
    assert resp.has_sufficient_info is False

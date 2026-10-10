import pytest
import json
import httpx
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from backend.main import app
from backend.config import settings
from backend.services.ai_engine import AIEngine
from backend.models.document import PageInfo, SentenceLocation, BoundingBox

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_gemini_cache():
    AIEngine._cached_verified_model = None
    AIEngine._cached_verification_key = None
    yield
    AIEngine._cached_verified_model = None
    AIEngine._cached_verification_key = None

@pytest.fixture
def sample_page():
    sentence = SentenceLocation(
        sentence_id="p1_s001",
        page=1,
        original_text="Total amount due is $145.50 payable by November 15, 2026.",
        bounding_boxes=[BoundingBox(x=0.1, y=0.2, width=0.8, height=0.03)],
        reading_order_index=1
    )
    return PageInfo(
        page_number=1,
        width_pts=612.0,
        height_pts=792.0,
        image_url="",
        text_content=sentence.original_text,
        sentences=[sentence]
    )

@pytest.mark.asyncio
async def test_gemini_unavailable_credentials(sample_page):
    """When GEMINI_API_KEY is empty, system uses precision rule-based NLP."""
    with patch.object(settings, "gemini_api_key", ""):
        is_valid, model, err = await AIEngine.verify_gemini_model()
        assert is_valid is False
        assert "not configured" in (err or "").lower()

        analysis = await AIEngine.analyze_document("doc_test", [sample_page])
        assert analysis.ai_provider == "rule_based_nlp"
        assert len(analysis.explanations) > 0

        chat = await AIEngine.answer_question(
            "doc_test", [sample_page], analysis.explanations, "When is the due date?"
        )
        assert chat.ai_provider == "rule_based_nlp"
        assert chat.has_sufficient_info is True


@pytest.mark.asyncio
async def test_gemini_model_verification_success():
    """Verify Gemini model check succeeds when models endpoint returns available models."""
    mock_models_resp = {
        "models": [
            {
                "name": "models/gemini-1.5-flash",
                "supportedGenerationMethods": ["generateContent"]
            },
            {
                "name": "models/gemini-2.0-flash",
                "supportedGenerationMethods": ["generateContent"]
            }
        ]
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = mock_models_resp

    with patch.object(settings, "gemini_api_key", "test_mock_key"), \
         patch.object(settings, "gemini_model", "gemini-1.5-flash"), \
         patch("httpx.AsyncClient.get", return_value=mock_resp):
        
        is_valid, resolved_model, err = await AIEngine.verify_gemini_model()
        assert is_valid is True
        assert resolved_model == "gemini-1.5-flash"
        assert err is None


@pytest.mark.asyncio
async def test_gemini_model_verification_unauthorized():
    """Verify unauthorized status gracefully returns error without exposing key."""
    mock_resp = MagicMock()
    mock_resp.status_code = 403

    with patch.object(settings, "gemini_api_key", "test_mock_key_secret"), \
         patch("httpx.AsyncClient.get", return_value=mock_resp):
        
        is_valid, resolved_model, err = await AIEngine.verify_gemini_model()
        assert is_valid is False
        assert "403" in (err or "")
        assert "secret" not in (err or "")  # Never leak key


@pytest.mark.asyncio
async def test_gemini_valid_analysis_output(sample_page):
    """When Gemini returns valid structured JSON, explanations and bounding boxes are preserved."""
    gemini_output = {
        "explanations": [
            {
                "sentence_id": "p1_s001",
                "page": 1,
                "original_text": sample_page.sentences[0].original_text,
                "simple_explanation": "You must pay $145.50 by November 15, 2026 to avoid late fees.",
                "importance": "high",
                "category": "Payment",
                "mentioned_amounts": ["$145.50"],
                "mentioned_dates": ["November 15, 2026"],
                "required_action": "Submit payment of $145.50."
            }
        ],
        "summary": {
            "overview": "Electricity bill summary",
            "payment_amounts": [
                {
                    "title": "Current Amount Due",
                    "details": "$145.50",
                    "source_page": 1,
                    "category": "Payment",
                    "importance": "high"
                }
            ]
        }
    }

    mock_models = MagicMock(status_code=200)
    mock_models.json.return_value = {
        "models": [{"name": "models/gemini-1.5-flash", "supportedGenerationMethods": ["generateContent"]}]
    }

    mock_generate = MagicMock(status_code=200)
    mock_generate.json.return_value = {
        "candidates": [
            {"content": {"parts": [{"text": json.dumps(gemini_output)}]}}
        ]
    }

    with patch.object(settings, "gemini_api_key", "test_mock_key"), \
         patch("httpx.AsyncClient.get", return_value=mock_models), \
         patch("httpx.AsyncClient.post", return_value=mock_generate):

        analysis = await AIEngine.analyze_document("doc_test", [sample_page])
        assert analysis.ai_provider == "gemini"
        assert len(analysis.explanations) == 1
        exp = analysis.explanations[0]
        assert exp.sentence_id == "p1_s001"
        assert exp.page == 1
        assert len(exp.bounding_boxes) == 1
        assert "145.50" in exp.simple_explanation


@pytest.mark.asyncio
async def test_gemini_invalid_json_fallback(sample_page):
    """When Gemini returns invalid JSON, system falls back to rule-based NLP without crashing."""
    mock_models = MagicMock(status_code=200)
    mock_models.json.return_value = {
        "models": [{"name": "models/gemini-1.5-flash", "supportedGenerationMethods": ["generateContent"]}]
    }

    mock_generate = MagicMock(status_code=200)
    mock_generate.json.return_value = {
        "candidates": [
            {"content": {"parts": [{"text": "Sorry, I cannot produce valid JSON right now."}]}}
        ]
    }

    with patch.object(settings, "gemini_api_key", "test_mock_key"), \
         patch("httpx.AsyncClient.get", return_value=mock_models), \
         patch("httpx.AsyncClient.post", return_value=mock_generate):

        analysis = await AIEngine.analyze_document("doc_test", [sample_page])
        assert analysis.ai_provider == "rule_based_nlp"
        assert len(analysis.explanations) > 0


@pytest.mark.asyncio
async def test_gemini_rate_limit_or_http_error_fallback(sample_page):
    """When Gemini returns HTTP 429 or 500, system falls back to rule-based NLP."""
    mock_models = MagicMock(status_code=200)
    mock_models.json.return_value = {
        "models": [{"name": "models/gemini-1.5-flash", "supportedGenerationMethods": ["generateContent"]}]
    }

    mock_generate = MagicMock(status_code=429)
    mock_generate.text = "RESOURCE_EXHAUSTED"

    with patch.object(settings, "gemini_api_key", "test_mock_key"), \
         patch("httpx.AsyncClient.get", return_value=mock_models), \
         patch("httpx.AsyncClient.post", return_value=mock_generate):

        analysis = await AIEngine.analyze_document("doc_test", [sample_page])
        assert analysis.ai_provider == "rule_based_nlp"
        assert len(analysis.explanations) > 0


@pytest.mark.asyncio
async def test_gemini_grounded_qa_success(sample_page):
    """When Gemini answers grounded question, citations and provider are accurately preserved."""
    gemini_chat_output = {
        "answer": "The total amount due is $145.50 and the deadline is November 15, 2026.",
        "has_sufficient_info": True,
        "cited_sentence_ids": ["p1_s001"],
        "suggested_followups": ["What is the penalty for late payment?"]
    }

    mock_models = MagicMock(status_code=200)
    mock_models.json.return_value = {
        "models": [{"name": "models/gemini-1.5-flash", "supportedGenerationMethods": ["generateContent"]}]
    }

    mock_generate = MagicMock(status_code=200)
    mock_generate.json.return_value = {
        "candidates": [
            {"content": {"parts": [{"text": json.dumps(gemini_chat_output)}]}}
        ]
    }

    with patch.object(settings, "gemini_api_key", "test_mock_key"), \
         patch("httpx.AsyncClient.get", return_value=mock_models), \
         patch("httpx.AsyncClient.post", return_value=mock_generate):

        chat = await AIEngine.answer_question(
            "doc_test", [sample_page], [], "How much do I owe and when is it due?"
        )
        assert chat.ai_provider == "gemini"
        assert chat.has_sufficient_info is True
        assert len(chat.citations) == 1
        assert chat.citations[0].sentence_id == "p1_s001"
        assert chat.citations[0].page == 1
        assert len(chat.citations[0].bounding_boxes) == 1


@pytest.mark.asyncio
async def test_gemini_grounded_qa_insufficient_info(sample_page):
    """When question is ungrounded, Gemini reports has_sufficient_info=False without hallucinating."""
    gemini_chat_output = {
        "answer": "I searched the document, but could not find information addressing this specific question.",
        "has_sufficient_info": False,
        "cited_sentence_ids": [],
        "suggested_followups": ["What is the billing address?"]
    }

    mock_models = MagicMock(status_code=200)
    mock_models.json.return_value = {
        "models": [{"name": "models/gemini-1.5-flash", "supportedGenerationMethods": ["generateContent"]}]
    }

    mock_generate = MagicMock(status_code=200)
    mock_generate.json.return_value = {
        "candidates": [
            {"content": {"parts": [{"text": json.dumps(gemini_chat_output)}]}}
        ]
    }

    with patch.object(settings, "gemini_api_key", "test_mock_key"), \
         patch("httpx.AsyncClient.get", return_value=mock_models), \
         patch("httpx.AsyncClient.post", return_value=mock_generate):

        chat = await AIEngine.answer_question(
            "doc_test", [sample_page], [], "Can I pay using airline loyalty miles?"
        )
        assert chat.ai_provider == "gemini"
        assert chat.has_sufficient_info is False
        assert len(chat.citations) == 0


def test_health_check_endpoint():
    """Verify health endpoint reports correct active_provider without exposing keys."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "active_provider" in data
    assert "ai_provider_configured" in data
    assert "key" not in data  # Never expose key

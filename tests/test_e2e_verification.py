import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from backend.main import app
from backend.config import settings

client = TestClient(app)

def test_e2e_multi_page_pdf_workflow():
    # 1. Load multi-page sample: residential lease
    resp = client.post("/api/documents/sample/lease_agreement")
    assert resp.status_code == 200
    doc = resp.json()
    doc_id = doc["id"]
    assert doc["title"] == "Residential Lease Agreement"
    assert doc["total_pages"] >= 2, f"Expected at least 2 pages, got {doc['total_pages']}"

    # 2. Get pages and verify bounding box coordinates
    resp_pages = client.get(f"/api/documents/{doc_id}/pages")
    assert resp_pages.status_code == 200
    pages = resp_pages.json()
    assert len(pages) == doc["total_pages"]

    for p in pages:
        assert p["page_number"] in [1, 2]
        assert len(p["sentences"]) > 0
        assert len(p["text_content"]) > 50
        for s in p["sentences"]:
            assert s["page"] == p["page_number"]
            assert len(s["bounding_boxes"]) > 0
            for b in s["bounding_boxes"]:
                assert 0.0 <= b["x"] <= 1.0
                assert 0.0 <= b["y"] <= 1.0
                assert 0.0 < b["width"] <= 1.0
                assert 0.0 < b["height"] <= 1.0
                assert b["x"] + b["width"] <= 1.001
                assert b["y"] + b["height"] <= 1.001

    # 3. Verify page PNG image serving
    for p in pages:
        resp_img = client.get(f"/api/documents/{doc_id}/pages/{p['page_number']}/image")
        assert resp_img.status_code == 200
        assert resp_img.headers["content-type"] == "image/png"
        assert len(resp_img.content) > 2000

    # 4. Explanations retrieval
    resp_exp = client.get(f"/api/documents/{doc_id}/explanations")
    assert resp_exp.status_code == 200
    exp_data = resp_exp.json()
    exps = exp_data["explanations"]
    assert len(exps) > 0
    # Every explanation must link to a valid page and non-empty bounding box
    for e in exps:
        assert e["page"] in [1, 2]
        assert len(e["bounding_boxes"]) > 0
        assert len(e["simple_explanation"]) > 5

    # 5. Grounded Q&A
    resp_chat = client.post(
        f"/api/documents/{doc_id}/chat",
        json={"message": "What is the monthly rent and security deposit?"}
    )
    assert resp_chat.status_code == 200
    chat_data = resp_chat.json()
    assert chat_data["has_sufficient_info"] is True
    assert len(chat_data["citations"]) > 0
    assert any("2,200" in chat_data["answer"] or "rent" in chat_data["answer"].lower() for c in [1])

    # 6. Ungrounded Q&A (verify honest reporting, not hallucination)
    resp_ungrounded = client.post(
        f"/api/documents/{doc_id}/chat",
        json={"message": "What is the doctor's prescription and medical treatment?"}
    )
    assert resp_ungrounded.status_code == 200
    ungrounded_data = resp_ungrounded.json()
    assert ungrounded_data["has_sufficient_info"] is False
    assert len(ungrounded_data["citations"]) == 0
    assert "could not find information" in ungrounded_data["answer"]


def test_e2e_image_upload_workflow():
    # Create a synthetic PNG image fixture
    img = Image.new("RGB", (600, 800), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    files = {"file": ("test_invoice.png", buf, "image/png")}
    data = {"title": "Test Camera Scan"}

    resp = client.post("/api/documents", files=files, data=data)
    assert resp.status_code == 200
    doc = resp.json()
    doc_id = doc["id"]
    assert doc["file_type"] == "image"
    assert doc["total_pages"] == 1

    # Check pages
    resp_pages = client.get(f"/api/documents/{doc_id}/pages")
    assert resp_pages.status_code == 200
    pages = resp_pages.json()
    assert len(pages) == 1
    assert len(pages[0]["sentences"]) > 0

    # Clean up document
    del_resp = client.delete(f"/api/documents/{doc_id}")
    assert del_resp.status_code == 200

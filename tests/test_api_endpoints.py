import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_sample_document_load_and_flow():
    # 1. Load utility bill sample
    response = client.post("/api/documents/sample/utility_bill")
    assert response.status_code == 200
    doc_info = response.json()
    doc_id = doc_info["id"]
    assert doc_id.startswith("sample_utility_bill")
    assert doc_info["total_pages"] == 1
    assert doc_info["status"] == "ready"

    # 2. Get pages
    p_resp = client.get(f"/api/documents/{doc_id}/pages")
    assert p_resp.status_code == 200
    pages = p_resp.json()
    assert len(pages) == 1
    assert len(pages[0]["sentences"]) > 0

    # 3. Check page image
    img_resp = client.get(f"/api/documents/{doc_id}/pages/1/image")
    assert img_resp.status_code == 200
    assert img_resp.headers["content-type"] == "image/png"

    # 4. Get explanations
    exp_resp = client.get(f"/api/documents/{doc_id}/explanations")
    assert exp_resp.status_code == 200
    exp_data = exp_resp.json()
    assert len(exp_data["explanations"]) > 0
    assert "summary" in exp_data

    # 5. Ask question
    chat_resp = client.post(f"/api/documents/{doc_id}/chat", json={
        "message": "When is the payment due date?",
        "conversation_history": []
    })
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    assert len(chat_data["citations"]) > 0

    # 6. Delete document
    del_resp = client.delete(f"/api/documents/{doc_id}")
    assert del_resp.status_code == 200

    # Verify deleted
    get_del = client.get(f"/api/documents/{doc_id}")
    assert get_del.status_code == 404

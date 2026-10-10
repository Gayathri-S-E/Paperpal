import pytest
from pathlib import Path
import fitz
from backend.services.ocr_engine import OCREngine
from backend.models.document import BoundingBox

def test_aggregate_line_bounding_boxes():
    # Simulate words across 2 lines
    tokens = [
        # Line 1 (y around 100)
        {"word": "Payment", "x0": 50, "y0": 100, "x1": 100, "y1": 115},
        {"word": "must", "x0": 105, "y0": 100, "x1": 135, "y1": 115},
        {"word": "be", "x0": 140, "y0": 100, "x1": 155, "y1": 115},
        {"word": "received", "x0": 160, "y0": 100, "x1": 210, "y1": 115},
        # Line 2 (y around 125)
        {"word": "by", "x0": 50, "y0": 125, "x1": 65, "y1": 140},
        {"word": "October", "x0": 70, "y0": 125, "x1": 120, "y1": 140},
        {"word": "25th.", "x0": 125, "y0": 125, "x1": 160, "y1": 140},
    ]
    page_w = 600.0
    page_h = 800.0

    boxes = OCREngine._aggregate_line_bounding_boxes(tokens, page_w, page_h)
    assert len(boxes) == 2

    # Check coordinate bounds
    for box in boxes:
        assert 0.0 <= box.x <= 1.0
        assert 0.0 <= box.y <= 1.0
        assert 0.0 < box.width <= 1.0
        assert 0.0 < box.height <= 1.0
        assert box.x + box.width <= 1.05  # within margin

def test_pdf_ocr_processing(tmp_path):
    # Create test PDF
    pdf_path = tmp_path / "test.pdf"
    doc = fitz.open()
    p1 = doc.new_page(width=500, height=700)
    p1.insert_text((50, 100), "Hello world. This is sentence two with a $50 fee.", fontsize=12)
    doc.save(str(pdf_path))
    doc.close()

    out_dir = tmp_path / "out"
    out_dir.mkdir()

    pages = OCREngine.process_pdf(pdf_path, out_dir)
    assert len(pages) == 1
    assert (out_dir / "page_1.png").exists()
    assert len(pages[0].sentences) >= 1
    assert "Hello world." in pages[0].sentences[0].original_text

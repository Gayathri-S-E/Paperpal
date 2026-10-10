# PaperPal — Real-Time AI Document Voice Assistant

PaperPal is an intelligent document understanding and voice assistant that empowers users to comprehend dense, confusing documents—such as electricity bills, residential leases, bank demand notices, insurance policies, and legal letters.

## Key Features

1. **Document Ingestion & Multi-Format Support**
   - Upload PDF files or images (`PNG`, `JPEG`, `WebP`).
   - Integrated live webcam / mobile camera capture with instant capture preview.
   - Built-in realistic sample documents (Electricity Bill, Residential Lease, Bank Notice) ready to test in one click.

2. **Accurate OCR & Sentence Coordinate Mapping**
   - Renders crisp high-resolution page previews.
   - Computes normalized bounding boxes `[ymin, xmin, ymax, xmax]` for every sentence and token on each page.
   - Maps bounding boxes dynamically across zoom levels and pan transforms.

3. **Intelligent Explanation Engine**
   - Identifies key clauses, payment amounts, due dates, penalty fees, and obligations.
   - Advanced AI Architecture: Dual-mode engine combining built-in rule-based NLP extraction with advanced generative document intelligence when configured.

4. **Synchronized Voice Assistant & Visual Highlighting**
   - Natural speech synthesis via Web Speech API with customizable pitch, speech rate, and voice options.
   - Synchronized audio-visual playback: as an explanation is read aloud, the exact original sentence is highlighted with an animated focus halo on the document canvas.
   - Auto-scroll and auto-navigate to the active page and sentence coordinates.
   - Full playback controls: Play, Pause, Resume, Replay, Previous, Next, and Stop.

5. **Grounded Document Chat**
   - Ask arbitrary questions about the document in natural language.
   - Responses are strictly grounded in document content with citations and direct links to sentences.
   - Optional speech toggle reads assistant chat answers aloud.

6. **Accessibility & Design Excellence**
   - Polished dark/light modern interface with fluid layout, keyboard shortcuts, and responsive panels.
   - Zoom in/out, reset view, fit-to-width, and quick jumping between pages.

---

## Architecture

- **Backend**: FastAPI (Python 3.10+ / 3.13), PyMuPDF (`fitz`), Pillow, Pydantic v2, Pytest.
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS / Lucide Icons.
- **Speech**: HTML5 Web Speech Synthesis API.

---

## Getting Started

### Prerequisites
- Python 3.10+ (or Python launcher `py`)
- Node.js 18+ and `npm`

### 1. Setup Backend
```bash
# In the project root:
py -m pip install -r requirements.txt
```
Copy `.env.example` to `.env` and set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) if cloud AI intelligence is desired. PaperPal automatically falls back to precision rule-based NLP if unconfigured.

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run build
```

### 3. Launching Application

You can quickly start both servers using the launcher script:
```bash
start_paperpal.bat
```

Or run them individually:

**Backend:**
```bash
py -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

**Frontend:**
```bash
cd frontend
npm run dev
```
Open your browser to: [http://localhost:5173](http://localhost:5173)

---

## Running the Automated Test Suite

```bash
py -m pytest tests/ -v
```

The test suite covers:
- `test_ocr_mapping.py`: Validates sentence boundary extraction and coordinate normalization.
- `test_ai_validation.py`: Tests document analysis, structured summary parsing, and key entity extraction.
- `test_chat_grounding.py`: Tests grounded query answering and citation resolution.
- `test_api_endpoints.py`: Integration testing for document upload, sample document loading, and explanation retrieval.

---

## License
MIT License

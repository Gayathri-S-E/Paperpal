import os
import json
import re
from typing import List, Dict, Any, Optional, Tuple
import httpx
from backend.config import settings
from backend.models.document import SentenceLocation, PageInfo, BoundingBox
from backend.models.explanation import (
    SentenceExplanation,
    DocumentSummary,
    SummaryItem,
    ImportanceLevel,
    CategoryEnum,
    DocumentAnalysisResponse
)
from backend.models.chat import GroundedCitation, ChatResponse, ChatMessage

class AIEngine:
    """
    AI document analysis & voice explanation engine.
    Supports Google Gemini, OpenAI, and a reliable rule-based NLP fallback engine.
    """

    _cached_verified_model: Optional[str] = None
    _cached_verification_key: Optional[str] = None

    @classmethod
    async def verify_gemini_model(cls) -> Tuple[bool, str, Optional[str]]:
        """
        Verifies if GEMINI_API_KEY is valid and checks available models for the account.
        Resolves to a validated model name supporting generateContent.
        Never leaks or exposes the API key in returned messages.
        """
        if not settings.gemini_api_key:
            return False, settings.gemini_model, "GEMINI_API_KEY is not configured"

        if cls._cached_verification_key == settings.gemini_api_key and cls._cached_verified_model:
            return True, cls._cached_verified_model, None

        url = "https://generativelanguage.googleapis.com/v1beta/models"
        headers = {
            "x-goog-api-key": settings.gemini_api_key,
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code != 200:
                    cls._cached_verified_model = None
                    return False, settings.gemini_model, f"Gemini API authentication failed (HTTP {resp.status_code})"

                data = resp.json()
                raw_models = data.get("models", [])
                available_models = [
                    m["name"].replace("models/", "")
                    for m in raw_models
                    if "generateContent" in m.get("supportedGenerationMethods", [])
                ]

                target = settings.gemini_model.replace("models/", "")
                resolved = None
                if target in available_models:
                    resolved = target
                else:
                    # Check known standard models in available list
                    for candidate in ["gemini-3-flash-preview", "gemini-3.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"]:
                        if candidate in available_models:
                            resolved = candidate
                            break
                    if not resolved and available_models:
                        resolved = available_models[0]

                if resolved:
                    cls._cached_verified_model = resolved
                    cls._cached_verification_key = settings.gemini_api_key
                    return True, resolved, None
                else:
                    return False, settings.gemini_model, "No available models supporting generateContent found for account"

        except Exception as e:
            cls._cached_verified_model = None
            return False, settings.gemini_model, f"Failed to connect to Gemini API: {type(e).__name__}"

    @classmethod
    async def analyze_document(
        cls, 
        doc_id: str, 
        pages: List[PageInfo]
    ) -> DocumentAnalysisResponse:
        # Collect all extracted sentences from all pages
        all_sentences: List[SentenceLocation] = []
        for page in pages:
            all_sentences.extend(page.sentences)

        if not all_sentences:
            return DocumentAnalysisResponse(
                document_id=doc_id,
                explanations=[],
                summary=DocumentSummary(
                    overview="No readable text could be extracted from this document.",
                    payment_amounts=[],
                    due_dates_and_deadlines=[],
                    required_actions=[],
                    contractual_obligations=[],
                    penalties_and_fees=[],
                    conditions_and_exceptions=[],
                    clauses_requiring_review=[]
                ),
                total_important_sentences=0
            )

        # Attempt Gemini or OpenAI if API keys are configured
        if settings.gemini_api_key:
            try:
                res = await cls._analyze_with_gemini(doc_id, pages, all_sentences)
                if res and res.explanations:
                    return res
            except Exception as e:
                print(f"[AIEngine] Gemini analysis failed: {e}. Falling back to smart NLP engine.")

        if settings.openai_api_key:
            try:
                res = await cls._analyze_with_openai(doc_id, pages, all_sentences)
                if res and res.explanations:
                    return res
            except Exception as e:
                print(f"[AIEngine] OpenAI analysis failed: {e}. Falling back to smart NLP engine.")

        # Default / Offline / Zero-key fallback: Rule-based smart NLP analyzer
        return cls._analyze_with_nlp_fallback(doc_id, pages, all_sentences)

    @classmethod
    async def _analyze_with_gemini(
        cls, 
        doc_id: str, 
        pages: List[PageInfo], 
        all_sentences: List[SentenceLocation]
    ) -> Optional[DocumentAnalysisResponse]:
        """Calls Google Gemini API with JSON structured schema output."""
        is_valid, model_name, err = await cls.verify_gemini_model()
        if not is_valid:
            print(f"[AIEngine] Gemini model verification failed: {err}. Falling back to rule-based NLP.")
            return None

        sentences_payload = [
            {
                "sentence_id": s.sentence_id,
                "page": s.page,
                "text": s.original_text
            }
            for s in all_sentences
        ]

        prompt = f"""
You are PaperPal, an AI assistant that simplifies confusing documents (bills, rental agreements, insurance, official letters).
Analyze the following extracted sentences from a multi-page document:
{json.dumps(sentences_payload[:80], indent=2)}

For each sentence, provide:
1. "sentence_id": exact matching ID
2. "page": page number
3. "original_text": exact text
4. "simple_explanation": 1-2 clear, plain-language sentences explaining what this means to an everyday person.
5. "importance": "high", "medium", or "low"
6. "category": one of ["Payment", "Deadline", "Obligation", "Fee or penalty", "Eligibility", "Termination", "Renewal", "Deposit", "Important condition", "General information"]
7. "mentioned_amounts": list of strings (e.g. ["$150.00", "2.5%"])
8. "mentioned_dates": list of strings (e.g. ["October 15, 2026"])
9. "required_action": specific action required from the user, or null
10. "uncertainty_notes": note if terms are ambiguous or depend on unstated variables, or null

Also provide a "summary" object with:
- "overview": brief summary of the entire document
- "payment_amounts": list of items with title, details, source_page, source_sentence_id, category, importance
- "due_dates_and_deadlines": list of items
- "required_actions": list of items
- "contractual_obligations": list of items
- "penalties_and_fees": list of items
- "conditions_and_exceptions": list of items
- "clauses_requiring_review": list of items

Return ONLY valid JSON matching this schema:
{{
  "explanations": [...],
  "summary": {{...}}
}}
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        headers = {
            "x-goog-api-key": settings.gemini_api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code != 200:
                    print(f"[AIEngine] Gemini analysis returned HTTP {resp.status_code}. Falling back to rule-based NLP.")
                    return None

                data = resp.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    return None

                parts = candidates[0].get("content", {}).get("parts", [])
                if not parts:
                    return None

                raw_text = parts[0].get("text", "").strip()
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                raw_text = raw_text.strip()

                parsed = json.loads(raw_text)
                sentence_map = {s.sentence_id: s for s in all_sentences}
                explanations: List[SentenceExplanation] = []

                for item in parsed.get("explanations", []):
                    s_id = item.get("sentence_id")
                    src = sentence_map.get(s_id)
                    if not src and item.get("original_text"):
                        # Try matching by text if ID had subtle variation
                        t_norm = item.get("original_text", "").strip().lower()
                        for cand in all_sentences:
                            if cand.original_text.strip().lower() == t_norm:
                                src = cand
                                s_id = cand.sentence_id
                                break

                    if not src:
                        continue

                    # Safely normalize importance and category
                    raw_imp = str(item.get("importance", "medium")).lower()
                    importance = ImportanceLevel.HIGH if raw_imp == "high" else (ImportanceLevel.LOW if raw_imp == "low" else ImportanceLevel.MEDIUM)

                    cat_map = {c.value.lower(): c for c in CategoryEnum}
                    raw_cat = str(item.get("category", "")).lower()
                    category = cat_map.get(raw_cat, CategoryEnum.GENERAL_INFORMATION)

                    explanations.append(SentenceExplanation(
                        sentence_id=s_id,
                        page=src.page,
                        original_text=src.original_text,
                        simple_explanation=str(item.get("simple_explanation") or src.original_text),
                        importance=importance,
                        category=category,
                        mentioned_amounts=[str(a) for a in item.get("mentioned_amounts", []) if a],
                        mentioned_dates=[str(d) for d in item.get("mentioned_dates", []) if d],
                        required_action=item.get("required_action"),
                        uncertainty_notes=item.get("uncertainty_notes"),
                        bounding_boxes=src.bounding_boxes,
                        is_location_confident=src.is_location_confident
                    ))

                if not explanations:
                    return None

                # Safely parse summary items
                def parse_summary_items(raw_list):
                    result = []
                    if not isinstance(raw_list, list):
                        return result
                    for i in raw_list:
                        if not isinstance(i, dict):
                            continue
                        i_imp_raw = str(i.get("importance", "medium")).lower()
                        i_imp = ImportanceLevel.HIGH if i_imp_raw == "high" else (ImportanceLevel.LOW if i_imp_raw == "low" else ImportanceLevel.MEDIUM)
                        result.append(SummaryItem(
                            title=str(i.get("title") or i.get("name") or "Clause Summary"),
                            details=str(i.get("details") or i.get("description") or i.get("amount") or ""),
                            source_page=int(i.get("source_page") or i.get("page") or 1),
                            source_sentence_id=i.get("source_sentence_id") or i.get("sentence_id"),
                            category=str(i.get("category") or "General information"),
                            importance=i_imp
                        ))
                    return result

                raw_summary = parsed.get("summary", {}) if isinstance(parsed.get("summary"), dict) else {}
                summary = DocumentSummary(
                    overview=str(raw_summary.get("overview") or "Document Analysis Summary"),
                    payment_amounts=parse_summary_items(raw_summary.get("payment_amounts", [])),
                    due_dates_and_deadlines=parse_summary_items(raw_summary.get("due_dates_and_deadlines", [])),
                    required_actions=parse_summary_items(raw_summary.get("required_actions", [])),
                    contractual_obligations=parse_summary_items(raw_summary.get("contractual_obligations", [])),
                    penalties_and_fees=parse_summary_items(raw_summary.get("penalties_and_fees", [])),
                    conditions_and_exceptions=parse_summary_items(raw_summary.get("conditions_and_exceptions", [])),
                    clauses_requiring_review=parse_summary_items(raw_summary.get("clauses_requiring_review", []))
                )

                return DocumentAnalysisResponse(
                    document_id=doc_id,
                    explanations=explanations,
                    summary=summary,
                    total_important_sentences=len(explanations),
                    ai_provider="gemini"
                )
        except Exception as e:
            print(f"[AIEngine] Gemini analysis encountered {type(e).__name__}. Falling back to rule-based NLP.")
            return None

    @classmethod
    async def _analyze_with_openai(
        cls, 
        doc_id: str, 
        pages: List[PageInfo], 
        all_sentences: List[SentenceLocation]
    ) -> Optional[DocumentAnalysisResponse]:
        """Calls OpenAI API with JSON schema format."""
        sentences_payload = [
            {"sentence_id": s.sentence_id, "page": s.page, "text": s.original_text}
            for s in all_sentences[:80]
        ]
        prompt = f"""You are PaperPal document analyzer. Analyze the document sentences and return JSON with simple explanations and summary breakdown.
Sentences: {json.dumps(sentences_payload)}"""

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "You are a professional document analysis agent. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data["choices"][0]["message"]["content"]
                parsed = json.loads(raw_text)

                sentence_map = {s.sentence_id: s for s in all_sentences}
                explanations: List[SentenceExplanation] = []
                for item in parsed.get("explanations", []):
                    s_id = item.get("sentence_id")
                    src = sentence_map.get(s_id)
                    boxes = src.bounding_boxes if src else []
                    page_num = src.page if src else item.get("page", 1)
                    orig_text = src.original_text if src else item.get("original_text", "")
                    explanations.append(SentenceExplanation(
                        sentence_id=s_id,
                        page=page_num,
                        original_text=orig_text,
                        simple_explanation=item.get("simple_explanation", orig_text),
                        importance=item.get("importance", ImportanceLevel.MEDIUM),
                        category=item.get("category", CategoryEnum.GENERAL_INFORMATION),
                        mentioned_amounts=item.get("mentioned_amounts", []),
                        mentioned_dates=item.get("mentioned_dates", []),
                        required_action=item.get("required_action"),
                        uncertainty_notes=item.get("uncertainty_notes"),
                        bounding_boxes=boxes,
                        is_location_confident=src.is_location_confident if src else False
                    ))
                raw_summary = parsed.get("summary", {})
                summary = DocumentSummary(
                    overview=raw_summary.get("overview", "Document Analysis Summary"),
                    payment_amounts=[SummaryItem(**i) for i in raw_summary.get("payment_amounts", [])],
                    due_dates_and_deadlines=[SummaryItem(**i) for i in raw_summary.get("due_dates_and_deadlines", [])],
                    required_actions=[SummaryItem(**i) for i in raw_summary.get("required_actions", [])],
                    contractual_obligations=[SummaryItem(**i) for i in raw_summary.get("contractual_obligations", [])],
                    penalties_and_fees=[SummaryItem(**i) for i in raw_summary.get("penalties_and_fees", [])],
                    conditions_and_exceptions=[SummaryItem(**i) for i in raw_summary.get("conditions_and_exceptions", [])],
                    clauses_requiring_review=[SummaryItem(**i) for i in raw_summary.get("clauses_requiring_review", [])]
                )
                return DocumentAnalysisResponse(
                    document_id=doc_id,
                    explanations=explanations,
                    summary=summary,
                    total_important_sentences=len(explanations),
                    ai_provider="openai"
                )
        return None

    @classmethod
    def _analyze_with_nlp_fallback(
        cls, 
        doc_id: str, 
        pages: List[PageInfo], 
        all_sentences: List[SentenceLocation]
    ) -> DocumentAnalysisResponse:
        """
        High-precision rule-based document understanding and simplification engine.
        Identifies payment amounts, deadlines, obligations, penalties, and explains them.
        """
        explanations: List[SentenceExplanation] = []
        payment_items: List[SummaryItem] = []
        deadline_items: List[SummaryItem] = []
        action_items: List[SummaryItem] = []
        obligation_items: List[SummaryItem] = []
        penalty_items: List[SummaryItem] = []
        condition_items: List[SummaryItem] = []
        review_items: List[SummaryItem] = []

        # Regex patterns for entities and semantics
        amount_pattern = re.compile(r'(\$\s?\d+(?:,\d{3})*(?:\.\d{2})?|\b\d+(?:,\d{3})*(?:\.\d{2})?\s?(?:USD|EUR|GBP|dollars|cents|%))', re.IGNORECASE)
        date_pattern = re.compile(r'\b(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s+\d{4})?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\bby\s+\d{1,2}\s+[A-Za-z]+)\b', re.IGNORECASE)
        
        penalty_words = re.compile(r'\b(penalty|late fee|fine|interest|default|charge|forfeit|breach|remedy)\b', re.IGNORECASE)
        obligation_words = re.compile(r'\b(shall|must|required|agrees to|obligated|responsible for|strictly|prohibited|covenant)\b', re.IGNORECASE)
        deadline_words = re.compile(r'\b(due date|due by|deadline|no later than|on or before|within \d+ days|prior to|expires)\b', re.IGNORECASE)
        payment_words = re.compile(r'\b(pay|payment|amount due|balance|total|deposit|rent|invoice|billing|remit)\b', re.IGNORECASE)
        termination_words = re.compile(r'\b(terminate|termination|cancel|cancellation|notice period|vacate|end date)\b', re.IGNORECASE)
        condition_words = re.compile(r'\b(if|provided that|subject to|unless|in the event|conditioned upon)\b', re.IGNORECASE)

        for s in all_sentences:
            text = s.original_text.strip()
            if not text or len(text) < 5:
                continue

            amounts = amount_pattern.findall(text)
            dates = date_pattern.findall(text)

            # Categorize sentence
            category = CategoryEnum.GENERAL_INFORMATION
            importance = ImportanceLevel.LOW
            required_action = None
            uncertainty_notes = None

            if penalty_words.search(text):
                category = CategoryEnum.FEE_OR_PENALTY
                importance = ImportanceLevel.HIGH
            elif deadline_words.search(text):
                category = CategoryEnum.DEADLINE
                importance = ImportanceLevel.HIGH
            elif payment_words.search(text) and amounts:
                category = CategoryEnum.PAYMENT
                importance = ImportanceLevel.HIGH
            elif termination_words.search(text):
                category = CategoryEnum.TERMINATION
                importance = ImportanceLevel.HIGH
            elif obligation_words.search(text):
                category = CategoryEnum.OBLIGATION
                importance = ImportanceLevel.MEDIUM
            elif condition_words.search(text):
                category = CategoryEnum.IMPORTANT_CONDITION
                importance = ImportanceLevel.MEDIUM
            elif amounts or dates:
                category = CategoryEnum.PAYMENT if amounts else CategoryEnum.DEADLINE
                importance = ImportanceLevel.MEDIUM

            # Generate natural plain-language simplified explanation
            explanation = cls._simplify_text(text, category, amounts, dates)

            if category in [CategoryEnum.PAYMENT, CategoryEnum.DEADLINE, CategoryEnum.OBLIGATION]:
                if "must" in text.lower() or "shall" in text.lower() or "pay" in text.lower() or "submit" in text.lower():
                    required_action = f"Complete the stated obligation: {text[:60]}..."

            if "subject to" in text.lower() or "discretion" in text.lower() or "may vary" in text.lower():
                uncertainty_notes = "This condition may vary based on external factors or issuer discretion."

            sentence_exp = SentenceExplanation(
                sentence_id=s.sentence_id,
                page=s.page,
                original_text=text,
                simple_explanation=explanation,
                importance=importance,
                category=category,
                mentioned_amounts=amounts,
                mentioned_dates=dates,
                required_action=required_action,
                uncertainty_notes=uncertainty_notes,
                bounding_boxes=s.bounding_boxes,
                is_location_confident=s.is_location_confident
            )
            explanations.append(sentence_exp)

            # Populate summary buckets
            item = SummaryItem(
                title=f"{category.value}: {text[:50]}...",
                details=explanation,
                source_page=s.page,
                source_sentence_id=s.sentence_id,
                category=category.value,
                importance=importance
            )

            if category == CategoryEnum.PAYMENT or amounts:
                payment_items.append(item)
            if category == CategoryEnum.DEADLINE or dates:
                deadline_items.append(item)
            if required_action:
                action_items.append(item)
            if category == CategoryEnum.OBLIGATION:
                obligation_items.append(item)
            if category == CategoryEnum.FEE_OR_PENALTY:
                penalty_items.append(item)
            if category == CategoryEnum.IMPORTANT_CONDITION:
                condition_items.append(item)
            if uncertainty_notes or category == CategoryEnum.TERMINATION or importance == ImportanceLevel.HIGH:
                review_items.append(item)

        # Overview synthesis
        doc_type_hint = "document"
        first_few = " ".join([s.original_text for s in all_sentences[:5]]).lower()
        if "lease" in first_few or "tenant" in first_few or "landlord" in first_few:
            doc_type_hint = "Residential Lease Agreement"
        elif "bill" in first_few or "electric" in first_few or "utility" in first_few or "kwh" in first_few:
            doc_type_hint = "Utility/Electricity Bill"
        elif "bank" in first_few or "account" in first_few or "statement" in first_few or "overdue" in first_few:
            doc_type_hint = "Banking Notice/Statement"
        elif "insurance" in first_few or "policy" in first_few or "coverage" in first_few:
            doc_type_hint = "Insurance Policy Document"

        overview = f"This {doc_type_hint} contains {len(pages)} page(s) and {len(explanations)} analyzed clauses. Key obligations, payment details, and deadlines have been extracted with exact source locations."

        summary = DocumentSummary(
            overview=overview,
            payment_amounts=payment_items[:8],
            due_dates_and_deadlines=deadline_items[:8],
            required_actions=action_items[:8],
            contractual_obligations=obligation_items[:8],
            penalties_and_fees=penalty_items[:8],
            conditions_and_exceptions=condition_items[:8],
            clauses_requiring_review=review_items[:8]
        )

        return DocumentAnalysisResponse(
            document_id=doc_id,
            explanations=explanations,
            summary=summary,
            total_important_sentences=len(explanations),
            ai_provider="rule_based_nlp"
        )

    @staticmethod
    def _simplify_text(text: str, category: CategoryEnum, amounts: List[str], dates: List[str]) -> str:
        """Transforms formal/legalistic sentences into simple, human-friendly explanations."""
        t_clean = text.strip()

        # Simplify common legalese and formal phrases
        simplified = t_clean
        replacements = [
            (r'\bshall be obligated to\b', 'must'),
            (r'\bshall not\b', 'is not allowed to'),
            (r'\bshall\b', 'must'),
            (r'\bherein\b', 'in this document'),
            (r'\bhereunder\b', 'under this agreement'),
            (r'\bforthwith\b', 'immediately'),
            (r'\bin the event that\b', 'if'),
            (r'\bprior to\b', 'before'),
            (r'\bsubsequent to\b', 'after'),
            (r'\bcommence\b', 'start'),
            (r'\bterminate\b', 'end'),
            (r'\bremit\b', 'pay'),
            (r'\bpursuant to\b', 'according to'),
            (r'\bnotwithstanding\b', 'despite'),
            (r'\bthereof\b', 'of that'),
            (r'\bdeemed\b', 'considered'),
        ]
        for pattern, repl in replacements:
            simplified = re.sub(pattern, repl, simplified, flags=re.IGNORECASE)

        # Contextual prefix based on category
        if category == CategoryEnum.PAYMENT and amounts:
            return f"Payment requirement: {simplified}. (Amount: {', '.join(amounts)})"
        elif category == CategoryEnum.DEADLINE and dates:
            return f"Important Deadline: {simplified}. (Date: {', '.join(dates)})"
        elif category == CategoryEnum.FEE_OR_PENALTY:
            return f"Penalty Notice: Be aware that {simplified.lower()}."
        elif category == CategoryEnum.OBLIGATION:
            return f"Obligation: You are required to: {simplified}."
        elif category == CategoryEnum.TERMINATION:
            return f"Cancellation/End Term: Notice that {simplified}."
        
        return f"Plain English: {simplified}"

    @classmethod
    async def _answer_question_with_gemini(
        cls,
        doc_id: str,
        pages: List[PageInfo],
        all_sentences: List[SentenceLocation],
        query: str,
        conversation_history: List[ChatMessage] = []
    ) -> Optional[ChatResponse]:
        """
        Uses Google Gemini to answer questions strictly grounded in the extracted document text.
        Requires structured JSON output with citations referencing exact sentence IDs.
        """
        is_valid, model_name, err = await cls.verify_gemini_model()
        if not is_valid:
            return None

        # Build clean document text context
        doc_context_lines = []
        for s in all_sentences[:120]:
            doc_context_lines.append(f"[Page {s.page}, ID: {s.sentence_id}]: {s.original_text}")
        doc_context = "\n".join(doc_context_lines)

        history_str = ""
        if conversation_history:
            history_str = "\nPrior conversation:\n" + "\n".join([
                f"- {m.role}: {m.content}" for m in conversation_history[-4:]
            ])

        prompt = f"""You are PaperPal, an AI assistant answering questions about a document.
Answer the user's question STRICTLY and SOLELY using the extracted document text provided below.

EXTRACTED DOCUMENT TEXT:
{doc_context}
{history_str}

USER QUESTION:
"{query}"

RULES:
1. If the provided document contains the answer, explain it clearly in plain English.
2. In "cited_sentence_ids", list ONLY the exact sentence IDs (e.g. ["p1_s002"]) from the document that directly support your answer.
3. If the document DOES NOT contain sufficient information to answer the question, set "has_sufficient_info": false and answer: "I searched the document, but could not find information addressing this specific question." Do NOT speculate or invent facts.
4. Return ONLY valid JSON matching this schema:
{{
  "answer": "Plain English explanation",
  "has_sufficient_info": true,
  "cited_sentence_ids": ["p1_s001"],
  "suggested_followups": ["Question 1?", "Question 2?"]
}}
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        headers = {
            "x-goog-api-key": settings.gemini_api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code != 200:
                    print(f"[AIEngine] Gemini Q&A returned HTTP {resp.status_code}. Falling back to rule-based engine.")
                    return None

                data = resp.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    return None

                parts = candidates[0].get("content", {}).get("parts", [])
                if not parts:
                    return None

                raw_text = parts[0].get("text", "").strip()
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                raw_text = raw_text.strip()

                parsed = json.loads(raw_text)
                sentence_map = {s.sentence_id: s for s in all_sentences}

                citations: List[GroundedCitation] = []
                has_info = bool(parsed.get("has_sufficient_info", True))

                if has_info:
                    for s_id in parsed.get("cited_sentence_ids", []):
                        src = sentence_map.get(s_id)
                        if src:
                            citations.append(GroundedCitation(
                                page=src.page,
                                sentence_id=src.sentence_id,
                                original_text=src.original_text,
                                relevance_score=1.0,
                                bounding_boxes=src.bounding_boxes
                            ))

                return ChatResponse(
                    answer=parsed.get("answer", "Here is what I found in your document."),
                    citations=citations,
                    has_sufficient_info=has_info,
                    suggested_followups=parsed.get("suggested_followups", [
                        "What are the payment terms in this document?",
                        "Are there any penalties or deadlines mentioned?"
                    ]),
                    ai_provider="gemini"
                )
        except Exception as e:
            print(f"[AIEngine] Gemini Q&A error: {type(e).__name__}. Falling back to rule-based engine.")
            return None

    @classmethod
    async def answer_question(
        cls, 
        doc_id: str, 
        pages: List[PageInfo], 
        explanations: List[SentenceExplanation], 
        query: str,
        conversation_history: List[ChatMessage] = []
    ) -> ChatResponse:
        """
        Conversational grounded QA.
        Attempts Google Gemini first if configured, otherwise uses strict rule-based NLP grounding.
        """
        # Attempt Gemini Q&A if API key is configured
        if settings.gemini_api_key:
            try:
                all_sentences = [s for p in pages for s in p.sentences]
                gemini_res = await cls._answer_question_with_gemini(
                    doc_id=doc_id,
                    pages=pages,
                    all_sentences=all_sentences,
                    query=query,
                    conversation_history=conversation_history
                )
                if gemini_res:
                    return gemini_res
            except Exception as e:
                print(f"[AIEngine] Gemini grounded Q&A attempt failed: {type(e).__name__}. Falling back to rule-based engine.")

        # Fallback to precise rule-based grounding
        q_lower = query.lower()
        stopwords = {
            "what", "when", "where", "how", "who", "which", "why",
            "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
            "does", "do", "did", "have", "has", "had",
            "this", "that", "these", "those", "there",
            "in", "on", "at", "to", "for", "of", "with", "by", "from", "up", "about", "into", "over", "after",
            "and", "or", "but", "if", "not", "no", "can", "could", "should", "would",
            "my", "me", "i", "we", "you", "your", "it", "its", "they", "them", "their",
            "tell", "please", "say", "find", "show", "give", "much", "many", "any", "some"
        }
        q_words = set(re.findall(r'[a-zA-Z]{2,}', q_lower)) - stopwords

        if not q_words:
            return ChatResponse(
                answer="Could you please provide a more specific question? You can ask about payment terms, due dates, penalties, or rules mentioned in the document.",
                citations=[],
                has_sufficient_info=False,
                suggested_followups=[
                    "What are the payment terms in this document?",
                    "Are there any penalties or deadlines mentioned?",
                    "Can you summarize this document?"
                ],
                ai_provider="rule_based_nlp"
            )

        scored_sentences: List[Tuple[float, SentenceLocation, Optional[SentenceExplanation]]] = []
        exp_map = {e.sentence_id: e for e in explanations}

        for page in pages:
            for s in page.sentences:
                s_lower = s.original_text.lower()
                s_words = set(re.findall(r'[a-zA-Z]{2,}', s_lower))
                
                # Content word overlap
                overlap_words = q_words.intersection(s_words)
                overlap = len(overlap_words)
                if overlap == 0:
                    continue

                score = overlap / max(1, len(q_words))

                # Multi-character content term boost
                for w in overlap_words:
                    if len(w) >= 4:
                        score += 0.15

                # Semantic keywords boost
                for kw in ["pay", "payment", "due", "deposit", "cancel", "fee", "penalty", "date", "amount", "rent", "electric", "bill", "notice", "lease", "tenant", "landlord"]:
                    if kw in q_words and kw in s_words:
                        score += 0.25

                if score >= 0.25:
                    scored_sentences.append((score, s, exp_map.get(s.sentence_id)))

        # Sort by relevance
        scored_sentences.sort(key=lambda x: x[0], reverse=True)
        top_matches = scored_sentences[:3]

        if not top_matches or top_matches[0][0] < 0.25:
            return ChatResponse(
                answer="I searched the entire document, but I could not find information addressing this specific question. Please verify if the clause is mentioned in the document or rephrase your question.",
                citations=[],
                has_sufficient_info=False,
                suggested_followups=[
                    "What are the payment terms in this document?",
                    "Are there any penalties or deadlines mentioned?",
                    "Can you summarize this document?"
                ],
                ai_provider="rule_based_nlp"
            )

        # Build citations
        citations: List[GroundedCitation] = []
        for score, s, exp in top_matches:
            citations.append(GroundedCitation(
                page=s.page,
                sentence_id=s.sentence_id,
                original_text=s.original_text,
                relevance_score=round(score, 2),
                bounding_boxes=s.bounding_boxes
            ))

        # Build grounded answer
        best_sentence = top_matches[0][1]
        best_exp = top_matches[0][2]
        
        # Answer text
        best_text = best_sentence.original_text
        explanation_text = best_exp.simple_explanation if best_exp else best_text
        
        answer_parts = [
            f"According to **Page {best_sentence.page}** of your document:",
            f"> \"{best_text}\"",
            f"\nIn simple terms: {explanation_text}"
        ]

        if len(top_matches) > 1:
            second_match = top_matches[1][1]
            answer_parts.append(f"\nAdditionally, **Page {second_match.page}** states: \"{second_match.original_text}\"")

        # Generate intelligent follow-up suggestions
        suggested = [
            f"Explain more about the terms on Page {best_sentence.page}",
            "What happens if I miss a deadline?",
            "How much is the total amount due?"
        ]

        return ChatResponse(
            answer="\n\n".join(answer_parts),
            citations=citations,
            has_sufficient_info=True,
            suggested_followups=suggested,
            ai_provider="rule_based_nlp"
        )

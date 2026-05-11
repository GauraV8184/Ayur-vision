"""Rule-based Ayurvedic query parsing for embedding cleanup and Qdrant filters."""

import os
import re

from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict
from qdrant_client.models import FieldCondition, Filter, MatchAny, MatchValue

load_dotenv()

_SYNONYM_PHRASES: list[tuple[str, str]] = [
    ("wind dosha", "vata"),
    ("fire dosha", "pitta"),
    ("earth dosha", "kapha"),
    ("water dosha", "kapha"),
]

_SYNONYM_WORDS: list[tuple[str, str]] = [
    ("detox", "ama detoxification panchakarma"),
    ("immunity", "ojas immunity rasayana"),
    ("digestion", "agni digestion pachana"),
    ("stress", "stress ashwagandha brahmi vata"),
    ("inflammation", "inflammation pitta imbalance"),
    ("sleep", "sleep insomnia vata nidra"),
]

_CATEGORY_KEYWORDS: list[tuple[list[str], str]] = [
    (["herb", "plant", "botanical", "root", "leaf", "churna"], "herbology"),
    (["treat", "therapy", "remedy", "cure", "medicine"], "treatment"),
    (["symptom", "diagnos", "sign", "prognos"], "diagnosis"),
    (["diet", "food", "eat", "nutrition", "fasting"], "lifestyle"),
    (["philosophy", "principle", "theory", "concept", "sutra"], "philosophy"),
    (["anatomy", "organ", "tissue", "dhatu", "marma"], "anatomy"),
]


class QueryIntent(BaseModel):
    """Structured intent extracted from a raw Ayurvedic query."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    cleaned_query: str
    search_collections: list[str]
    qdrant_filter: Filter | None
    detected_doshas: list[str]
    detected_category: str | None


def _apply_synonym_expansion(query: str) -> str:
    """Apply case-insensitive phrase and word synonym expansion for embedding."""
    result = query
    for phrase, repl in sorted(_SYNONYM_PHRASES, key=lambda x: len(x[0]), reverse=True):
        result = re.sub(re.escape(phrase), repl, result, flags=re.IGNORECASE)
    for word, repl in _SYNONYM_WORDS:
        result = re.sub(rf"\b{re.escape(word)}\b", repl, result, flags=re.IGNORECASE)
    return result.strip()


def _detect_doshas(text: str) -> list[str]:
    """Return unique doshas mentioned in text (vata, pitta, kapha)."""
    lower = text.lower()
    found: list[str] = []
    for d in ("vata", "pitta", "kapha"):
        if d in lower and d not in found:
            found.append(d)
    return found


def _detect_category(lower: str) -> str | None:
    """Map keyword substrings to ayur_category; first matching group wins."""
    for keywords, category in _CATEGORY_KEYWORDS:
        for kw in keywords:
            if kw in lower:
                return category
    return None


def _resolve_collections() -> tuple[str, str]:
    """Load Qdrant collection names for books and articles from environment."""
    books = os.getenv("COLLECTION_BOOKS")
    articles = os.getenv("COLLECTION_ARTICLES")
    if not books or not articles:
        raise ValueError("COLLECTION_BOOKS and COLLECTION_ARTICLES must be set")
    return books, articles


def _route_collections(lower: str) -> list[str]:
    """Choose which collections to search based on query cues."""
    books, articles = _resolve_collections()
    if any(
        w in lower
        for w in ("book", "samhita", "hridayam", "nidana")
    ):
        return [books]
    if "article" in lower or "modern" in lower:
        return [articles]
    return [books, articles]


def _build_filter(
    detected_doshas: list[str], detected_category: str | None
) -> Filter | None:
    """Build a Qdrant Filter from detected doshas and category."""
    conditions: list[FieldCondition] = []
    if detected_doshas:
        conditions.append(
            FieldCondition(key="dosha_type", match=MatchAny(any=detected_doshas))
        )
    if detected_category is not None:
        conditions.append(
            FieldCondition(
                key="ayur_category", match=MatchValue(value=detected_category)
            )
        )
    if not conditions:
        return None
    return Filter(must=conditions)


def parse_query(query: str) -> QueryIntent:
    """Parse a raw query into cleaned text, collections, and optional Qdrant filter."""
    cleaned = _apply_synonym_expansion(query)
    combined = f"{query} {cleaned}"
    detected_doshas = _detect_doshas(combined)
    lower_clean = cleaned.lower()
    detected_category = _detect_category(lower_clean)
    search_collections = _route_collections(query.lower())
    qdrant_filter = _build_filter(detected_doshas, detected_category)
    return QueryIntent(
        cleaned_query=cleaned,
        search_collections=search_collections,
        qdrant_filter=qdrant_filter,
        detected_doshas=detected_doshas,
        detected_category=detected_category,
    )

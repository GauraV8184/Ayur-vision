"""Cross-encoder re-ranking for retrieved Ayurvedic passages."""

import logging
import os
import threading
from typing import Any

from dotenv import load_dotenv
from sentence_transformers import CrossEncoder

load_dotenv()

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_model: CrossEncoder | None = None


def _get_model() -> CrossEncoder:
    """Lazily load the cross-encoder under a module-level lock."""
    global _model
    with _lock:
        if _model is None:
            name = os.getenv("RERANKER_MODEL")
            if not name:
                raise ValueError("RERANKER_MODEL is not set in environment")
            _model = CrossEncoder(name)
        return _model


def rerank(query: str, passages: list[dict], top_n: int) -> list[dict]:
    """Re-score passages against the query and return the top_n by cross-encoder score."""
    if not passages:
        return []
    model = _get_model()
    pairs: list[list[str]] = [[query, str(p.get("text", ""))] for p in passages]
    try:
        scores = model.predict(pairs, show_progress_bar=False)
    except Exception as e:
        logger.exception("Cross-encoder predict failed: %s", e)
        return list(passages[:top_n])
    enriched: list[dict] = []
    for p, sc in zip(passages, scores, strict=True):
        row = dict(p)
        row["rerank_score"] = float(sc)
        enriched.append(row)
    enriched.sort(key=lambda x: x["rerank_score"], reverse=True)
    return enriched[:top_n]

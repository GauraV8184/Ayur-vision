"""Vector search and cross-encoder re-ranking for Ayurvedic RAG."""

import logging
import os
from typing import Any

from dotenv import load_dotenv
from pydantic import BaseModel
from qdrant_client.models import Filter

from config.vectordb import get_client
from utils.embeddings import encode_query
from utils.query_parser import parse_query
from utils.reranker import rerank

load_dotenv()

logger = logging.getLogger(__name__)


class RetrievedChunk(BaseModel):
    """One retrieved passage after search and optional re-ranking."""

    text: str
    document_title: str
    source_type: str
    page_number: int | None
    chunk_index: int
    ayur_category: str
    dosha_type: list[str]
    herbs_mentioned: list[str]
    diseases_mentioned: list[str]
    body_system: str
    score: float
    rerank_score: float


class RetrievalOutcome(BaseModel):
    """Retrieval result with pre/post re-rank counts for observability."""

    chunks: list[RetrievedChunk]
    chunks_retrieved_before_rerank: int


def _int_from_env(key: str, default: int) -> int:
    """Parse a non-negative int from environment or return default."""
    raw = os.getenv(key)
    if raw is None or raw == "":
        return default
    try:
        return max(0, int(raw))
    except ValueError:
        return default


def _resolve_effective_filter(
    intent_filter: Filter | None, filter_override: dict | None
) -> Filter | None:
    """Pick Qdrant filter from override or parsed intent."""
    if filter_override is not None:
        try:
            return Filter.model_validate(filter_override)
        except Exception as e:
            logger.exception("Invalid filter_override, ignoring: %s", e)
            return None
    return intent_filter


def _resolve_collections(
    source_type_override: str | None, intent_collections: list[str]
) -> list[str]:
    """Resolve target collection names from override or parsed intent."""
    if source_type_override is None:
        return intent_collections
    st = source_type_override.strip().lower()
    if st == "book":
        name = os.getenv("COLLECTION_BOOKS")
        return [name] if name else []
    if st == "article":
        name = os.getenv("COLLECTION_ARTICLES")
        return [name] if name else []
    return intent_collections


def _all_configured_collections() -> list[str]:
    """Return unique non-empty COLLECTION_BOOKS and COLLECTION_ARTICLES names."""
    out: list[str] = []
    for key in ("COLLECTION_BOOKS", "COLLECTION_ARTICLES"):
        name = os.getenv(key)
        if name and name not in out:
            out.append(name)
    return out


def _search_collections_once(
    client: Any,
    collections: list[str],
    query_vector: list[float],
    query_filter: Filter | None,
    top_k: int,
) -> list[Any]:
    """Query each collection once with the given filter and merge by score."""
    merged: list[Any] = []
    for col in collections:
        if not col:
            continue
        try:
            qr = client.query_points(
                collection_name=col,
                query=query_vector,
                query_filter=query_filter,
                limit=top_k,
                with_payload=True,
            )
            merged.extend(qr.points or [])
        except Exception as e:
            logger.exception("Qdrant query_points failed for collection %s: %s", col, e)
    merged.sort(
        key=lambda h: float(getattr(h, "score", None) or 0.0), reverse=True
    )
    return merged


def _search_all_collections(
    client: Any,
    collections: list[str],
    query_vector: list[float],
    effective_filter: Filter | None,
    top_k: int,
) -> list[Any]:
    """Run Qdrant vector search; relax filter, then widen collections if still empty."""
    merged = _search_collections_once(
        client, collections, query_vector, effective_filter, top_k
    )
    if not merged and effective_filter is not None:
        logger.warning(
            "Vector search returned no hits with metadata filter; retrying without filter."
        )
        merged = _search_collections_once(
            client, collections, query_vector, None, top_k
        )
    if not merged:
        all_cols = _all_configured_collections()
        routed = {c for c in collections if c}
        if set(all_cols) != routed:
            logger.warning(
                "No hits in routed collections %s; searching all collections %s.",
                list(routed),
                all_cols,
            )
            merged = _search_collections_once(
                client, all_cols, query_vector, None, top_k
            )
    return merged


def _payload_to_dict(payload: Any) -> dict:
    """Normalize Qdrant payload to a plain dict."""
    if payload is None:
        return {}
    if isinstance(payload, dict):
        return dict(payload)
    if hasattr(payload, "model_dump"):
        return payload.model_dump()
    return dict(payload)


def _hits_to_payload_rows(merged_hits: list[Any]) -> list[dict]:
    """Convert scored points to dicts for the reranker."""
    rows: list[dict] = []
    for h in merged_hits:
        pl = _payload_to_dict(getattr(h, "payload", None))
        pl["text"] = str(pl.get("text", ""))
        pl["score"] = float(getattr(h, "score", None) or 0.0)
        rows.append(pl)
    return rows


def _row_to_retrieved_chunk(row: dict) -> RetrievedChunk:
    """Map a reranked payload row to RetrievedChunk with safe defaults."""
    return RetrievedChunk(
        text=str(row.get("text", "")),
        document_title=str(row.get("document_title", "")),
        source_type=str(row.get("source_type", "")),
        page_number=row.get("page_number"),
        chunk_index=int(row.get("chunk_index", 0)),
        ayur_category=str(row.get("ayur_category", "general")),
        dosha_type=list(row.get("dosha_type") or []),
        herbs_mentioned=list(row.get("herbs_mentioned") or []),
        diseases_mentioned=list(row.get("diseases_mentioned") or []),
        body_system=str(row.get("body_system", "general")),
        score=float(row.get("score", 0.0)),
        rerank_score=float(row.get("rerank_score", 0.0)),
    )


async def retrieve(
    query: str,
    top_k: int | None = None,
    top_n: int | None = None,
    filter_override: dict | None = None,
    source_type_override: str | None = None,
) -> RetrievalOutcome:
    """Search Qdrant with optional filters, then cross-encode re-rank to top passages."""
    import asyncio

    intent = parse_query(query)
    eff_top_k = max(
        1, top_k if top_k is not None else _int_from_env("RETRIEVAL_TOP_K", 20)
    )
    eff_top_n = max(
        1, top_n if top_n is not None else _int_from_env("RERANK_TOP_N", 5)
    )
    effective_filter = _resolve_effective_filter(intent.qdrant_filter, filter_override)
    collections = _resolve_collections(source_type_override, intent.search_collections)
    collections = [c for c in collections if c]

    query_vector = await asyncio.to_thread(encode_query, intent.cleaned_query)
    client = get_client()
    merged_hits = await asyncio.to_thread(
        _search_all_collections,
        client,
        collections,
        query_vector,
        effective_filter,
        eff_top_k,
    )
    pre_count = len(merged_hits)
    payload_list = _hits_to_payload_rows(merged_hits)
    reranked = await asyncio.to_thread(rerank, query, payload_list, eff_top_n)
    chunks = [_row_to_retrieved_chunk(r) for r in reranked]
    return RetrievalOutcome(
        chunks=chunks, chunks_retrieved_before_rerank=pre_count
    )

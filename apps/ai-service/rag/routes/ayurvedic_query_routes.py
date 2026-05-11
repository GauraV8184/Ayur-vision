"""FastAPI routes for Ayurvedic RAG query, retrieval, and generation."""

import logging
import os
from typing import Any

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

from services.ayurvedic_generation import Citation, OllamaUnavailableError, generate_answer
from services.ayurvedic_retrieval import RetrievedChunk, retrieve
from utils.query_parser import QueryIntent, parse_query

load_dotenv()

logger = logging.getLogger(__name__)

# Replace with Redis for production multi-instance deployments.
_sessions: dict[str, list[dict]] = {}

router = APIRouter(prefix="/api/v1", tags=["query"])


def _session_message_cap() -> int:
    """Max messages to retain per session (user + model pairs)."""
    raw = os.getenv("CONVERSATION_MEMORY_TURNS")
    if raw is None or raw == "":
        turns = 6
    else:
        try:
            turns = max(1, int(raw))
        except ValueError:
            turns = 6
    return turns * 2


class QueryRequest(BaseModel):
    """Full RAG query with optional conversational session."""

    query: str = Field(..., min_length=3)
    top_k: int | None = None
    top_n: int | None = None
    source_type_override: str | None = None
    use_conversation: bool = False
    session_id: str | None = None
    # Runtime patient/chart context from Express (never embedded in vector DB).
    clinical_context: str | None = None

    @model_validator(mode="after")
    def session_required_with_conversation(self) -> "QueryRequest":
        """Require session_id when multi-turn conversation is enabled."""
        if self.use_conversation and not self.session_id:
            raise ValueError("session_id is required when use_conversation is True")
        return self


class QueryResponse(BaseModel):
    """Answer plus retrieval metadata and citations."""

    query: str
    cleaned_query: str
    answer: str
    citations: list[Citation]
    chunks_retrieved: int
    chunks_after_rerank: int
    tokens_used: int | None
    model_used: str
    session_id: str | None


class SearchOnlyRequest(BaseModel):
    """Retrieve and re-rank without calling the LLM."""

    query: str = Field(..., min_length=3)
    top_k: int | None = None
    top_n: int | None = None
    source_type_override: str | None = None


class SearchOnlyResponse(BaseModel):
    """Debug-style retrieval output."""

    query: str
    cleaned_query: str
    results: list[RetrievedChunk]


def _intent_to_jsonable(intent: QueryIntent) -> dict[str, Any]:
    """Serialize QueryIntent including Qdrant Filter for JSON responses."""
    data: dict[str, Any] = {
        "cleaned_query": intent.cleaned_query,
        "search_collections": intent.search_collections,
        "detected_doshas": intent.detected_doshas,
        "detected_category": intent.detected_category,
        "qdrant_filter": None,
    }
    if intent.qdrant_filter is not None:
        data["qdrant_filter"] = intent.qdrant_filter.model_dump(
            exclude_none=True, mode="python"
        )
    return data


@router.post("/query", response_model=QueryResponse)
async def rag_query(request: QueryRequest) -> QueryResponse:
    """Run retrieval + LLM generation; optionally maintain session history."""
    try:
        intent = parse_query(request.query)
        effective_top_n = (
            request.top_n
            if (request.top_n is not None and request.top_n > 0)
            else None
        )
        outcome = await retrieve(
            query=request.query,
            top_k=request.top_k,
            top_n=effective_top_n,
            source_type_override=request.source_type_override,
        )
        if not outcome.chunks:
            raise HTTPException(
                status_code=404, detail="No relevant Ayurvedic passages found."
            )
        history = None
        if request.use_conversation and request.session_id:
            history = _sessions.get(request.session_id)
        result = await generate_answer(
            request.query,
            outcome.chunks,
            history,
            clinical_context=request.clinical_context,
        )
        if request.use_conversation and request.session_id:
            sid = request.session_id
            hist = _sessions.get(sid, [])
            hist.append({"role": "user", "parts": [request.query]})
            hist.append({"role": "model", "parts": [result.answer]})
            cap = _session_message_cap()
            _sessions[sid] = hist[-cap:]
        return QueryResponse(
            query=request.query,
            cleaned_query=intent.cleaned_query,
            answer=result.answer,
            citations=result.citations,
            chunks_retrieved=outcome.chunks_retrieved_before_rerank,
            chunks_after_rerank=len(outcome.chunks),
            tokens_used=result.tokens_used,
            model_used=result.model_used,
            session_id=request.session_id,
        )
    except HTTPException:
        raise
    except OllamaUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        logger.exception("POST /query failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/query/search-only", response_model=SearchOnlyResponse)
async def rag_search_only(request: SearchOnlyRequest) -> SearchOnlyResponse:
    """Return re-ranked chunks without LLM generation."""
    try:
        intent = parse_query(request.query)
        outcome = await retrieve(
            query=request.query,
            top_k=request.top_k,
            top_n=request.top_n,
            source_type_override=request.source_type_override,
        )
        return SearchOnlyResponse(
            query=request.query,
            cleaned_query=intent.cleaned_query,
            results=outcome.chunks,
        )
    except Exception as e:
        logger.exception("POST /query/search-only failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.delete("/query/session/{session_id}")
async def delete_session(session_id: str) -> dict[str, str]:
    """Clear in-memory conversation state for a session id."""
    if session_id in _sessions:
        del _sessions[session_id]
        return {"deleted": session_id, "status": "ok"}
    return {"deleted": session_id, "status": "not_found"}


@router.get("/query/parse")
async def parse_debug(q: str) -> dict[str, Any]:
    """Inspect rule-based query parsing (filters, collection routing, expansion)."""
    intent = parse_query(q)
    return _intent_to_jsonable(intent)

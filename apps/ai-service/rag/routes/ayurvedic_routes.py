"""FastAPI routes for Ayurvedic document ingestion."""

import asyncio
import logging
import os
from typing import Any

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config.vectordb import get_client
from services.ayurvedic_ingest import ingest_document

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["ingestion"])


def _discover_files(directory_path: str, extensions: list[str]) -> list[str]:
    """Collect file paths under directory_path matching any of the extensions."""
    paths: list[str] = []
    for root, _dirs, files in os.walk(directory_path):
        for fn in files:
            if any(fn.endswith(ext) for ext in extensions):
                paths.append(os.path.join(root, fn))
    return paths


class IngestFileRequest(BaseModel):
    """Request body for single-file ingestion."""

    file_path: str
    use_llm_tagging: bool = True


class IngestDirectoryRequest(BaseModel):
    """Request body for directory ingestion."""

    directory_path: str
    use_llm_tagging: bool = False
    file_extensions: list[str] = Field(default_factory=lambda: [".pdf", ".txt"])


class IngestResponse(BaseModel):
    """Standard response shape for a completed ingest."""

    file: str
    source_type: str
    collection: str
    chunks_ingested: int
    status: str = "success"


@router.post("/ingest/file", response_model=IngestResponse)
async def ingest_file(req: IngestFileRequest) -> IngestResponse:
    """Ingest a single document from disk into the appropriate Qdrant collection."""
    try:
        result = await ingest_document(req.file_path, req.use_llm_tagging)
        return IngestResponse(**result, status="success")
    except Exception as e:
        logger.exception("ingest/file failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/ingest/directory")
async def ingest_directory(req: IngestDirectoryRequest) -> dict[str, Any]:
    """Ingest all matching files under a directory with bounded concurrency."""
    sem = asyncio.Semaphore(4)

    async def run_one(path: str) -> IngestResponse:
        """Ingest one path under the shared semaphore."""
        async with sem:
            data = await ingest_document(path, req.use_llm_tagging)
            return IngestResponse(**data, status="success")

    paths = await asyncio.to_thread(
        _discover_files, req.directory_path, req.file_extensions
    )

    try:
        results = await asyncio.gather(*(run_one(p) for p in paths))
    except Exception as e:
        logger.exception("ingest/directory failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e

    total_chunks = sum(r.chunks_ingested for r in results)
    return {
        "total_files": len(results),
        "total_chunks": total_chunks,
        "results": results,
    }


@router.get("/ingest/status")
async def ingest_status() -> dict[str, Any]:
    """Return point counts for configured Qdrant collections."""
    books = os.getenv("COLLECTION_BOOKS")
    articles = os.getenv("COLLECTION_ARTICLES")
    if not books or not articles:
        raise HTTPException(
            status_code=500,
            detail="COLLECTION_BOOKS or COLLECTION_ARTICLES not set",
        )
    client = get_client()
    out: list[dict[str, Any]] = []

    def _fetch_counts(names: tuple[str, ...]) -> list[dict[str, Any]]:
        """Read collection point counts from Qdrant."""
        rows: list[dict[str, Any]] = []
        for name in names:
            info = client.get_collection(name)
            rows.append({"name": name, "vector_count": info.points_count})
        return rows

    try:
        out = await asyncio.to_thread(_fetch_counts, (books, articles))
    except Exception as e:
        logger.exception("ingest/status failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e
    return {"collections": out}

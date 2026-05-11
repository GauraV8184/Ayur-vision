"""Orchestrates end-to-end ingest of one Ayurvedic document into Qdrant."""

import asyncio
import logging
import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from qdrant_client.models import PointStruct
from tqdm import tqdm

from config.vectordb import get_client
from utils.chunker import chunk_page, chunk_text
from utils.embeddings import encode_chunks
from utils.metadata_tagger import tag_chunk
from utils.pdf_loader import load_pdf, load_text_file

load_dotenv()

logger = logging.getLogger(__name__)


def _resolve_dataset_path(rel_or_abs: str) -> Path:
    """Resolve a dataset directory path against the current working directory."""
    p = Path(rel_or_abs)
    if p.is_absolute():
        return p.resolve()
    return (Path.cwd() / p).resolve()


def _is_book_source(file_path: str) -> bool:
    """Return True if the file should be treated as a book (PDF or under books dir)."""
    fp = Path(file_path).resolve()
    if fp.suffix.lower() == ".pdf":
        return True
    books_dir = os.getenv("DATASET_BOOKS_DIR")
    if not books_dir:
        return False
    base = _resolve_dataset_path(books_dir)
    try:
        fp.relative_to(base)
        return True
    except ValueError:
        return False


def _prepare_chunks(file_path: str) -> tuple[str, list[dict]]:
    """Load document, chunk it, and return (source_type, flat chunk list)."""
    source_type = "book" if _is_book_source(file_path) else "article"
    all_chunks: list[dict] = []
    if source_type == "book":
        pages = load_pdf(file_path)
        for page in pages:
            all_chunks.extend(chunk_page(page))
    else:
        doc = load_text_file(file_path)
        meta = {
            "file_name": doc["file_name"],
            "document_title": doc["document_title"],
        }
        all_chunks.extend(chunk_text(doc["text"], meta))
    return source_type, all_chunks


def _tag_all_chunks(
    chunks: list[dict], source_type: str, use_llm_tagging: bool
) -> list[dict]:
    """Apply tagging to every chunk with a progress bar."""
    tagged: list[dict] = []
    for raw in tqdm(chunks, desc="Tagging chunks"):
        c = dict(raw)
        tag_chunk(c, source_type, use_llm=use_llm_tagging)
        tagged.append(c)
    return tagged


def _build_points(encoded: list[dict]) -> list[PointStruct]:
    """Build Qdrant points from encoded chunks (vector separate from payload)."""
    points: list[PointStruct] = []
    for ch in encoded:
        vec = ch["embedding"]
        payload = {k: v for k, v in ch.items() if k != "embedding"}
        points.append(
            PointStruct(id=str(uuid.uuid4()), vector=vec, payload=payload)
        )
    return points


def _upsert_in_batches(
    client, collection_name: str, points: list[PointStruct], batch_size: int = 100
) -> None:
    """Upsert points in fixed-size batches with error logging."""
    for i in range(0, len(points), batch_size):
        batch = points[i : i + batch_size]
        try:
            client.upsert(collection_name=collection_name, points=batch)
        except Exception as e:
            logger.exception(
                "Qdrant upsert failed for collection %s batch offset %s: %s",
                collection_name,
                i,
                e,
            )
            raise


async def ingest_document(file_path: str, use_llm_tagging: bool = True) -> dict:
    """Run the full ingest pipeline for one file and return a summary dict."""
    source_type, chunks = await asyncio.to_thread(_prepare_chunks, file_path)
    if not chunks:
        collection_name = (
            os.getenv("COLLECTION_BOOKS")
            if source_type == "book"
            else os.getenv("COLLECTION_ARTICLES")
        )
        return {
            "file": file_path,
            "source_type": source_type,
            "collection": collection_name or "",
            "chunks_ingested": 0,
        }

    tagged = await asyncio.to_thread(
        _tag_all_chunks, chunks, source_type, use_llm_tagging
    )
    encoded = await asyncio.to_thread(encode_chunks, tagged)
    collection_name = (
        os.getenv("COLLECTION_BOOKS")
        if source_type == "book"
        else os.getenv("COLLECTION_ARTICLES")
    )
    if not collection_name:
        raise ValueError("COLLECTION_BOOKS or COLLECTION_ARTICLES not set in environment")

    client = get_client()
    points = _build_points(encoded)
    await asyncio.to_thread(_upsert_in_batches, client, collection_name, points)

    return {
        "file": file_path,
        "source_type": source_type,
        "collection": collection_name,
        "chunks_ingested": len(points),
    }

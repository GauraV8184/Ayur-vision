"""Qdrant Cloud client and collection bootstrap for Ayurvedic RAG."""

import logging
import os
from typing import Optional

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PayloadSchemaType, VectorParams

load_dotenv()

logger = logging.getLogger(__name__)

_client: Optional[QdrantClient] = None


def get_client() -> QdrantClient:
    """Return a singleton Qdrant client."""
    global _client
    if _client is not None:
        return _client

    url = os.getenv("QDRANT_URL")
    api_key = os.getenv("QDRANT_API_KEY")
    if not url or not api_key:
        raise ValueError("Missing QDRANT_URL or QDRANT_API_KEY in environment")

    _client = QdrantClient(url=url, api_key=api_key)
    return _client


def _collection_exists(client: QdrantClient, name: str) -> bool:
    """Check whether a Qdrant collection exists."""
    try:
        if hasattr(client, "collection_exists"):
            return bool(client.collection_exists(name))
        collections = client.get_collections().collections
        return any(c.name == name for c in collections)
    except Exception as e:
        logger.exception("Failed to check collection existence for %s: %s", name, e)
        raise


def _ensure_collection(client: QdrantClient, name: str) -> None:
    """Create a Qdrant collection if it doesn't exist."""
    if _collection_exists(client, name):
        return

    client.create_collection(
        collection_name=name,
        vectors_config=VectorParams(size=1024, distance=Distance.COSINE),
    )


def _ensure_payload_indexes(client: QdrantClient, collection_name: str) -> None:
    """Create payload indexes required for fast filtering."""
    index_specs: dict[str, PayloadSchemaType] = {
        "source_type": PayloadSchemaType.KEYWORD,
        "dosha_type": PayloadSchemaType.KEYWORD,
        "ayur_category": PayloadSchemaType.KEYWORD,
        "content_focus": PayloadSchemaType.KEYWORD,
        "has_sanskrit": PayloadSchemaType.BOOL,
        "document_title": PayloadSchemaType.KEYWORD,
        "body_system": PayloadSchemaType.KEYWORD,
    }

    for field_name, schema_type in index_specs.items():
        try:
            client.create_payload_index(
                collection_name=collection_name,
                field_name=field_name,
                field_schema=schema_type,
            )
        except Exception as e:
            msg = str(e).lower()
            if "already exists" in msg or "exists" in msg:
                continue
            logger.exception(
                "Failed to create payload index %s on %s: %s",
                field_name,
                collection_name,
                e,
            )
            raise


def bootstrap_collections() -> None:
    """Create required collections and payload indexes if missing."""
    collection_books = os.getenv("COLLECTION_BOOKS")
    collection_articles = os.getenv("COLLECTION_ARTICLES")
    if not collection_books or not collection_articles:
        raise ValueError("Missing COLLECTION_BOOKS or COLLECTION_ARTICLES in environment")

    client = get_client()

    _ensure_collection(client, collection_books)
    _ensure_collection(client, collection_articles)

    _ensure_payload_indexes(client, collection_books)
    _ensure_payload_indexes(client, collection_articles)

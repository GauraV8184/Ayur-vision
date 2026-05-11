"""Sentence-transformer embeddings for chunks and queries."""

import logging
import os

import numpy as np
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

load_dotenv()

logger = logging.getLogger(__name__)

_model: SentenceTransformer | None = None
_BATCH = 32

_CHUNK_PREFIX = "Represent this Ayurvedic passage for retrieval: "
_QUERY_PREFIX = "Represent this question for searching Ayurvedic knowledge: "


def _get_model() -> SentenceTransformer:
    """Lazily load and return the sentence-transformer model."""
    global _model
    if _model is None:
        name = os.getenv("EMBEDDING_MODEL")
        if not name:
            raise ValueError("EMBEDDING_MODEL is not set in environment")
        try:
            _model = SentenceTransformer(name)
        except Exception as e:
            logger.exception("Failed to load embedding model %s: %s", name, e)
            raise
    return _model


def encode_chunks(chunks: list[dict]) -> list[dict]:
    """Encode chunk texts in batches and attach normalized embedding vectors."""
    if not chunks:
        return []
    model = _get_model()
    texts = [_CHUNK_PREFIX + c["text"] for c in chunks]
    all_vecs: list[np.ndarray] = []
    try:
        for i in range(0, len(texts), _BATCH):
            batch = texts[i : i + _BATCH]
            emb = model.encode(batch, normalize_embeddings=True)
            for row in emb:
                all_vecs.append(np.asarray(row))
    except Exception as e:
        logger.exception("encode_chunks failed: %s", e)
        raise
    out: list[dict] = []
    for chunk, vec in zip(chunks, all_vecs, strict=True):
        d = dict(chunk)
        d["embedding"] = vec.tolist()
        out.append(d)
    return out


def encode_query(query: str) -> list[float]:
    """Return a single normalized embedding vector for a search query."""
    model = _get_model()
    prefixed = _QUERY_PREFIX + query
    try:
        vec = model.encode(
            [prefixed], normalize_embeddings=True, show_progress_bar=False
        )[0]
    except Exception as e:
        logger.exception("encode_query failed: %s", e)
        raise
    return np.asarray(vec).tolist()

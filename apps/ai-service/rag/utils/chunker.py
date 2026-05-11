"""Text chunking with recursive character splitting."""

import os

from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

_chunk_size = int(os.getenv("CHUNK_SIZE", "800"))
_chunk_overlap = int(os.getenv("CHUNK_OVERLAP", "160"))

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=_chunk_size,
    chunk_overlap=_chunk_overlap,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def chunk_text(text: str, metadata: dict) -> list[dict]:
    """Split text into chunks and merge each chunk with the given metadata."""
    pieces = _splitter.split_text(text)
    out: list[dict] = []
    for idx, piece in enumerate(pieces):
        out.append({"text": piece, "chunk_index": idx, **metadata})
    return out


def chunk_page(page: dict) -> list[dict]:
    """Chunk a single PDF page dict, forwarding page and document metadata."""
    meta = {
        "page_number": page["page_number"],
        "file_name": page["file_name"],
        "document_title": page["document_title"],
    }
    return chunk_text(page["text"], meta)

"""PDF and plain-text document loading utilities."""

import logging
from pathlib import Path

import fitz
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_MIN_PAGE_CHARS = 40


def load_pdf(file_path: str) -> list[dict]:
    """Load a PDF and return one dict per non-trivial page with text and metadata."""
    path = Path(file_path)
    file_name = path.name
    document_title = path.stem
    pages_out: list[dict] = []
    try:
        doc = fitz.open(file_path)
    except Exception as e:
        logger.exception("PyMuPDF failed to open %s: %s", file_path, e)
        raise
    try:
        for i in range(len(doc)):
            page = doc.load_page(i)
            text = (page.get_text() or "").strip()
            if len(text) < _MIN_PAGE_CHARS:
                continue
            pages_out.append(
                {
                    "text": text,
                    "page_number": i + 1,
                    "file_name": file_name,
                    "document_title": document_title,
                }
            )
    finally:
        doc.close()
    return pages_out


def load_text_file(file_path: str) -> dict:
    """Load a UTF-8 text file as a single document dict."""
    path = Path(file_path)
    file_name = path.name
    document_title = path.stem
    try:
        text = path.read_text(encoding="utf-8", errors="replace").strip()
    except Exception as e:
        logger.exception("Failed to read text file %s: %s", file_path, e)
        raise
    return {
        "text": text,
        "file_name": file_name,
        "document_title": document_title,
    }

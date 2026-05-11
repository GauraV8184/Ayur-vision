"""Rule-based and LLM-based metadata tagging for Ayurvedic chunks."""

import json
import logging
import os
import re
from typing import Any

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")

_TRANSLIT_TERMS = (
    "prakriti",
    "dosha",
    "vata",
    "pitta",
    "kapha",
    "agni",
    "ama",
    "ojas",
    "prana",
    "ashwagandha",
    "brahmi",
    "triphala",
    "shatavari",
    "neem",
    "tulsi",
    "amalaki",
)

_SEMANTIC_DEFAULTS: dict[str, Any] = {
    "ayur_category": "general",
    "dosha_type": [],
    "content_focus": "general",
    "herbs_mentioned": [],
    "diseases_mentioned": [],
    "body_system": "general",
    "season_relevance": "none",
}

_SYSTEM_INSTRUCTION = (
    "You are an Ayurvedic scholar and NLP specialist. Given a passage from an "
    "Ayurvedic text, extract structured metadata. Respond ONLY with valid JSON, "
    "no markdown fences, no explanation."
)


def _normalize_llm_model_name(raw: str | None) -> str:
    """Strip provider prefix from LLM_MODEL for the Gemini API."""
    if not raw:
        return "gemini-2.0-flash"
    s = raw.strip()
    if s.lower().startswith("gemini/"):
        return s.split("/", 1)[1]
    return s


def tag_structural(chunk: dict, source_type: str) -> dict:
    """Add cheap structural tags: source type, Sanskrit heuristic, word stats."""
    text = chunk.get("text", "")
    lower = text.lower()
    has_dev = bool(_DEVANAGARI_RE.search(text))
    has_translit = any(t in lower for t in _TRANSLIT_TERMS)
    word_count = len(text.split())
    chunk["source_type"] = source_type
    chunk["has_sanskrit"] = bool(has_dev or has_translit)
    chunk["word_count"] = word_count
    chunk["language_complexity"] = "classical" if word_count < 200 else "detailed"
    return chunk


def _parse_semantic_json(text: str) -> dict[str, Any]:
    """Parse model output as JSON; return defaults on failure."""
    text = text.strip()
    try:
        data = json.loads(text)
        if not isinstance(data, dict):
            return dict(_SEMANTIC_DEFAULTS)
        out = dict(_SEMANTIC_DEFAULTS)
        for k in _SEMANTIC_DEFAULTS:
            if k in data:
                out[k] = data[k]
        return out
    except json.JSONDecodeError:
        return dict(_SEMANTIC_DEFAULTS)


def tag_semantic(chunk: dict) -> dict:
    """Use Gemini to extract semantic metadata; on failure, apply safe defaults."""
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = _normalize_llm_model_name(os.getenv("LLM_MODEL"))
    chunk_text = chunk.get("text", "")
    user_prompt = (
        f"Passage:\n{chunk_text}\n\n"
        "Return a JSON object with exactly these keys:\n"
        "- ayur_category: one of [treatment, diagnosis, herbology, philosophy, "
        "lifestyle, anatomy, general]\n"
        "- dosha_type: array, subset of [vata, pitta, kapha], empty array if none "
        "mentioned\n"
        "- content_focus: one of [herbal_remedy, symptom_description, "
        "dietary_advice, procedure, theory, case_study, general]\n"
        "- herbs_mentioned: array of herb names (common or Sanskrit), empty if none\n"
        "- diseases_mentioned: array of disease or symptom names, empty if none\n"
        "- body_system: one of [nervous, digestive, respiratory, musculoskeletal, "
        "reproductive, circulatory, general]\n"
        "- season_relevance: one of [spring, summer, monsoon, autumn, winter, "
        "all, none]"
    )
    full_prompt = f"{_SYSTEM_INSTRUCTION}\n\n{user_prompt}"
    if not api_key:
        logger.error("GEMINI_API_KEY missing; using semantic defaults for chunk")
        for k, v in _SEMANTIC_DEFAULTS.items():
            chunk[k] = v
        return chunk
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(full_prompt)
        try:
            raw = (response.text or "").strip()
        except Exception:
            raw = ""
        parsed = _parse_semantic_json(raw)
        for k, v in parsed.items():
            chunk[k] = v
    except Exception as e:
        logger.exception("Gemini tag_semantic failed: %s", e)
        for k, v in _SEMANTIC_DEFAULTS.items():
            chunk[k] = v
    return chunk


def tag_chunk(chunk: dict, source_type: str, use_llm: bool = True) -> dict:
    """Run structural tagging, then optional LLM semantic tagging."""
    tag_structural(chunk, source_type)
    if use_llm:
        tag_semantic(chunk)
    else:
        for k, v in _SEMANTIC_DEFAULTS.items():
            chunk[k] = list(v) if isinstance(v, list) else v
    return chunk

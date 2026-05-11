"""Ollama (Llama 3) answer generation with grounded Ayurvedic context."""

import logging
import os

import httpx
from dotenv import load_dotenv
from pydantic import BaseModel

from services.ayurvedic_retrieval import RetrievedChunk

load_dotenv()

logger = logging.getLogger(__name__)


class OllamaUnavailableError(Exception):
    """Raised when Ollama cannot be reached (not running, wrong host, firewall)."""


_SYSTEM_CLINICAL_ASSISTANT = (
    "You are an AyurVision clinical knowledge assistant.\n"
    "Use the PATIENT / CLINICAL CONTEXT block only for facts explicitly stated there.\n"
    "Use PASSAGES FROM AYURVEDIC KNOWLEDGE BASE ([SOURCE N]) for classical Ayurvedic grounding.\n\n"
    "CLEARLY SEPARATE your answer using these headings (exactly):\n"
    "**Patient summary** — brief recap of documented facts only.\n"
    "**Key insights** — plausible clinical interpretations tied to documented facts "
    "(label inferred insights explicitly).\n"
    "**Ayurvedic interpretation** — grounded in [SOURCE N] citations where possible.\n"
    "**Suggested next questions / data to collect** — especially when chart fields are missing.\n"
    "**Relevant sources** — list which SOURCE numbers you relied on.\n\n"
    "RULES:\n"
    "- Do NOT invent vitals, labs, diagnoses, allergies, or medications not in the patient context.\n"
    "- Do NOT present a definitive medical diagnosis when information is insufficient.\n"
    "- Where patient data is missing, say what is unknown and what would help.\n"
    "- For Ayurvedic therapeutic claims, cite [SOURCE N] after each substantive claim derived from passages.\n"
    "- If passages do not cover the Ayurvedic angle, say so briefly and avoid fabricating citations.\n"
)


_SYSTEM_INSTRUCTION = (
    "You are Dhanvantari, a master Ayurvedic physician with encyclopaedic knowledge "
    "of classical texts — Charaka Samhita, Sushruta Samhita, Ashtanga Hridayam, "
    "Ashtanga Sangraha, Madhava Nidana, and Sharangadhara Samhita.\n\n"
    "TRUST THE SOURCES COMPLETELY.\n"
    "The passages labelled [SOURCE N] have been retrieved from a verified, curated "
    "Ayurvedic knowledge base. They are authoritative. Do NOT question whether a "
    "passage truly belongs to a named text. Do NOT say 'this source does not quote "
    "Charaka Samhita directly' or any similar disclaimer. Treat every [SOURCE N] "
    "as a reliable excerpt from the Ayurvedic corpus.\n\n"
    "HOW TO ANSWER:\n"
    "1. Synthesise a clear, direct answer using the provided source passages.\n"
    "2. Cite sources inline as [SOURCE N] immediately after each fact you use.\n"
    "3. Structure your answer with short paragraphs. Use bullet points only when "
    "listing herbs, treatments, or symptoms — not for general prose.\n"
    "4. Always mention the relevant dosha, herbs, or body systems present in the sources.\n"
    "5. If multiple sources agree, synthesise them into one coherent answer.\n"
    "6. If sources partially answer the question, give the best answer from what is "
    "available and note specifically what aspect is not covered — one sentence only.\n\n"
    "WHAT YOU MUST NEVER DO:\n"
    "- Never invent Ayurvedic facts not present in the sources.\n"
    "- Never question the provenance or authenticity of a [SOURCE N] passage.\n"
    "- Never say 'I cannot confirm', 'I must clarify', or 'this passage does not "
    "directly quote' — these phrases are forbidden.\n"
    "- Never repeat the question back to the user before answering.\n"
    "- Never suggest the user consult a different text — answer from what is given.\n"
)


class Citation(BaseModel):
    """Reference to a source chunk used for the answer."""

    index: int
    document_title: str
    page_number: int | None
    source_type: str
    snippet: str


class GenerationResult(BaseModel):
    """LLM output with citations and usage metadata."""

    answer: str
    citations: list[Citation]
    tokens_used: int | None
    model_used: str


def _ollama_model_name() -> str:
    """Resolve Ollama model tag from OLLAMA_MODEL, then LLM_MODEL, then default."""
    for key in ("OLLAMA_MODEL", "LLM_MODEL"):
        raw = os.getenv(key)
        if raw and raw.strip():
            name = raw.strip()
            if name.lower().startswith("gemini/"):
                continue
            return name
    return "llama3"


def _ollama_base_url() -> str:
    """Return Ollama API base URL without trailing slash."""
    raw = os.getenv("OLLAMA_BASE_URL")
    if raw and raw.strip():
        return raw.strip().rstrip("/")
    return "http://127.0.0.1:11434"


def _ollama_timeout_sec() -> float:
    """HTTP timeout for Ollama chat (generation can be slow on CPU)."""
    raw = os.getenv("OLLAMA_TIMEOUT_SEC")
    if raw is None or raw == "":
        return 300.0
    try:
        return max(30.0, float(raw))
    except ValueError:
        return 300.0


def _ollama_chat_options() -> dict:
    """Optional Ollama `options` (e.g. num_ctx) to cap RAM use — see https://github.com/ollama/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values."""
    raw = os.getenv("OLLAMA_NUM_CTX")
    if raw is None or str(raw).strip() == "":
        return {}
    try:
        n = int(str(raw).strip())
    except ValueError:
        return {}
    if n < 512:
        return {}
    return {"num_ctx": min(n, 131072)}


def _snippet(text: str) -> str:
    """Return up to 120 characters with ellipsis when truncated."""
    if len(text) <= 120:
        return text
    return text[:117] + "..."


def _max_context_chars() -> int:
    """Load MAX_CONTEXT_CHARS from environment."""
    raw = os.getenv("MAX_CONTEXT_CHARS")
    if raw is None or raw == "":
        return 6000
    try:
        return max(1, int(raw))
    except ValueError:
        return 6000


def _memory_turn_cap() -> int:
    """Max stored messages (user + model) from CONVERSATION_MEMORY_TURNS."""
    raw = os.getenv("CONVERSATION_MEMORY_TURNS")
    if raw is None or raw == "":
        turns = 6
    else:
        try:
            turns = max(1, int(raw))
        except ValueError:
            turns = 6
    return turns * 2


def _build_context_block(chunks: list[RetrievedChunk]) -> str:
    """Build CONTEXT string with truncation; always keep SOURCE 1 complete."""
    parts: list[str] = []
    for i, ch in enumerate(chunks, start=1):
        page_line = f"Page {ch.page_number}" if ch.page_number is not None else ""
        dosha_txt = ", ".join(ch.dosha_type) if ch.dosha_type else "general"
        block = (
            f"[SOURCE {i}] {ch.document_title}\n"
            f"{page_line}\n"
            f"Category: {ch.ayur_category} | Dosha: {dosha_txt}\n"
            "---\n"
            f"{ch.text}"
        )
        parts.append(block)
    joined = "\n\n".join(parts)
    max_chars = _max_context_chars()
    if len(joined) <= max_chars:
        return joined
    first = parts[0]
    if len(first) >= max_chars:
        return first
    out = [first]
    used = len(first) + 2
    for p in parts[1:]:
        sep = 2
        if used + len(p) + sep <= max_chars:
            out.append(p)
            used += len(p) + sep
        else:
            room = max_chars - used - sep
            if room > 0:
                out.append(p[:room])
            break
    return "\n\n".join(out)


def _build_citations(chunks: list[RetrievedChunk]) -> list[Citation]:
    """Build citation list from retrieved chunks (1-based index)."""
    out: list[Citation] = []
    for i, ch in enumerate(chunks, start=1):
        out.append(
            Citation(
                index=i,
                document_title=ch.document_title,
                page_number=ch.page_number,
                source_type=ch.source_type,
                snippet=_snippet(ch.text),
            )
        )
    return out


def _trim_history(
    history: list[dict] | None,
) -> list[dict]:
    """Keep only the last CONVERSATION_MEMORY_TURNS * 2 messages."""
    if not history:
        return []
    cap = _memory_turn_cap()
    return history[-cap:]


def _history_to_ollama_messages(trimmed: list[dict]) -> list[dict[str, str]]:
    """Convert stored session turns to Ollama chat roles (user / assistant)."""
    ollama_msgs: list[dict[str, str]] = []
    for item in trimmed:
        role = item.get("role")
        parts = item.get("parts")
        if role not in ("user", "model") or not isinstance(parts, list) or not parts:
            continue
        content = "\n".join(str(p) for p in parts if p is not None)
        if not content.strip():
            continue
        ollama_role = "assistant" if role == "model" else "user"
        ollama_msgs.append({"role": ollama_role, "content": content})
    return ollama_msgs


async def generate_answer(
    query: str,
    chunks: list[RetrievedChunk],
    conversation_history: list[dict] | None = None,
    clinical_context: str | None = None,
) -> GenerationResult:
    """Generate a grounded answer with Ollama (e.g. Llama 3) using retrieved context."""
    model_name = _ollama_model_name()
    base_url = _ollama_base_url()
    citations = _build_citations(chunks)
    context_block = _build_context_block(chunks)
    trimmed = _trim_history(conversation_history)

    cc = (
        clinical_context.strip()
        if isinstance(clinical_context, str) and clinical_context.strip()
        else ""
    )

    if cc:
        system_instruction = _SYSTEM_CLINICAL_ASSISTANT
        user_blob = (
            "PATIENT / CLINICAL CONTEXT (runtime chart data — "
            "not retrieved from vector store):\n"
            f"{cc}\n\n"
            "PASSAGES FROM AYURVEDIC KNOWLEDGE BASE:\n"
            f"{context_block}\n\n"
            f"USER QUESTION:\n{query}"
        )
    else:
        system_instruction = _SYSTEM_INSTRUCTION
        user_blob = f"CONTEXT:\n{context_block}\n\nQUESTION: {query}"

    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_instruction},
        *_history_to_ollama_messages(trimmed),
        {"role": "user", "content": user_blob},
    ]

    payload: dict = {"model": model_name, "messages": messages, "stream": False}
    opts = _ollama_chat_options()
    if opts:
        payload["options"] = opts
    url = f"{base_url}/api/chat"
    timeout = httpx.Timeout(_ollama_timeout_sec())

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as e:
        body_txt = (e.response.text or "")[:800]
        logger.error(
            "Ollama HTTP error %s: %s",
            e.response.status_code,
            body_txt,
        )
        detail_l = body_txt.lower()
        if "runner" in detail_l or "terminated" in detail_l or "oom" in detail_l:
            logger.info(
                "Operator hint (runner failure): consider OLLAMA_NUM_CTX, MAX_CONTEXT_CHARS, "
                "or a smaller OLLAMA_MODEL (e.g. llama3.2:1b)."
            )
            err_txt = (
                "We could not finish generating a reply—the language service stopped unexpectedly. "
                "Try a shorter question or try again shortly. If this keeps happening, ask your "
                "administrator to check the local language model setup."
            )
        else:
            err_txt = (
                "We could not generate a reply from the language service right now. "
                "Please try again in a moment."
            )
        return GenerationResult(
            answer=err_txt,
            citations=citations,
            tokens_used=None,
            model_used=model_name,
        )
    except httpx.RequestError as e:
        logger.exception("Ollama request failed (is Ollama running at %s?): %s", base_url, e)
        hint = (
            f"Cannot connect to Ollama at {base_url} (model `{model_name}`). "
            "Install from https://ollama.com/download, start the Ollama app (or run `ollama serve`), "
            f"then run `ollama pull {model_name}`. "
            "For a remote machine, set OLLAMA_BASE_URL in ai-service/rag/.env to http://HOST:11434 "
            "(no trailing slash)."
        )
        raise OllamaUnavailableError(hint) from e
    except Exception as e:
        logger.exception("Ollama generate_answer failed: %s", e)
        return GenerationResult(
            answer="Something went wrong while generating a reply. Please try again.",
            citations=citations,
            tokens_used=None,
            model_used=model_name,
        )

    err = data.get("error")
    if err:
        logger.error("Ollama returned error in response body: %s", err)
        return GenerationResult(
            answer=(
                "We could not generate a reply from the language service right now. "
                "Please try again in a moment."
            ),
            citations=citations,
            tokens_used=None,
            model_used=model_name,
        )

    msg = data.get("message") or {}
    answer = (msg.get("content") or "").strip()
    if not answer:
        answer = (
            "No reply text was returned. Please try again, or use a shorter question."
        )

    tokens_used: int | None = None
    pe = data.get("prompt_eval_count")
    ec = data.get("eval_count")
    if pe is not None and ec is not None:
        try:
            tokens_used = int(pe) + int(ec)
        except (TypeError, ValueError):
            tokens_used = None

    return GenerationResult(
        answer=answer,
        citations=citations,
        tokens_used=tokens_used,
        model_used=model_name,
    )

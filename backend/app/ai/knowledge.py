"""
Loads the assistant's grounding material from backend/knowledge/.

Markdown and text are read directly. PDFs are recognised but skipped until
extraction is enabled — see knowledge/README.md for the two supported routes.
"""
import logging
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent.parent / "knowledge"
TEXT_SUFFIXES = {".md", ".txt"}
# Recognised but not yet extracted — kept explicit so adding one is a no-op
# rather than a crash.
DEFERRED_SUFFIXES = {".pdf"}

MAX_CHARS = 60_000  # keeps the prompt well inside context limits


def _load_pdf(path: Path) -> str:
    """
    Placeholder for PDF extraction.

    To enable: add `pypdf` to requirements.txt and return the extracted text
    here, or upload the PDFs to an OpenAI vector store and attach the
    file_search tool in assistant.py instead.
    """
    logger.warning(
        "knowledge: skipping %s — PDF extraction is not enabled "
        "(see knowledge/README.md)", path.name
    )
    return ""


@lru_cache(maxsize=1)
def load_knowledge() -> str:
    """Concatenate every knowledge document into one grounded context block."""
    if not KNOWLEDGE_DIR.is_dir():
        logger.warning("knowledge: directory %s not found", KNOWLEDGE_DIR)
        return ""

    chunks: list[str] = []
    for path in sorted(KNOWLEDGE_DIR.iterdir()):
        if path.name.lower() == "readme.md":
            continue  # instructions for maintainers, not product knowledge
        suffix = path.suffix.lower()
        if suffix in TEXT_SUFFIXES:
            chunks.append(f"--- source: {path.name} ---\n{path.read_text(encoding='utf-8')}")
        elif suffix in DEFERRED_SUFFIXES:
            text = _load_pdf(path)
            if text:
                chunks.append(f"--- source: {path.name} ---\n{text}")

    combined = "\n\n".join(chunks)
    if len(combined) > MAX_CHARS:
        logger.warning("knowledge: truncated to %d chars", MAX_CHARS)
        combined = combined[:MAX_CHARS]

    logger.info("knowledge: loaded %d document(s), %d chars", len(chunks), len(combined))
    return combined


def knowledge_summary() -> dict:
    """Non-sensitive description of what the assistant was grounded on."""
    if not KNOWLEDGE_DIR.is_dir():
        return {"documents": [], "chars": 0}
    docs = [
        p.name for p in sorted(KNOWLEDGE_DIR.iterdir())
        if p.suffix.lower() in TEXT_SUFFIXES and p.name.lower() != "readme.md"
    ]
    return {"documents": docs, "chars": len(load_knowledge())}

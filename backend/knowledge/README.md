# Assistant knowledge base

Everything in this folder is loaded at startup and passed to the assistant as
grounded context. The assistant is instructed to answer only from this material
and to say "I don't know" otherwise.

## Adding documents

Drop files in here and restart the backend:

- `.md` / `.txt` — loaded directly, no extra dependency
- `.pdf` — see below

Keep each file focused, and prefer plain factual statements over marketing
copy: the assistant repeats what it reads.

## PDFs

PDF text extraction is intentionally not wired up yet, so the project stays
free of an extra dependency until it is actually needed. Two options when you
add real PDFs:

1. **Local extraction** — add `pypdf` to `requirements.txt` and extend
   `app/ai/knowledge.py::_load_pdf`. Simplest, keeps everything self-hosted.
2. **OpenAI file search** — upload the PDFs to a vector store and attach the
   `file_search` tool in `app/ai/assistant.py`. Better for large document sets;
   the retrieval happens on OpenAI's side.

`app/ai/knowledge.py` already skips PDFs with a logged warning, so dropping one
in will not break the assistant — it will simply be ignored until extraction is
enabled.

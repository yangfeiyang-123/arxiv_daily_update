#!/usr/bin/env python3
"""Realtime single-paper summarization server (SSE).

- Keeps GitHub Actions for daily batch jobs.
- Provides real-time streaming for one-paper summarization.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import traceback
from dataclasses import asdict
from pathlib import Path
from typing import Any, AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

import arxiv_fulltext_summarizer as core


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run realtime SSE summary server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8788)
    parser.add_argument(
        "--allowed-origins",
        default=os.getenv("REALTIME_ALLOWED_ORIGINS", "*"),
        help="Comma-separated origins. Default '*'.",
    )
    return parser.parse_args()


class StreamOneRequest(BaseModel):
    arxiv_id: str = Field(..., description="arXiv id")
    input_path: str = Field(default="data/latest_cs_daily.json")
    output_dir: str = Field(default="outputs/summaries")
    mode: str = Field(default="deep")
    model: str = Field(default="")
    base_url: str = Field(default="")
    min_chars: int = Field(default=core.DEFAULT_MIN_CHARS)
    chunk_max_chars: int = Field(default=core.DEFAULT_CHUNK_MAX_CHARS)
    save: bool = Field(default=True)


class StreamEventEmitter:
    def __init__(self) -> None:
        self._buffer: list[str] = []

    def emit(self, event: str, data: dict[str, Any]) -> None:
        payload = json.dumps(data, ensure_ascii=False)
        self._buffer.append(f"event: {event}\ndata: {payload}\n\n")

    def flush(self) -> list[str]:
        out = self._buffer
        self._buffer = []
        return out


def build_final_prompt(paper: core.PaperRecord, source_type: str, chunk_summaries: list[dict[str, Any]]) -> list[dict[str, str]]:
    evidence_catalog = "\n".join([f"- {item['chunk_id']}: {item['evidence_pointer']}" for item in chunk_summaries])
    summaries_blob = "\n\n".join(
        [
            f"### {item['chunk_id']}\n"
            f"Evidence: {item['evidence_pointer']}\n"
            f"key_points: {json.dumps(item['summary'].get('key_points', []), ensure_ascii=False)}\n"
            f"method_details: {json.dumps(item['summary'].get('method_details', []), ensure_ascii=False)}\n"
            f"experiment_details: {json.dumps(item['summary'].get('experiment_details', []), ensure_ascii=False)}\n"
            f"resources: {json.dumps(item['summary'].get('resources', []), ensure_ascii=False)}"
            for item in chunk_summaries
        ]
    )

    date_text = paper.published_date or "Not specified"
    user_prompt = (
        "Read this robotics paper as a research collaborator.\n\n"
        f"{core.FINAL_OUTPUT_PROMPT}\n\n"
        "Constraints:\n"
        "- Use only the section summaries and evidence catalog below.\n"
        "- Do not fabricate any claim or citation.\n"
        "- In [9], only cite evidence pointers from the catalog exactly as written.\n"
        "- If a requested item is not present, write 'Not specified'.\n\n"
        f"Paper metadata:\nTitle: {paper.title}\narXiv ID: {paper.arxiv_id}\nDate: {date_text}\nSource type: {source_type}\n\n"
        f"Evidence catalog:\n{evidence_catalog}\n\n"
        f"Section summaries:\n{summaries_blob}"
    )

    return [
        {
            "role": "system",
            "content": "You are a robotics research collaborator. Produce concise, technical, structured Markdown.",
        },
        {"role": "user", "content": user_prompt},
    ]


def pick_record(records: list[core.PaperRecord], arxiv_id: str) -> core.PaperRecord:
    target = core.normalize_arxiv_id(arxiv_id)
    if not target:
        raise ValueError("arxiv_id is required")

    for item in records:
        if core.canonical_arxiv_id(item.arxiv_id) == core.canonical_arxiv_id(target):
            return item

    html_url, pdf_url = core.derive_urls(target)
    return core.PaperRecord(
        arxiv_id=target,
        title=f"arXiv {target}",
        html_url=html_url,
        pdf_url=pdf_url,
        published_date="",
    )


def create_app(allowed_origins: str) -> FastAPI:
    app = FastAPI(title="myArxiv Realtime Summary Server", version="1.0.0")

    if allowed_origins.strip() == "*":
        origins = ["*"]
    else:
        origins = [x.strip() for x in allowed_origins.split(",") if x.strip()]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"ok": "true"}

    @app.post("/api/summarize-one/stream")
    async def summarize_one_stream(req: StreamOneRequest) -> StreamingResponse:
        if not req.arxiv_id.strip():
            raise HTTPException(status_code=400, detail="arxiv_id is required")

        async def event_stream() -> AsyncGenerator[bytes, None]:
            emitter = StreamEventEmitter()
            final_text = ""
            try:
                core.require_runtime_deps()

                input_path = Path(req.input_path)
                output_dir = Path(req.output_dir)
                output_dir.mkdir(parents=True, exist_ok=True)

                model_name = (req.model or "").strip() or core.DEFAULT_MODEL_DEEP
                base_url = (req.base_url or "").strip() or core.DEFAULT_BASE_URL

                emitter.emit("stage", {"name": "load_records", "message": f"Loading records from {input_path}"})
                for chunk in emitter.flush():
                    yield chunk.encode("utf-8")

                records = core.sort_newest(core.load_records(input_path))
                paper = pick_record(records, req.arxiv_id)

                emitter.emit(
                    "stage",
                    {
                        "name": "paper_selected",
                        "message": f"Selected: {paper.arxiv_id}",
                        "paper": asdict(paper),
                    },
                )
                for chunk in emitter.flush():
                    yield chunk.encode("utf-8")

                session = core.build_http_session()

                emitter.emit("stage", {"name": "full_text_fetch", "message": "Fetching full text (HTML preferred)..."})
                for chunk in emitter.flush():
                    yield chunk.encode("utf-8")

                extracted = core.retrieve_full_text(session=session, paper=paper, min_chars=req.min_chars)

                emitter.emit(
                    "stage",
                    {
                        "name": "full_text_ready",
                        "message": f"Full text ready via {extracted.source_type}, chars={len(extracted.full_text)}",
                        "source_type": extracted.source_type,
                        "source_url": extracted.source_url,
                    },
                )
                for chunk in emitter.flush():
                    yield chunk.encode("utf-8")

                chunks = core.build_chunks(extracted, max_chars=req.chunk_max_chars)
                emitter.emit("stage", {"name": "chunking_done", "message": f"Chunked into {len(chunks)} chunks"})
                for chunk in emitter.flush():
                    yield chunk.encode("utf-8")

                runner = core.LLMRunner(
                    model_fast=model_name,
                    model_deep=model_name,
                    base_url=base_url,
                )

                chunk_summaries: list[dict[str, Any]] = []
                for idx, text_chunk in enumerate(chunks, start=1):
                    emitter.emit(
                        "chunk",
                        {
                            "index": idx,
                            "total": len(chunks),
                            "chunk_id": text_chunk.chunk_id,
                            "evidence": text_chunk.evidence_pointer,
                        },
                    )
                    for chunk in emitter.flush():
                        yield chunk.encode("utf-8")

                    summary_obj = runner.summarize_chunk(paper=paper, chunk=text_chunk, mode=req.mode)
                    chunk_summaries.append(
                        {
                            "chunk_id": text_chunk.chunk_id,
                            "evidence_pointer": text_chunk.evidence_pointer,
                            "summary": summary_obj,
                        }
                    )

                emitter.emit("stage", {"name": "final_synthesis", "message": "Streaming final synthesis..."})
                for chunk in emitter.flush():
                    yield chunk.encode("utf-8")

                messages = build_final_prompt(
                    paper=paper,
                    source_type=extracted.source_type,
                    chunk_summaries=chunk_summaries,
                )

                stream = runner.client.chat.completions.create(
                    model=model_name,
                    temperature=0.1,
                    messages=messages,
                    stream=True,
                )

                for part in stream:
                    try:
                        delta = part.choices[0].delta.content or ""
                    except Exception:
                        delta = ""
                    if not delta:
                        continue
                    final_text += delta
                    emitter.emit("token", {"text": delta})
                    for chunk in emitter.flush():
                        yield chunk.encode("utf-8")

                if not final_text.strip():
                    raise RuntimeError("Model returned empty output")

                out_path = output_dir / core.summary_filename(paper)
                if req.save:
                    out_path.write_text(final_text, encoding="utf-8")
                    rec = {
                        "arxiv_id": paper.arxiv_id,
                        "summary_path": str(out_path),
                        "status": "success",
                        "error": "",
                    }
                    core.upsert_summary_index(output_dir, [rec])

                emitter.emit(
                    "done",
                    {
                        "ok": True,
                        "arxiv_id": paper.arxiv_id,
                        "summary_path": str(out_path),
                        "saved": bool(req.save),
                    },
                )
                for chunk in emitter.flush():
                    yield chunk.encode("utf-8")

            except Exception as err:  # noqa: BLE001
                emitter.emit(
                    "error",
                    {
                        "ok": False,
                        "message": str(err),
                        "trace": traceback.format_exc(limit=3),
                    },
                )
                for chunk in emitter.flush():
                    yield chunk.encode("utf-8")

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    @app.get("/api/models")
    async def models() -> JSONResponse:
        # Static recommendations to avoid failing due provider list API differences.
        return JSONResponse(
            {
                "base_url_default": core.DEFAULT_BASE_URL,
                "recommended_models": [
                    "qwen3.5-397b-a17b",
                    "qwen3-max",
                    "qwen3-max-2026-01-23",
                    "qwen-plus-latest",
                    "qwen-plus-2025-12-01",
                ],
            }
        )

    return app


def main() -> int:
    args = parse_args()
    app = create_app(args.allowed_origins)

    try:
        import uvicorn
    except ModuleNotFoundError:
        print("ERROR: missing uvicorn. Run: python3 -m pip install -r requirements.txt", file=sys.stderr)
        return 1

    uvicorn.run(app, host=args.host, port=args.port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

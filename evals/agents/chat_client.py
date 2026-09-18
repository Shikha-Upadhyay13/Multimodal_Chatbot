"""POST /api/chat and parse the SSE stream into final text + tool calls."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
import uuid
from typing import Any


def chatbot_url() -> str:
    return os.environ.get("CHATBOT_URL", "http://localhost:3001").rstrip("/")


def post_chat(message: str, session_id: str | None = None, timeout_sec: float = 90) -> dict[str, Any]:
    sid = session_id or f"harbor-{uuid.uuid4()}"
    body = json.dumps({"sessionId": sid, "message": message}).encode("utf-8")
    req = urllib.request.Request(
        f"{chatbot_url()}/api/chat",
        data=body,
        headers={"Content-Type": "application/json", "Accept": "text/event-stream"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Could not reach chatbot at {chatbot_url()}: {exc}") from exc
    return parse_sse(raw)


def parse_sse(raw: str) -> dict[str, Any]:
    answer_parts: list[str] = []
    tools: list[dict[str, Any]] = []
    error: str | None = None
    event: str | None = None
    data_lines: list[str] = []

    def flush() -> None:
        nonlocal event, error
        if not event:
            data_lines.clear()
            return
        payload_text = "".join(data_lines).strip()
        data_lines.clear()
        payload: dict[str, Any] = {}
        if payload_text:
            try:
                parsed = json.loads(payload_text)
                if isinstance(parsed, dict):
                    payload = parsed
            except json.JSONDecodeError:
                payload = {"raw": payload_text}

        if event == "text-delta":
            answer_parts.append(str(payload.get("text", "")))
        elif event == "text-revert":
            revert = str(payload.get("text", ""))
            joined = "".join(answer_parts)
            if revert and joined.endswith(revert):
                joined = joined[: -len(revert)]
                answer_parts.clear()
                answer_parts.append(joined)
        elif event == "tool-call":
            tools.append(
                {
                    "id": payload.get("id"),
                    "name": payload.get("name"),
                    "args": payload.get("args"),
                    "round": payload.get("round"),
                }
            )
        elif event == "tool-result":
            for item in reversed(tools):
                if item.get("id") == payload.get("id") and "result" not in item:
                    item["result"] = payload.get("result")
                    break
            else:
                tools.append(
                    {
                        "id": payload.get("id"),
                        "name": payload.get("name"),
                        "result": payload.get("result"),
                        "round": payload.get("round"),
                    }
                )
        elif event == "error":
            error = str(payload.get("message", payload))
        event = None

    for line in raw.splitlines():
        if line.startswith("event:"):
            if event is not None:
                flush()
            event = line[6:].strip()
        elif line.startswith("data:"):
            data_lines.append(line[5:].lstrip())
        elif line.strip() == "":
            flush()
    flush()

    return {
        "answer": "".join(answer_parts).strip(),
        "tools": tools,
        "error": error,
    }

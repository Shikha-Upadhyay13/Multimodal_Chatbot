#!/usr/bin/env python3
"""Deterministic Harbor verifier. Reads /workspace/answer.txt and tools.json."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

WORKSPACE = Path("/workspace")
REWARD = Path("/logs/verifier/reward.txt")


def write_reward(ok: bool) -> None:
    REWARD.parent.mkdir(parents=True, exist_ok=True)
    REWARD.write_text("1\n" if ok else "0\n", encoding="utf-8")
    sys.exit(0 if ok else 1)


def main() -> None:
    answer_path = WORKSPACE / "answer.txt"
    tools_path = WORKSPACE / "tools.json"
    if not answer_path.is_file() or not tools_path.is_file():
        write_reward(False)

    answer = answer_path.read_text(encoding="utf-8", errors="ignore")
    try:
        tools = json.loads(tools_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        write_reward(False)

    names = [str(item.get("name") or "") for item in tools if isinstance(item, dict)]
    require = [t for t in os.environ.get("REQUIRE_TOOLS", "").split(",") if t]
    require_any = [t for t in os.environ.get("REQUIRE_ANY_TOOL", "").split(",") if t]
    forbid = [t for t in os.environ.get("FORBID_TOOLS", "").split(",") if t]
    contains = [t for t in os.environ.get("ANSWER_CONTAINS", "").split("|") if t]
    no_tools = os.environ.get("NO_TOOLS") == "1"

    ok = True
    if no_tools and names:
        ok = False
    for name in require:
        if name not in names:
            ok = False
    if require_any and not any(name in names for name in require_any):
        ok = False
    for name in forbid:
        if name in names:
            ok = False
    answer_l = answer.lower()
    for needle in contains:
        if needle.lower() not in answer_l:
            ok = False
    write_reward(ok)


if __name__ == "__main__":
    main()

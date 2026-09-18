"""One-off check: backend must be running. No Docker required."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from agents.chat_client import post_chat  # noqa: E402


def main() -> None:
    result = post_chat("What is 84 times 37? Use the calculator tool.")
    print(json.dumps(result, indent=2))
    names = [t.get("name") for t in result.get("tools") or []]
    if "calculator" not in names:
        raise SystemExit("FAIL: tools.json did not contain calculator")
    if "3108" not in result.get("answer", ""):
        raise SystemExit("FAIL: answer did not contain 3108")
    print("PASS")


if __name__ == "__main__":
    main()

"""Run Harbor task folders against the live chatbot without Docker.

Each task's instruction.md is POSTed to /api/chat. The same tests/check.py
used by Harbor writes 0/1. Backend traces still land in LangSmith.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

load_dotenv(ROOT / ".env")
load_dotenv(ROOT.parent / "backend" / ".env")

from agents.chat_client import post_chat  # noqa: E402

DATASET = ROOT / "datasets" / "tool-use"


def parse_exports(test_sh: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for line in test_sh.read_text(encoding="utf-8").splitlines():
        if not line.startswith("export "):
            continue
        key, _, value = line.removeprefix("export ").partition("=")
        env[key.strip()] = value.strip()
    return env


def run_task(task_dir: Path) -> dict[str, object]:
    instruction = (task_dir / "instruction.md").read_text(encoding="utf-8").strip()
    check = task_dir / "tests" / "check.py"
    exports = parse_exports(task_dir / "tests" / "test.sh")
    timeout = 180 if "edit" in task_dir.name or "create" in task_dir.name else 90

    result = post_chat(instruction, session_id=f"local-eval-{task_dir.name}", timeout_sec=timeout)
    with tempfile.TemporaryDirectory(prefix=f"harbor-{task_dir.name}-") as tmp:
        workspace = Path(tmp)
        (workspace / "answer.txt").write_text(result.get("answer") or "", encoding="utf-8")
        (workspace / "tools.json").write_text(json.dumps(result.get("tools") or [], indent=2), encoding="utf-8")
        reward_path = workspace / "reward.txt"
        env = os.environ.copy()
        env.update(exports)
        env["WORKSPACE"] = str(workspace)
        env["REWARD_PATH"] = str(reward_path)
        proc = subprocess.run([sys.executable, str(check)], env=env, check=False)
        reward = reward_path.read_text(encoding="utf-8").strip() if reward_path.is_file() else "0"
        passed = reward == "1" and proc.returncode == 0

    names = [str(t.get("name")) for t in (result.get("tools") or [])]
    return {
        "task": task_dir.name,
        "passed": passed,
        "reward": 1 if passed else 0,
        "tools": names,
        "answer": (result.get("answer") or "")[:240],
        "error": result.get("error"),
    }


def main() -> None:
    tasks = sorted(
        p for p in DATASET.iterdir() if p.is_dir() and (p / "instruction.md").is_file()
    )
    if not tasks:
        raise SystemExit(f"No tasks in {DATASET}")

    rows: list[dict[str, object]] = []
    for task in tasks:
        print(f"Running {task.name}...", flush=True)
        try:
            row = run_task(task)
        except Exception as exc:
            row = {
                "task": task.name,
                "passed": False,
                "reward": 0,
                "tools": [],
                "answer": "",
                "error": str(exc),
            }
        rows.append(row)
        print(f"  {'PASS' if row['passed'] else 'FAIL'}  tools={row['tools']}", flush=True)

    passed = sum(1 for r in rows if r["passed"])
    print(f"\n{passed}/{len(rows)} passed")
    out = ROOT / "jobs" / "local-tool-use.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print(f"Wrote {out}")
    if passed < len(rows):
        raise SystemExit(1)


if __name__ == "__main__":
    main()

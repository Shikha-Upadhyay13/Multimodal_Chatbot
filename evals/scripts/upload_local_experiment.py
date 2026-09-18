"""Push local-tool-use.json into a LangSmith dataset + experiment."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from dotenv import load_dotenv
from langsmith import Client, evaluate

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
load_dotenv(ROOT.parent / "backend" / ".env")

DATASET_NAME = "tool-use"
RESULTS = ROOT / "jobs" / "local-tool-use.json"
TASKS = ROOT / "datasets" / "tool-use"


def main() -> None:
    rows = json.loads(RESULTS.read_text(encoding="utf-8"))
    by_task = {row["task"]: row for row in rows}

    client = Client()
    existing = list(client.list_datasets(dataset_name=DATASET_NAME))
    dataset = existing[0] if existing else client.create_dataset(
        dataset_name=DATASET_NAME,
        description="Harbor tool-use tasks for the multimodal chatbot",
    )

    known = {ex.inputs.get("task") for ex in client.list_examples(dataset_id=dataset.id)}
    for task_dir in sorted(
        p for p in TASKS.iterdir() if p.is_dir() and (p / "instruction.md").is_file()
    ):
        name = task_dir.name
        if name in known:
            continue
        instruction = (task_dir / "instruction.md").read_text(encoding="utf-8").strip()
        client.create_example(
            dataset_id=dataset.id,
            inputs={"task": name, "instruction": instruction},
            outputs={"reward": 1},
        )

    def predict(inputs: dict) -> dict:
        row = by_task[inputs["task"]]
        return {
            "answer": row.get("answer") or "",
            "tools": row.get("tools") or [],
            "error": row.get("error"),
        }

    def reward_from_run(run, example) -> dict:
        row = by_task[example.inputs["task"]]
        return {"key": "reward", "score": row.get("reward") or 0}

    result = evaluate(
        predict,
        data=DATASET_NAME,
        evaluators=[reward_from_run],
        experiment_prefix="local-tool-use",
        metadata={"runner": "run_local_eval.py"},
        max_concurrency=1,
    )
    print(f"Uploaded {len(rows)} rows to LangSmith dataset {DATASET_NAME}")
    print(result)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Upload failed: {exc}", file=sys.stderr)
        raise

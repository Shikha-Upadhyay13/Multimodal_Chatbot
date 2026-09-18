# Eval notes

## Phase 6 — local tool-use (2026-09-18)

Harbor `run --env docker` is blocked (no Docker on this PC). Harbor `--env langsmith` cannot reach `localhost:3001`.

Ran the same six task folders with `evals/scripts/run_local_eval.py` against the live Express backend. Traces still go to the LangSmith project `multimodal-chatbot`.

| Task | Expected | Result | Tools used |
|---|---|---|---|
| calc-multiply | calculator + 3108 | PASS | calculator |
| current-time | get_current_time | PASS | get_current_time |
| no-tool-capital | no tools + Paris | PASS | (none) |
| create-excel-budget | create_excel_document + .xlsx | PASS | create_excel_document |
| create-pdf-or-word | create_pdf or create_word + file | PASS | create_word_document |
| edit-excel | create then edit_excel_document | PASS | create_excel_document, edit_excel_document |

**6/6 passed.**

# Tool-use Harbor tasks

Each subdirectory is one Harbor **task**. One trial does this:

1. Start a fresh sandbox from `environment/Dockerfile` (Docker or `--env langsmith`)
2. Give the agent the single prompt in `instruction.md`
3. Let the agent work (our adapter POSTs that prompt to `/api/chat`)
4. Run `tests/test.sh` → write `1` or `0` to `/logs/verifier/reward.txt`

```text
task-name/
  instruction.md          # 2. the one instruction
  task.toml               # timeouts and metadata
  environment/Dockerfile  # 1. the sandbox image
  tests/
    test.sh               # 4. pass/fail
    check.py              # reads /workspace/answer.txt + tools.json
```

| Task | Pass rule |
|---|---|
| `calc-multiply` | called `calculator`, answer contains `3108` |
| `current-time` | called `get_current_time` |
| `no-tool-capital` | no calculator/search, answer contains `Paris` |
| `create-excel-budget` | called `create_excel_document`, answer contains `/api/documents/` |
| `create-pdf-or-word` | called `create_pdf_document` or `create_word_document`, plus download link |
| `edit-excel` | called `create_excel_document` and `edit_excel_document`, plus download link |

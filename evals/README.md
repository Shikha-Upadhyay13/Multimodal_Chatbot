# Harbor + LangSmith evals

Practice evals for this chatbot. Harbor is **installed**, not built. LangSmith is the project where traces and experiment scores appear.

## Prerequisites

- Python **3.12+** (Harbor will not install on 3.11)
- LangSmith API key and project (see `.env.example`)
- Groq key (same as `backend/.env`)
- Docker Desktop **or** LangSmith sandboxes (`--env langsmith`) — this machine has no Docker, so use LangSmith sandboxes

## Setup

```powershell
cd evals
copy .env.example .env
# fill LANGSMITH_API_KEY, GROQ_API_KEY, LANGSMITH_PROJECT
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Load env vars before `harbor run` (PowerShell):

```powershell
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $k, $v = $_.Split('=', 2)
  Set-Item -Path "Env:$k" -Value $v
}
```

## Task folders

Six tasks live under [`datasets/tool-use/`](datasets/tool-use/README.md). Backend must be running on `CHATBOT_URL` (default `http://localhost:3001`).

Smoke the adapter without Harbor:

```powershell
cd evals
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH = (Get-Location).Path
python scripts\smoke_adapter.py
```

Run all six tasks on the live backend (no Docker). Traces still go to LangSmith:

```powershell
python scripts\run_local_eval.py
```

Run the suite (from `evals/`, after loading `.env`):

```powershell
$env:PYTHONPATH = (Get-Location).Path
harbor run -p datasets/tool-use --agent agents.chatbot_agent:ChatbotAgent --plugin langsmith --env langsmith
```

One task only:

```powershell
harbor run -p datasets/tool-use/calc-multiply --agent agents.chatbot_agent:ChatbotAgent --plugin langsmith --env langsmith
```

Never commit `.env` files.

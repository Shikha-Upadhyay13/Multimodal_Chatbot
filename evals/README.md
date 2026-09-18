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

## Phases

0. Keys in `backend/.env` and `evals/.env`
1. This folder + `harbor --help`
2. Official hello-world into LangSmith (`--plugin langsmith`, `--env langsmith` if no Docker)
3. Trace the Express agent (LangSmith JS SDK)
4. Adapter: `instruction.md` → `POST /api/chat` → `answer.txt` + `tools.json`
5. Tool-use task folders under `datasets/tool-use/`
6. `harbor run -p datasets/tool-use --plugin langsmith`

Never commit `.env` files.

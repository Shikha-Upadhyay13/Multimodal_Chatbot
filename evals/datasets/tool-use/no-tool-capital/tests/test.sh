#!/bin/bash
set -euo pipefail
export NO_TOOLS=1
export ANSWER_CONTAINS=Paris
python3 /tests/check.py

#!/bin/bash
set -euo pipefail
export REQUIRE_TOOLS=calculator
export ANSWER_CONTAINS=3108
python3 /tests/check.py

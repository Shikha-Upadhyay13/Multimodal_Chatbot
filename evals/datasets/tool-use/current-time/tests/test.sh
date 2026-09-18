#!/bin/bash
set -euo pipefail
export REQUIRE_TOOLS=get_current_time
python3 /tests/check.py

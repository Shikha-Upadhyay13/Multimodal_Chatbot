#!/bin/bash
set -euo pipefail
export REQUIRE_TOOLS=create_excel_document
export ANSWER_CONTAINS=/api/documents/
python3 /tests/check.py

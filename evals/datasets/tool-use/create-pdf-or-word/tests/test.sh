#!/bin/bash
set -euo pipefail
export REQUIRE_ANY_TOOL=create_pdf_document,create_word_document
export ANSWER_CONTAINS=/api/documents/
python3 /tests/check.py

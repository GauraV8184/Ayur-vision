#!/usr/bin/env bash
set -euo pipefail

python3.11 -m venv .venv
# shellcheck source=/dev/null
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
mkdir -p data/ayurveda_books data/ayurveda_texts
echo "Setup complete. Add your keys to .env then run: uvicorn main:app --reload"

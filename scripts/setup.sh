#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm install
if [[ ! -f apps/backend/.env ]]; then
  cp apps/backend/.env.example apps/backend/.env
  echo "Created apps/backend/.env from .env.example — fill in secrets."
fi
if [[ ! -f apps/frontend/.env.local ]]; then
  cp apps/frontend/.env.example apps/frontend/.env.local
  echo "Created apps/frontend/.env.local from .env.example — fill in values."
fi

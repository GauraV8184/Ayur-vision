#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run test --workspaces --if-present
pytest apps/ai-service/tests

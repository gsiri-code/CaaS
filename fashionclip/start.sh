#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d venv ]; then
  echo "venv/ not found — run:"
  echo "  cd fashionclip && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

export HF_HOME="$PWD/hf-cache"
export TRANSFORMERS_OFFLINE="${TRANSFORMERS_OFFLINE:-0}"

# shellcheck disable=SC1091
source venv/bin/activate

exec uvicorn service:app --host 127.0.0.1 --port 8001 "$@"

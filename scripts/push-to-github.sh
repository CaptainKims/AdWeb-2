#!/usr/bin/env bash
# Push this project to https://github.com/CaptainKims/AdWeb-2
# Requires: git (on macOS with Xcode: sudo xcodebuild -license)
set -euo pipefail
cd "$(dirname "$0")/.."

ORIGIN_URL="${ORIGIN_URL:-https://github.com/CaptainKims/AdWeb-2.git}"

command -v git >/dev/null || { echo "Install git or fix PATH." >&2; exit 1; }

[[ -d .git ]] || git init

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$ORIGIN_URL"
else
  git remote add origin "$ORIGIN_URL"
fi

git add -A
if ! git diff --cached --quiet 2>/dev/null; then
  git commit -m "Initial commit"
elif ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "No files to commit (everything ignored?)." >&2
  exit 1
fi

git branch -M main
git push -u origin main
echo "Done: https://github.com/CaptainKims/AdWeb-2"

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v yarn >/dev/null 2>&1; then
  echo "yarn is required. Install it with: corepack enable && corepack prepare yarn@stable --activate"
  exit 1
fi

if [ ! -f ".env" ]; then
  cp ".env.example" ".env"
  echo "Created .env from .env.example"
else
  echo ".env already exists"
fi

echo "Installing dependencies..."
yarn install --frozen-lockfile

cat <<'EOF'

Setup complete.

Next steps:
1. Edit .env and fill APPLE_TEAM_ID, APPLE_KEY_ID, and either APPLE_PRIVATE_KEY or APPLE_PRIVATE_KEY_PATH.
2. Set SETUP_AUTH_TOKEN (recommended) and NOW_PLAYING_AUTH_TOKEN (optional).
3. Keep HOST=127.0.0.1 unless you explicitly need remote access.
4. For public domain exposure set ALLOWED_HOSTS and REQUIRE_HTTPS=true (SETUP_AUTH_REQUIRED auto-enables).
5. Ensure runtime/.env exists: mkdir -p runtime && touch runtime/.env
6. Build Docker image: yarn docker:build
7. Run in Docker: docker compose up -d
8. Open http://localhost:3000/setup (or /setup?token=SETUP_AUTH_TOKEN) to generate tokens and save runtime/.env.
9. Restart after updates: docker compose up -d --force-recreate
10. Optional hardening after onboarding: SETUP_ENABLED=false
11. Open http://localhost:3000/ for endpoint list and live now-playing preview.
EOF

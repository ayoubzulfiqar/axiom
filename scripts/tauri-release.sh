#!/usr/bin/env bash
# Turnkey Tauri release for AXIOM (Linux).
# Prereqs (need root): sudo dnf install -y webkit2gtk4.1-devel libsoup3-devel gtk3-devel \
#   libappindicator-gtk3-devel librsvg2-devel openssl-devel patchelf
# Rust must be on PATH (source "$HOME/.cargo/env").
set -euo pipefail

VER="${1:-$(node -p "require('./package.json').version")}"
TAG="v${VER}"
OUT="release"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

source "$HOME/.cargo/env" 2>/dev/null || true

echo "==> frontend build"
pnpm run build

echo "==> tauri build (deb, rpm)"
node_modules/.bin/tauri build --bundles deb,rpm

echo "==> collect artifacts into ${OUT}/"
rm -rf "${OUT}"
mkdir -p "${OUT}"
find src-tauri/target/release/bundle -type f \( -name '*.AppImage' -o -name '*.deb' -o -name '*.rpm' \) -exec cp -v {} "${OUT}/" \;

echo "==> create GitHub release ${TAG}"
gh release create "${TAG}" --title "AXIOM ${TAG}" --notes-file - "${OUT}"/* <<NOTES
AXIOM ${TAG} — Agentic Orchestration Console (Linux build)

What's in this release:
- Native Tauri 2 desktop bundle (AppImage / .deb / .rpm) for x86_64 Linux.
- Bundles the AXIOM web console (OpenRouter BYOK, free-model defaults, SIM mode).

Notes:
- Bring your own OpenRouter API key (Vault dialog). Free \`:free\` models work out of the box.
- Desktop key storage uses tauri-plugin-stronghold.

Built from commit $(git rev-parse --short HEAD).
NOTES

echo "==> done. Artifacts in ${OUT}/ and GitHub release ${TAG}"

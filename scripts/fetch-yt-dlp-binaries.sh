#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_ROOT="${ROOT_DIR}/resources/bin"

YTDLP_LINUX_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux"
YTDLP_MAC_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"

ensure_dir() {
  mkdir -p "$1"
}

download() {
  local url="$1"
  local out="$2"

  echo "→ Downloading: $url"
  echo "  to: $out"

  # Download to temp file first
  local tmp="${out}.tmp"
  rm -f "$tmp"

  curl -fsSL -L "$url" -o "$tmp"

  # Basic sanity check: avoid saving HTML error pages
  if head -c 256 "$tmp" | grep -qi "<!doctype html>\|<html"; then
    echo "✗ ERROR: Downloaded HTML instead of binary for $out"
    echo "  This usually means a bad URL or a GitHub redirect/rate limit page."
    rm -f "$tmp"
    exit 1
  fi

  mv "$tmp" "$out"
  chmod +x "$out"
}

echo "== Fetch yt-dlp binaries =="
echo "Project root: $ROOT_DIR"

# Linux x64
ensure_dir "${BIN_ROOT}/linux-x64"
download "$YTDLP_LINUX_URL" "${BIN_ROOT}/linux-x64/yt-dlp"

# macOS (universal binary from yt-dlp) saved into both arch folders
ensure_dir "${BIN_ROOT}/darwin-x64"
download "$YTDLP_MAC_URL" "${BIN_ROOT}/darwin-x64/yt-dlp"

ensure_dir "${BIN_ROOT}/darwin-arm64"
# You can reuse the same macOS binary URL; yt-dlp publishes a universal macOS build.
download "$YTDLP_MAC_URL" "${BIN_ROOT}/darwin-arm64/yt-dlp"

echo
echo "== Verify =="
set +e
"${BIN_ROOT}/linux-x64/yt-dlp" --version || true
"${BIN_ROOT}/darwin-x64/yt-dlp" --version || true
"${BIN_ROOT}/darwin-arm64/yt-dlp" --version || true
set -e

echo
echo "✓ Done. yt-dlp binaries are in:"
echo "  ${BIN_ROOT}/linux-x64/yt-dlp"
echo "  ${BIN_ROOT}/darwin-x64/yt-dlp"
echo "  ${BIN_ROOT}/darwin-arm64/yt-dlp"

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/resources/bin"

mkdir -p "$OUT"

fetch_one () {
  local folder="$1" platform="$2" arch="$3"

  echo "==> Fetching ffmpeg/ffprobe for $platform/$arch -> $folder"

  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  pushd "$tmp" >/dev/null
  npm init -y >/dev/null

  # Tell npm to resolve packages as if it were on the target platform/arch
  export npm_config_platform="$platform"
  export npm_config_arch="$arch"

  npm i --silent ffmpeg-static ffprobe-static

  # ffmpeg-static exports a string path
  local ffmpeg_path
  ffmpeg_path="$(node -p "require('ffmpeg-static')")"

  # ffprobe-static exports an object with .path
  local ffprobe_path
  ffprobe_path="$(node -p "require('ffprobe-static').path")"

  mkdir -p "$OUT/$folder"
  cp "$ffmpeg_path" "$OUT/$folder/ffmpeg"
  cp "$ffprobe_path" "$OUT/$folder/ffprobe"

  chmod +x "$OUT/$folder/ffmpeg" "$OUT/$folder/ffprobe"

  echo "   ✅ Copied:"
  echo "      $OUT/$folder/ffmpeg"
  echo "      $OUT/$folder/ffprobe"
  popd >/dev/null
}

# Targets you want to bundle
fetch_one "linux-x64"   "linux"  "x64"
fetch_one "darwin-x64"  "darwin" "x64"
fetch_one "darwin-arm64" "darwin" "arm64"

echo
echo "All done. Verify:"
echo "  $OUT/linux-x64/ffmpeg -version"
echo "  $OUT/linux-x64/ffprobe -version"

import path from "node:path";
import { app } from "electron";

function platformFolder() {
  if (process.platform === "darwin") {
    return process.arch === "arm64" ? "darwin-arm64" : "darwin-x64";
  }
  // linux
  return "linux-x64";
}

function devBinRoot() {
  return path.join(process.cwd(), "resources", "bin", platformFolder());
}

function packagedBinRoot() {
  return path.join(process.resourcesPath, "bin", platformFolder());
}

export function ytDlpPath() {
  const root = app.isPackaged ? packagedBinRoot() : devBinRoot();
  return path.join(root, "yt-dlp");
}

export function ffmpegPath() {
  const root = app.isPackaged ? packagedBinRoot() : devBinRoot();
  return path.join(root, "ffmpeg");
}

export function ffprobePath() {
  const root = app.isPackaged ? packagedBinRoot() : devBinRoot();
  return path.join(root, "ffprobe");
}

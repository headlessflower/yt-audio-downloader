import fs from "node:fs";
import path from "node:path";

import ff from "ffmpeg-ffprobe-static";

const root = process.cwd();

const targets = [
  { folder: "linux-x64", platform: "linux", arch: "x64" },
  { folder: "darwin-x64", platform: "darwin", arch: "x64" },
  { folder: "darwin-arm64", platform: "darwin", arch: "arm64" },
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copy(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  fs.chmodSync(dest, 0o755);
  console.log(`✅ ${dest} <= ${src}`);
}

for (const t of targets) {
  const ffmpegPath = ff.ffmpegPath({ platform: t.platform, arch: t.arch });
  const ffprobePath = ff.ffprobePath({ platform: t.platform, arch: t.arch });

  const outDir = path.join(root, "resources", "bin", t.folder);

  copy(ffmpegPath, path.join(outDir, "ffmpeg"));
  copy(ffprobePath, path.join(outDir, "ffprobe"));
}

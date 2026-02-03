import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { ytDlpPath, ffmpegPath } from "./ytPaths";
import type {
  DownloadItem,
  DownloadOptions,
  QueueState,
} from "../renderer/types";

type UpdateFn = (state: QueueState) => void;

export class DownloadQueue {
  private items: DownloadItem[] = [];
  private activeId: string | null = null;
  private proc: ReturnType<typeof spawn> | null = null;
  private notify: UpdateFn;

  constructor(notify: UpdateFn) {
    this.notify = notify;
  }

  getState(): QueueState {
    return { items: this.items, activeId: this.activeId };
  }

  private pushState() {
    this.notify(this.getState());
  }

  async add(url: string, options: DownloadOptions): Promise<DownloadItem> {
    const item: DownloadItem = {
      id: randomUUID(),
      url,
      title: "",
      status: "pending",
      progress: { percent: 0 },
      outputPath: options.outputDir,
      error: "",
      createdAt: new Date().toISOString(),
      startedAt: "",
      finishedAt: "",
      options,
    };

    this.items.push(item);
    this.pushState();

    if (!this.activeId) this.startNext();
    return item;
  }

  cancel(id: string) {
    if (this.activeId === id) {
      this.proc?.kill("SIGTERM");
    }
  }

  retry(id: string) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;
    item.status = "pending";
    item.error = "";
    this.pushState();
    if (!this.activeId) this.startNext();
  }

  private startNext() {
    const item = this.items.find((i) => i.status === "pending");
    if (!item) return;

    this.activeId = item.id;
    item.status = "downloading";
    item.startedAt = new Date().toISOString();
    this.pushState();

    const args: string[] = [
      urlNormalize(item.url),
      "-x",
      "--audio-format",
      item.options.audioFormat,
      "--audio-quality",
      "0",
      "--ffmpeg-location",
      ffmpegPath(),
      "-o",
      "%(title)s.%(ext)s",
      "--paths",
      item.options.outputDir,
      "--progress",
      "--newline",
    ];

    if (item.options.embedMetadata) args.push("--embed-metadata");
    if (item.options.embedThumbnail) args.push("--embed-thumbnail");
    if (!item.options.allowPlaylists) args.push("--no-playlist");

    // ⭐️ NEW: capture exact final filepath
    args.push("--print", "after_move:%(filepath)s");

    this.proc = spawn(ytDlpPath(), args, { stdio: ["ignore", "pipe", "pipe"] });
    const proc = this.proc;

    let stdoutBuf = "";
    let stderrBuf = "";

    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");

    proc.stdout.on("data", (chunk: string) => {
      stdoutBuf += chunk;
      const lines = stdoutBuf.split("\n");
      stdoutBuf = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();

        // ⭐️ NEW: yt-dlp prints full filepath here
        if (
          trimmed &&
          (trimmed.startsWith("/") || /^[A-Za-z]:\\/.test(trimmed))
        ) {
          item.outputPath = trimmed;
          this.pushState();
          continue;
        }

        // progress parsing (existing logic)
        const m = trimmed.match(/(\d+(?:\.\d+)?)%/);
        if (m) {
          item.progress.percent = Number(m[1]);
          this.pushState();
        }

        // keep your after_move filepath capture first (as you already added)

        // Parse yt-dlp download progress lines
        // Example: "[download]  12.3% of 42.00MiB at 1.23MiB/s ETA 00:31"
        if (trimmed.startsWith("[download]")) {
          const percentMatch = trimmed.match(/(\d+(?:\.\d+)?)%/);
          const totalMatch = trimmed.match(/of\s+([^\s]+)\s+at/i);
          const speedMatch = trimmed.match(/at\s+([^\s]+)\s+ETA/i);
          const etaMatch = trimmed.match(/ETA\s+([0-9:]+)/i);

          if (percentMatch) item.progress.percent = Number(percentMatch[1]);
          if (totalMatch) item.progress.total = totalMatch[1];
          if (speedMatch) item.progress.speed = speedMatch[1];
          if (etaMatch) item.progress.eta = etaMatch[1];

          this.pushState();
          continue;
        }
      }
    });

    proc.stderr.on("data", (chunk: string) => {
      stderrBuf += chunk;
    });

    proc.on("close", (code) => {
      this.proc = null;
      this.activeId = null;

      if (code === 0) {
        item.status = "completed";
      } else if (item.status !== "canceled") {
        item.status = "failed";
        item.error = stderrBuf.trim();
      }

      item.finishedAt = new Date().toISOString();
      this.pushState();
      this.startNext();
    });
  }
}

function urlNormalize(url: string) {
  return url.trim();
}

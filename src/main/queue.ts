import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { ytDlpPath, ffmpegPath } from "./ytPaths";
import type {
  DownloadItem,
  DownloadOptions,
  QueueState,
} from "../renderer/types";

import { QUEUE_LIMITS, type PlanTier } from "./queueLimits";

type UpdateFn = (state: QueueState) => void;

export class DownloadQueue {
  private items: DownloadItem[] = [];
  private activeId: string | null = null;
  private proc: ReturnType<typeof spawn> | null = null;
  private notify: UpdateFn;

  // NEW: plan tier (default free)
  private plan: PlanTier;

  constructor(notify: UpdateFn, plan: PlanTier = "free") {
    this.notify = notify;
    this.plan = plan;
  }

  // Optional: update plan at runtime (after license check, login, etc.)
  setPlan(plan: PlanTier) {
    this.plan = plan;
    this.pushState();
  }

  getState(): QueueState {
    return { items: this.items, activeId: this.activeId };
  }

  private pushState() {
    this.notify(this.getState());
  }

  // NEW: what counts toward the queue limit
  private queuedCount(): number {
    return this.items.filter(
      (i) => i.status === "pending" || i.status === "downloading",
    ).length;
  }

  private queueLimit(): number {
    return QUEUE_LIMITS[this.plan];
  }

  private assertCanAdd() {
    const limit = this.queueLimit();
    if (Number.isFinite(limit) && this.queuedCount() >= limit) {
      throw new Error(
        `Queue limit reached (${limit}). Upgrade to add more downloads.`,
      );
    }
  }

  async add(url: string, options: DownloadOptions): Promise<DownloadItem> {
    // NEW: enforce limit BEFORE adding
    this.assertCanAdd();

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
    const item = this.items.find((i) => i.id === id);
    if (!item) return;

    // Mark canceled so the close handler doesn't mark it failed
    item.status = "canceled";
    item.finishedAt = new Date().toISOString();
    this.pushState();

    if (this.activeId === id) {
      this.proc?.kill("SIGTERM");
    }
  }

  retry(id: string) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;

    // NEW: enforce limit when retrying too (since it re-enters the queue)
    // But don't block retrying the currently queued item if it is already counted.
    // Easiest behavior: only enforce if it's currently NOT queued.
    const isCurrentlyQueued =
      item.status === "pending" || item.status === "downloading";

    if (!isCurrentlyQueued) {
      this.assertCanAdd();
    }

    item.status = "pending";
    item.error = "";
    item.startedAt = "";
    item.finishedAt = "";
    item.progress = { percent: 0 };
    this.pushState();

    if (!this.activeId) this.startNext();
  }

  remove(id: string) {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return;

    const item = this.items[idx];

    // If removing the active download, cancel the process first.
    if (this.activeId === id) {
      item.status = "canceled";
      item.finishedAt = new Date().toISOString();
      this.pushState();

      this.proc?.kill("SIGTERM");

      // Remove immediately from list (UI feels snappy)
      this.items.splice(idx, 1);
      this.pushState();
      return;
    }

    // Otherwise just remove it
    this.items.splice(idx, 1);
    this.pushState();
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

    // capture exact final filepath
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

        // yt-dlp prints full filepath here
        if (
          trimmed &&
          (trimmed.startsWith("/") || /^[A-Za-z]:\\/.test(trimmed))
        ) {
          item.outputPath = trimmed;
          this.pushState();
          continue;
        }

        // Parse yt-dlp download progress lines
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

        // fallback percent parsing
        const m = trimmed.match(/(\d+(?:\.\d+)?)%/);
        if (m) {
          item.progress.percent = Number(m[1]);
          this.pushState();
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
